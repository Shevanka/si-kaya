const expenseForm = document.getElementById("expenseForm");
const dateInput = document.getElementById("date");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const noteInput = document.getElementById("note");
const expenseList = document.getElementById("expenseList");
const todayTotal = document.getElementById("todayTotal");
const connectionStatus = document.getElementById("connectionStatus");
const clearTodayButton = document.getElementById("clearTodayButton");

const reportMonthInput = document.getElementById("reportMonth");
const monthlyTotal = document.getElementById("monthlyTotal");
const monthlyCount = document.getElementById("monthlyCount");
const categorySummary = document.getElementById("categorySummary");
const dailyTrend = document.getElementById("dailyTrend");
const exportCsvButton = document.getElementById("exportCsvButton");

function generateId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `expense-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const date = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${date}`;
}

function getCurrentMonthString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function updateConnectionStatus() {
  if (navigator.onLine) {
    connectionStatus.textContent = "Online";
    connectionStatus.classList.remove("offline");
    connectionStatus.classList.add("online");
  } else {
    connectionStatus.textContent = "Offline";
    connectionStatus.classList.remove("online");
    connectionStatus.classList.add("offline");
  }
}

async function renderTodayExpenses() {
  const today = getTodayDateString();
  const expenses = await getExpensesByDate(today);

  const sortedExpenses = expenses.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const total = sortedExpenses.reduce((sum, expense) => {
    return sum + Number(expense.amount);
  }, 0);

  todayTotal.textContent = formatRupiah(total);

  if (sortedExpenses.length === 0) {
    expenseList.innerHTML = `
      <p class="empty-state">Belum ada transaksi hari ini.</p>
    `;
    return;
  }

  expenseList.innerHTML = sortedExpenses
    .map((expense) => {
      const syncedText = expense.synced ? "Tersinkron" : "Belum sinkron";

      return `
        <article class="expense-item">
          <div class="expense-main">
            <div class="expense-category">${escapeHtml(expense.category)}</div>
            <p class="expense-note">${escapeHtml(expense.note || "Tanpa catatan")}</p>
            <div class="expense-meta">
              ${syncedText}
            </div>
          </div>

          <div class="expense-amount">
            ${formatRupiah(expense.amount)}
          </div>
        </article>
      `;
    })
    .join("");
}

function groupExpensesByCategory(expenses) {
  const summary = {};

  expenses.forEach((expense) => {
    const category = expense.category;

    if (!summary[category]) {
      summary[category] = {
        category,
        total: 0,
        count: 0
      };
    }

    summary[category].total += Number(expense.amount);
    summary[category].count += 1;
  });

  return Object.values(summary).sort((a, b) => b.total - a.total);
}

function groupExpensesByDate(expenses) {
  const summary = {};

  expenses.forEach((expense) => {
    const date = expense.date;

    if (!summary[date]) {
      summary[date] = {
        date,
        total: 0,
        count: 0
      };
    }

    summary[date].total += Number(expense.amount);
    summary[date].count += 1;
  });

  return Object.values(summary).sort((a, b) => {
    return a.date.localeCompare(b.date);
  });
}

