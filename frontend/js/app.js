const expenseForm = document.getElementById("expenseForm");
const dateInput = document.getElementById("date");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const noteInput = document.getElementById("note");
const expenseList = document.getElementById("expenseList");
const todayTotal = document.getElementById("todayTotal");
const connectionStatus = document.getElementById("connectionStatus");
const clearTodayButton = document.getElementById("clearTodayButton");

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
            <div class="expense-category">${expense.category}</div>
            <p class="expense-note">${expense.note || "Tanpa catatan"}</p>
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
}

async function handleClearToday() {
  const today = getTodayDateString();

  const confirmed = confirm("Hapus semua transaksi hari ini?");

  if (!confirmed) {
    return;
  }

  await clearExpensesByDate(today);
  await renderTodayExpenses();
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

  updateConnectionStatus();
  renderTodayExpenses();
  registerServiceWorker();

  expenseForm.addEventListener("submit", handleExpenseSubmit);
  clearTodayButton.addEventListener("click", handleClearToday);

  window.addEventListener("online", updateConnectionStatus);
  window.addEventListener("offline", updateConnectionStatus);
}

initApp();