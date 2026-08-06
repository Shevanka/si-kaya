let isCategoryManuallySelected = false

const keywordForm = document.getElementById('keywordForm')
const keywordInput = document.getElementById('keywordInput')
const keywordCategoryInput = document.getElementById('keywordCategoryInput')
const keywordList = document.getElementById('keywordList')
const categorySuggestion = document.getElementById('categorySuggestion')

const expenseForm = document.getElementById('expenseForm')
const dateInput = document.getElementById('date')
const amountInput = document.getElementById('amount')
const categoryInput = document.getElementById('category')
const noteInput = document.getElementById('note')
const expenseList = document.getElementById('expenseList')
const todayTotal = document.getElementById('todayTotal')
const connectionStatus = document.getElementById('connectionStatus')
const clearTodayButton = document.getElementById('clearTodayButton')

const editingExpenseIdInput = document.getElementById('editingExpenseId')
const submitButton = document.getElementById('submitButton')
const cancelEditButton = document.getElementById('cancelEditButton')

const reportMonthInput = document.getElementById('reportMonth')
const monthlyTotal = document.getElementById('monthlyTotal')
const monthlyCount = document.getElementById('monthlyCount')
const categorySummary = document.getElementById('categorySummary')
const dailyTrend = document.getElementById('dailyTrend')
const exportCsvButton = document.getElementById('exportCsvButton')
const monthlyExpenseList = document.getElementById('monthlyExpenseList')

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function getTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const date = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${date}`
}

function getCurrentMonthString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function updateConnectionStatus() {
  const connElem = document.getElementById('connectionStatus')

  if (!connElem) {
    return
  }

  if (navigator.onLine) {
    connElem.textContent = 'Online'
    connElem.classList.remove('offline')
    connElem.classList.add('online')
  } else {
    connElem.textContent = 'Offline'
    connElem.classList.remove('online')
    connElem.classList.add('offline')
    if (typeof setSyncStatus === 'function') {
      setSyncStatus('Offline', 'idle')
    }
  }
}

function renderMonthlyExpenseList(expenses) {
  if (!monthlyExpenseList) {
    return
  }

  if (expenses.length === 0) {
    monthlyExpenseList.innerHTML = `
      <p class="empty-state">Belum ada transaksi bulan ini.</p>
    `
    return
  }

  const sortedExpenses = [...expenses].sort((a, b) => {
    return new Date(b.date) - new Date(a.date) || new Date(b.created_at) - new Date(a.created_at)
  })

  monthlyExpenseList.innerHTML = sortedExpenses.map(renderExpenseCard).join('')
}

function renderExpenseCard(expense) {
  const syncedText = expense.synced ? 'Tersinkron' : 'Belum sinkron'

  return `
    <article class="expense-item">
      <div class="expense-main">
        <div class="expense-category">${escapeHtml(expense.category)}</div>

        <p class="expense-note">
          ${escapeHtml(expense.note || 'Tanpa catatan')}
        </p>

        <div class="expense-meta">
          ${escapeHtml(expense.date)} · ${syncedText}
        </div>

        <div class="expense-actions">
          <button class="action-button edit-button" data-action="edit" data-id="${expense.id}">
            Edit
          </button>

          <button class="action-button delete-button" data-action="delete" data-id="${expense.id}">
            Hapus
          </button>
        </div>
      </div>

      <div class="expense-amount">
        ${formatRupiah(expense.amount)}
      </div>
    </article>
  `
}

async function renderTodayExpenses() {
  const today = getTodayDateString()
  const expenses = await getExpensesByDate(today)

  const sortedExpenses = expenses.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const total = sortedExpenses.reduce((sum, expense) => {
    return sum + Number(expense.amount)
  }, 0)

  todayTotal.textContent = formatRupiah(total)

  if (sortedExpenses.length === 0) {
    expenseList.innerHTML = `
      <p class="empty-state">Belum ada transaksi hari ini.</p>
    `
    return
  }

  expenseList.innerHTML = sortedExpenses.map(renderExpenseCard).join('')
}

function groupExpensesByCategory(expenses) {
  const summary = {}

  expenses.forEach((expense) => {
    const category = expense.category

    if (!summary[category]) {
      summary[category] = {
        category,
        total: 0,
        count: 0,
      }
    }

    summary[category].total += Number(expense.amount)
    summary[category].count += 1
  })

  return Object.values(summary).sort((a, b) => b.total - a.total)
}

function groupExpensesByDate(expenses) {
  const summary = {}

  expenses.forEach((expense) => {
    const date = expense.date

    if (!summary[date]) {
      summary[date] = {
        date,
        total: 0,
        count: 0,
      }
    }

    summary[date].total += Number(expense.amount)
    summary[date].count += 1
  })

  return Object.values(summary).sort((a, b) => {
    return a.date.localeCompare(b.date)
  })
}

function renderCategorySummary(expenses) {
  const categories = groupExpensesByCategory(expenses)

  if (categories.length === 0) {
    categorySummary.innerHTML = `
      <p class="empty-state">Belum ada data bulan ini.</p>
    `
    return
  }

  const maxTotal = Math.max(...categories.map((item) => item.total))

  categorySummary.innerHTML = categories
    .map((item) => {
      const percentage = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0

      return `
        <div class="category-row">
          <div class="category-row-header">
            <span>${escapeHtml(item.category)}</span>
            <strong>${formatRupiah(item.total)}</strong>
          </div>

          <div class="bar-bg">
            <div class="bar-fill" style="width: ${percentage}%"></div>
          </div>

          <small>${item.count} transaksi</small>
        </div>
      `
    })
    .join('')
}

function renderDailyTrend(expenses) {
  const dailyData = groupExpensesByDate(expenses)

  if (dailyData.length === 0) {
    dailyTrend.innerHTML = `
      <p class="empty-state">Belum ada data bulan ini.</p>
    `
    return
  }

  const maxTotal = Math.max(...dailyData.map((item) => item.total))

  dailyTrend.innerHTML = dailyData
    .map((item) => {
      const percentage = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0
      const day = item.date.split('-')[2]

      return `
        <div class="trend-row">
          <span class="trend-day">${day}</span>

          <div class="trend-bar-bg">
            <div class="trend-bar-fill" style="width: ${percentage}%"></div>
          </div>

          <strong>${formatRupiah(item.total)}</strong>
        </div>
      `
    })
    .join('')
}

async function renderMonthlyReport() {
  if (!monthlyTotal || !monthlyCount || !categorySummary || !dailyTrend) {
    return
  }
  const selectedMonth = reportMonthInput.value || getCurrentMonthString()
  const expenses = await getExpensesByMonth(selectedMonth)

  const total = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount)
  }, 0)

  monthlyTotal.textContent = formatRupiah(total)
  monthlyCount.textContent = expenses.length

  renderCategorySummary(expenses)
  renderDailyTrend(expenses)
  renderMonthlyExpenseList(expenses)
}

async function handleExpenseSubmit(event) {
  event.preventDefault()

  const amount = Number(amountInput.value)

  if (!amount || amount <= 0) {
    alert('Nominal harus lebih dari 0.')
    return
  }

  const note = noteInput.value.trim()
  const detectedCategory = detectCategoryFromText(note)
  const finalCategory = categoryInput.value || detectedCategory || 'Lainnya'

  const expenseData = {
    date: dateInput.value,
    category: finalCategory,
    amount: amount,
    note: note,
  }

  if (isEditingMode()) {
    const editingId = editingExpenseIdInput.value

    await updateExpenseById(editingId, expenseData)
    exitEditMode()
  } else {
    const now = new Date().toISOString()

    const expense = {
      id: generateId(),
      date: expenseData.date,
      category: expenseData.category,
      amount: expenseData.amount,
      note: expenseData.note,
      created_at: now,
      updated_at: now,
      synced: false,
      deleted: false,
    }

    await addExpense(expense)

    expenseForm.reset()
    dateInput.value = getTodayDateString()
    categoryInput.value = ''
    isCategoryManuallySelected = false
    categorySuggestion.textContent = 'Tulis catatan untuk deteksi kategori otomatis.'
  }

  await renderTodayExpenses()
  await renderMonthlyReport()
  await renderBudgetStatus()

  await syncExpenses()

  await renderTodayExpenses()
  await renderMonthlyReport()
  await renderBudgetStatus()
}

async function handleExpenseActionClick(event) {
  const button = event.target.closest('button[data-action]')

  if (!button) {
    return
  }

  const action = button.dataset.action
  const id = button.dataset.id

  if (action === 'edit') {
    await handleEditExpense(id)
  }

  if (action === 'delete') {
    await handleDeleteExpense(id)
  }
}

async function handleEditExpense(id) {
  const expense = await getExpenseById(id)

  if (!expense || expense.deleted) {
    alert('Transaksi tidak ditemukan.')
    return
  }

  enterEditMode(expense)
}

async function handleDeleteExpense(id) {
  const confirmed = confirm('Hapus transaksi ini?')

  if (!confirmed) {
    return
  }

  await deleteExpense(id)

  if (editingExpenseIdInput && editingExpenseIdInput.value === id) {
    exitEditMode()
  }

  await renderTodayExpenses()
  await renderMonthlyReport()
  await renderBudgetStatus()

  await syncExpenses()

  await renderTodayExpenses()
  await renderMonthlyReport()
  await renderBudgetStatus()
}

function handleCancelEdit() {
  exitEditMode()
}

async function handleClearToday() {
  const today = getTodayDateString()

  const confirmed = confirm('Hapus semua transaksi hari ini?')

  if (!confirmed) {
    return
  }

  await clearExpensesByDate(today)
  await renderTodayExpenses()
  await renderMonthlyReport()
  await renderBudgetStatus()

  await syncExpenses()
  await renderTodayExpenses()
  await renderMonthlyReport()
  await renderBudgetStatus()
}

async function handleExportCsv() {
  const selectedMonth = reportMonthInput.value || getCurrentMonthString()
  const expenses = await getExpensesByMonth(selectedMonth)

  if (expenses.length === 0) {
    alert('Belum ada data untuk diexport.')
    return
  }

  const header = ['id', 'date', 'category', 'amount', 'note', 'created_at', 'updated_at', 'synced']

  const rows = expenses.map((expense) => {
    return [
      expense.id,
      expense.date,
      expense.category,
      expense.amount,
      expense.note,
      expense.created_at,
      expense.updated_at,
      expense.synced,
    ]
  })

  const csvContent = [
    header.join(','),
    ...rows.map((row) => {
      return row.map(escapeCsvValue).join(',')
    }),
  ].join('\n')

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `dompet-harian-${selectedMonth}.csv`
  link.click()

  URL.revokeObjectURL(url)
}



function escapeCsvValue(value) {
  const stringValue = String(value ?? '')
  const escapedValue = stringValue.replaceAll('"', '""')

  return `"${escapedValue}"`
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function registerServiceWorker() {
  console.log('Attempting SW registration')

  if (!('serviceWorker' in navigator)) {
    console.log('SW not supported')
    return
  }

  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js')

    console.log('SW Registered', registration)
  } catch (error) {
    console.error('SW Registration Failed', error)
  }
}

function isEditingMode() {
  return Boolean(editingExpenseIdInput.value)
}

function enterEditMode(expense) {
  if (!editingExpenseIdInput) {
    window.location.href = `index.html?edit=${expense.id}`
    return
  }

  editingExpenseIdInput.value = expense.id
  if (dateInput) dateInput.value = expense.date
  if (amountInput) amountInput.value = expense.amount
  if (categoryInput) categoryInput.value = expense.category
  if (noteInput) noteInput.value = expense.note || ''

  isCategoryManuallySelected = true

  if (submitButton) submitButton.textContent = 'Update Pengeluaran'
  if (cancelEditButton) cancelEditButton.classList.remove('hidden')

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

function exitEditMode() {
  if (!editingExpenseIdInput) {
    return
  }

  editingExpenseIdInput.value = ''
  if (expenseForm) expenseForm.reset()
  if (dateInput) dateInput.value = getTodayDateString()

  if (submitButton) submitButton.textContent = 'Simpan Pengeluaran'
  if (cancelEditButton) cancelEditButton.classList.add('hidden')
}

const CATEGORY_RULES_STORAGE_KEY = 'dompet_harian_category_rules'

const DEFAULT_CATEGORY_RULES = [
  {
    keyword: 'nasi',
    category: 'Makan',
  },
  {
    keyword: 'ayam',
    category: 'Makan',
  },
  {
    keyword: 'gacoan',
    category: 'Makan',
  },
  {
    keyword: 'kopi',
    category: 'Makan',
  },
  {
    keyword: 'gofood',
    category: 'Makan',
  },
  {
    keyword: 'grabfood',
    category: 'Makan',
  },
  {
    keyword: 'grab',
    category: 'Transport',
  },
  {
    keyword: 'gojek',
    category: 'Transport',
  },
  {
    keyword: 'bensin',
    category: 'Transport',
  },
  {
    keyword: 'parkir',
    category: 'Transport',
  },
  {
    keyword: 'listrik',
    category: 'Tagihan',
  },
  {
    keyword: 'air',
    category: 'Tagihan',
  },
  {
    keyword: 'wifi',
    category: 'Tagihan',
  },
  {
    keyword: 'pulsa',
    category: 'Tagihan',
  },
  {
    keyword: 'sabun',
    category: 'Belanja',
  },
  {
    keyword: 'shopee',
    category: 'Belanja',
  },
  {
    keyword: 'tokopedia',
    category: 'Belanja',
  },
  {
    keyword: 'bioskop',
    category: 'Hiburan',
  },
  {
    keyword: 'netflix',
    category: 'Hiburan',
  },
]

function loadCategoryRules() {
  const savedRules = localStorage.getItem(CATEGORY_RULES_STORAGE_KEY)

  if (!savedRules) {
    saveCategoryRules(DEFAULT_CATEGORY_RULES)
    return DEFAULT_CATEGORY_RULES
  }

  try {
    return JSON.parse(savedRules)
  } catch (error) {
    saveCategoryRules(DEFAULT_CATEGORY_RULES)
    return DEFAULT_CATEGORY_RULES
  }
}

function saveCategoryRules(rules) {
  localStorage.setItem(CATEGORY_RULES_STORAGE_KEY, JSON.stringify(rules))
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
}

function detectCategoryFromText(text) {
  const normalizedText = normalizeText(text)

  if (!normalizedText) {
    return null
  }

  const rules = loadCategoryRules()

  const matchedRule = rules.find((rule) => {
    const keyword = normalizeText(rule.keyword)

    if (!keyword) {
      return false
    }

    return normalizedText.includes(keyword)
  })

  if (!matchedRule) {
    return null
  }

  return matchedRule.category
}

function applyCategorySuggestion() {
  if (!noteInput || !categorySuggestion) {
    return
  }

  const note = noteInput.value.trim()
  const detectedCategory = detectCategoryFromText(note)

  if (!note) {
    categorySuggestion.textContent = 'Tulis catatan untuk deteksi kategori otomatis.'

    if (!isCategoryManuallySelected && categoryInput) {
      categoryInput.value = ''
    }

    return
  }

  if (!detectedCategory) {
    categorySuggestion.textContent = 'Kategori belum terdeteksi.'

    if (!isCategoryManuallySelected && categoryInput) {
      categoryInput.value = ''
    }

    return
  }

  categorySuggestion.textContent = `Terdeteksi: ${detectedCategory}`

  if (!isCategoryManuallySelected && categoryInput) {
    categoryInput.value = detectedCategory
  }
}

function renderKeywordList() {
  const rules = loadCategoryRules()

  if (!keywordList) {
    return
  }

  if (rules.length === 0) {
    keywordList.innerHTML = `
      <p class="empty-state">Belum ada kata kunci.</p>
    `
    return
  }

  keywordList.innerHTML = rules
    .map((rule, index) => {
      return `
        <div class="keyword-pill">
          <span>${escapeHtml(rule.keyword)}</span>
          <strong>${escapeHtml(rule.category)}</strong>
          <button
            type="button"
            class="keyword-remove-button"
            data-keyword-index="${index}"
          >
            ×
          </button>
        </div>
      `
    })
    .join('')
}

function handleKeywordSubmit(event) {
  event.preventDefault()

  const keyword = keywordInput.value.trim()
  const category = keywordCategoryInput.value

  if (!keyword || !category) {
    alert('Kata kunci dan kategori wajib diisi.')
    return
  }

  const rules = loadCategoryRules()

  const alreadyExists = rules.some((rule) => {
    return normalizeText(rule.keyword) === normalizeText(keyword)
  })

  if (alreadyExists) {
    alert('Kata kunci sudah ada.')
    return
  }

  rules.push({
    keyword,
    category,
  })

  saveCategoryRules(rules)

  keywordForm.reset()
  renderKeywordList()
  applyCategorySuggestion()
}

function handleKeywordListClick(event) {
  const button = event.target.closest('button[data-keyword-index]')

  if (!button) {
    return
  }

  const index = Number(button.dataset.keywordIndex)
  const rules = loadCategoryRules()

  rules.splice(index, 1)

  saveCategoryRules(rules)
  renderKeywordList()
  applyCategorySuggestion()
}

const budgetForm = document.getElementById('budgetForm')

const monthlyBudgetInput = document.getElementById('monthlyBudgetInput')

const budgetDisplay = document.getElementById('budgetDisplay')

const budgetUsed = document.getElementById('budgetUsed')

const budgetRemaining = document.getElementById('budgetRemaining')

const budgetStatus = document.getElementById('budgetStatus')

const reminderForm = document.getElementById('reminderForm')

const reminderEnabled = document.getElementById('reminderEnabled')

const reminderTime = document.getElementById('reminderTime')

const BUDGET_STORAGE_KEY = 'dompet_harian_budget'

const REMINDER_STORAGE_KEY = 'dompet_harian_reminder'

function saveBudget(value) {
  localStorage.setItem(BUDGET_STORAGE_KEY, String(value))
}

function loadBudget() {
  return Number(localStorage.getItem(BUDGET_STORAGE_KEY) || 0)
}

async function renderBudgetStatus() {
  if (!budgetDisplay || !budgetUsed || !budgetRemaining || !budgetStatus) {
    return
  }

  const budget = loadBudget()

  budgetDisplay.textContent = formatRupiah(budget)

  const selectedMonth = (reportMonthInput && reportMonthInput.value) || getCurrentMonthString()

  const expenses = await getExpensesByMonth(selectedMonth)

  const totalSpent = expenses.reduce((sum, item) => sum + Number(item.amount), 0)

  budgetUsed.textContent = formatRupiah(totalSpent)

  const remaining = budget - totalSpent
  budgetRemaining.textContent = formatRupiah(remaining)

  if (budget <= 0) {
    budgetStatus.textContent = 'Budget belum diatur'
  } else if (remaining < 0) {
    budgetStatus.textContent = `Over budget sebesar ${formatRupiah(Math.abs(remaining))}!`
  } else {
    budgetStatus.textContent = `Sisa budget aman (${formatRupiah(remaining)})`
  }
}

function handleBudgetSubmit(event) {
  event.preventDefault()

  if (!monthlyBudgetInput) {
    return
  }

  const amount = Number(monthlyBudgetInput.value)

  saveBudget(amount)

  renderBudgetStatus()

  alert('Budget berhasil disimpan')
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  const permission = await Notification.requestPermission()

  return permission === 'granted'
}

function saveReminder(settings) {
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings))
}

function loadReminder() {
  const saved = localStorage.getItem(REMINDER_STORAGE_KEY)

  if (!saved) {
    return {
      enabled: false,
      time: '20:00',
    }
  }

  return JSON.parse(saved)
}

async function handleReminderSubmit(event) {
  event.preventDefault()

  if (!reminderEnabled || !reminderTime) {
    return
  }

  const enabled = reminderEnabled.checked

  const time = reminderTime.value

  saveReminder({
    enabled,
    time,
  })

  if (enabled) {
    await requestNotificationPermission()
  }

  alert('Pengingat berhasil disimpan')
}

function checkReminder() {
  const settings = loadReminder()

  if (!settings.enabled) {
    return
  }

  if (Notification.permission !== 'granted') {
    return
  }

  const now = new Date()

  const currentTime = now.toTimeString().slice(0, 5)

  if (currentTime === settings.time) {
    new Notification('Dompet Harian', {
      body: 'Jangan lupa mencatat pengeluaran hari ini.',
    })
  }
}

if (budgetForm) {
  if (monthlyBudgetInput) {
    monthlyBudgetInput.value = loadBudget() || ''
  }

  renderBudgetStatus()

  budgetForm.addEventListener('submit', handleBudgetSubmit)
}

if (reminderForm) {
  const reminderSettings = loadReminder()

  if (reminderEnabled) {
    reminderEnabled.checked = reminderSettings.enabled
  }

  if (reminderTime) {
    reminderTime.value = reminderSettings.time
  }

  reminderForm.addEventListener('submit', handleReminderSubmit)
}

setInterval(checkReminder, 60000)

function initApp() {
  console.log('INIT APP')
  if (dateInput) {
    dateInput.value = getTodayDateString()
  }

  if (reportMonthInput) {
    reportMonthInput.value = getCurrentMonthString()
  }

  if (categoryInput) {
    categoryInput.value = ''
  }

  updateConnectionStatus()

  if (expenseList) {
    renderTodayExpenses()
    expenseList.addEventListener('click', handleExpenseActionClick)
  }

  if (monthlyExpenseList) {
    monthlyExpenseList.addEventListener('click', handleExpenseActionClick)
  }

  if (reportMonthInput) {
    renderMonthlyReport()
  }

  if (keywordList) {
    renderKeywordList()
  }

  if (budgetForm) {
    renderBudgetStatus()
  }

  registerServiceWorker()
  scheduleSync()

  if (expenseForm) {
    expenseForm.addEventListener('submit', handleExpenseSubmit)
  }
  if (clearTodayButton) {
    clearTodayButton.addEventListener('click', handleClearToday)
  }

  if (reportMonthInput) {
    reportMonthInput.addEventListener('change', renderMonthlyReport)
  }

  if (exportCsvButton) {
    exportCsvButton.addEventListener('click', handleExportCsv)
  }

  if (noteInput) {
    noteInput.addEventListener('input', applyCategorySuggestion)
  }

  if (keywordForm) {
    keywordForm.addEventListener('submit', handleKeywordSubmit)
  }

  if (keywordList) {
    keywordList.addEventListener('click', handleKeywordListClick)
  }

  if (cancelEditButton) {
    cancelEditButton.addEventListener('click', handleCancelEdit)
  }

  window.addEventListener('online', async () => {
    updateConnectionStatus()
    await syncExpenses()
    await renderTodayExpenses()
    await renderMonthlyReport()
  })

  window.addEventListener('offline', () => {
    updateConnectionStatus()
    setSyncStatus('Offline', 'idle')
  })

  if (categoryInput) {
    categoryInput.addEventListener('change', () => {
      isCategoryManuallySelected = Boolean(categoryInput.value)
    })
  }

  if (editingExpenseIdInput) {
    const urlParams = new URLSearchParams(window.location.search)
    const editId = urlParams.get('edit')
    if (editId) {
      getExpenseById(editId).then((expense) => {
        if (expense && !expense.deleted) {
          enterEditMode(expense)
        }
      })
    }
  }
}

initApp()