function renderCategorySummary(expenses) {
  const categories = groupExpensesByCategory(expenses);

  if (categories.length === 0) {
    categorySummary.innerHTML = `
      <p class="empty-state">Belum ada data bulan ini.</p>
    `;
    return;
  }

  const maxTotal = Math.max(...categories.map((item) => item.total));

  categorySummary.innerHTML = categories
    .map((item) => {
      const percentage = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;

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
      `;
    })
    .join("");
}

function renderDailyTrend(expenses) {
  const dailyData = groupExpensesByDate(expenses);

  if (dailyData.length === 0) {
    dailyTrend.innerHTML = `
      <p class="empty-state">Belum ada data bulan ini.</p>
    `;
    return;
  }

  const maxTotal = Math.max(...dailyData.map((item) => item.total));

  dailyTrend.innerHTML = dailyData
    .map((item) => {
      const percentage = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
      const day = item.date.split("-")[2];

      return `
        <div class="trend-row">
          <span class="trend-day">${day}</span>

          <div class="trend-bar-bg">
            <div class="trend-bar-fill" style="width: ${percentage}%"></div>
          </div>

          <strong>${formatRupiah(item.total)}</strong>
        </div>
      `;
    })
    .join("");
}

async function renderMonthlyReport() {
  const selectedMonth = reportMonthInput.value || getCurrentMonthString();
  const expenses = await getExpensesByMonth(selectedMonth);

  const total = expenses.reduce((sum, expense) => {
    return sum + Number(expense.amount);
  }, 0);

  monthlyTotal.textContent = formatRupiah(total);
  monthlyCount.textContent = expenses.length;

  renderCategorySummary(expenses);
  renderDailyTrend(expenses);
}

async function handleExpenseSubmit(event) {
  event.preventDefault();

  const amount = Number(amountInput.value);

  if (!amount || amount <= 0) {
    alert("Nominal harus lebih dari 0.");
    return;
  }

  const now = new Date().toISOString();

  const expense = {
    id: generateId(),
    date: dateInput.value,
    category: categoryInput.value,
    amount: amount,
    note: noteInput.value.trim(),
    created_at: now,
    updated_at: now,
    synced: false,
    deleted: false
  };

  await addExpense(expense);

  expenseForm.reset();
  dateInput.value = getTodayDateString();

  await renderTodayExpenses();
  await renderMonthlyReport();

  await syncExpenses();
  await renderTodayExpenses();
}

async function handleClearToday() {
  const today = getTodayDateString();

  const confirmed = confirm("Hapus semua transaksi hari ini?");

  if (!confirmed) {
    return;
  }

  await clearExpensesByDate(today);
  await renderTodayExpenses();
  await renderMonthlyReport();

  await syncExpenses();
  await renderTodayExpenses();
  await renderMonthlyReport();
}

async function handleExportCsv() {
  const selectedMonth = reportMonthInput.value || getCurrentMonthString();
  const expenses = await getExpensesByMonth(selectedMonth);

  if (expenses.length === 0) {
    alert("Belum ada data untuk diexport.");
    return;
  }

  const header = [
    "id",
    "date",
    "category",
    "amount",
    "note",
    "created_at",
    "updated_at",
    "synced"
  ];

  const rows = expenses.map((expense) => {
    return [
      expense.id,
      expense.date,
      expense.category,
      expense.amount,
      expense.note,
      expense.created_at,
      expense.updated_at,
      expense.synced
    ];
  });

  const csvContent = [
    header.join(","),
    ...rows.map((row) => {
      return row.map(escapeCsvValue).join(",");
    })
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `dompet-harian-${selectedMonth}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  const escapedValue = stringValue.replaceAll('"', '""');

  return `"${escapedValue}"`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    console.log("Browser belum mendukung service worker.");
    return;
  }

  try {
    await navigator.serviceWorker.register("./service-worker.js");
    console.log("Service worker berhasil didaftarkan.");
  } catch (error) {
    console.error("Service worker gagal didaftarkan:", error);
  }
}

function initApp() {
  dateInput.value = getTodayDateString();
  reportMonthInput.value = getCurrentMonthString();

  updateConnectionStatus();
  renderTodayExpenses();
  renderMonthlyReport();
  registerServiceWorker();
  scheduleSync();

  expenseForm.addEventListener("submit", handleExpenseSubmit);
  clearTodayButton.addEventListener("click", handleClearToday);
  reportMonthInput.addEventListener("change", renderMonthlyReport);
  exportCsvButton.addEventListener("click", handleExportCsv);

  window.addEventListener("online", async () => {
    updateConnectionStatus();
    await syncExpenses();
    await renderTodayExpenses();
    await renderMonthlyReport();
  });

  window.addEventListener("offline", () => {
    updateConnectionStatus();
    setSyncStatus("Offline", "idle");
  });
}

initApp();