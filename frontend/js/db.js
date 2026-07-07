const DB_NAME = "dompet_harian_db";
const DB_VERSION = 1;
const STORE_NAME = "expenses";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject("Gagal membuka IndexedDB");
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id"
        });

        store.createIndex("date", "date", { unique: false });
        store.createIndex("synced", "synced", { unique: false });
        store.createIndex("created_at", "created_at", { unique: false });
      }
    };
  });
}

async function addExpense(expense) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.add(expense);

    request.onsuccess = () => {
      resolve(expense);
    };

    request.onerror = () => {
      reject("Gagal menyimpan transaksi");
    };
  });
}

async function getAllExpenses() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject("Gagal mengambil data transaksi");
    };
  });
}

async function getExpensesByDate(date) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("date");

    const request = index.getAll(date);

    request.onsuccess = () => {
      const activeExpenses = request.result.filter((expense) => !expense.deleted);
      resolve(activeExpenses);
    };

    request.onerror = () => {
      reject("Gagal mengambil transaksi berdasarkan tanggal");
    };
  });
}

async function updateExpense(expense) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.put(expense);

    request.onsuccess = () => {
      resolve(expense);
    };

    request.onerror = () => {
      reject("Gagal mengubah transaksi");
    };
  });
}

async function deleteExpense(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const expense = getRequest.result;

      if (!expense) {
        reject("Transaksi tidak ditemukan");
        return;
      }

      expense.deleted = true;
      expense.synced = false;
      expense.updated_at = new Date().toISOString();

      const updateRequest = store.put(expense);

      updateRequest.onsuccess = () => {
        resolve(expense);
      };

      updateRequest.onerror = () => {
        reject("Gagal menghapus transaksi");
      };
    };

    getRequest.onerror = () => {
      reject("Gagal mengambil transaksi");
    };
  });
}

async function clearExpensesByDate(date) {
  const expenses = await getExpensesByDate(date);

  for (const expense of expenses) {
    await deleteExpense(expense.id);
  }

  return true;
}

async function getExpensesByMonth(yearMonth) {
  const allExpenses = await getAllExpenses();

  return allExpenses.filter((expense) => {
    return !expense.deleted && expense.date.startsWith(yearMonth);
  });
} 

async function getUnsyncedExpenses() {
  const allExpenses = await getAllExpenses();

  return allExpenses.filter((expense) => {
    return expense.synced === false;
  });
}

async function markExpensesAsSynced(ids) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    let processed = 0;

    if (ids.length === 0) {
      resolve(true);
      return;
    }

    ids.forEach((id) => {
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const expense = getRequest.result;

        if (expense) {
          expense.synced = true;
          expense.updated_at = expense.updated_at || new Date().toISOString();

          const updateRequest = store.put(expense);

          updateRequest.onsuccess = () => {
            processed += 1;

            if (processed === ids.length) {
              resolve(true);
            }
          };

          updateRequest.onerror = () => {
            reject("Gagal update status sync transaksi");
          };
        } else {
          processed += 1;

          if (processed === ids.length) {
            resolve(true);
          }
        }
      };

      getRequest.onerror = () => {
        reject("Gagal mengambil transaksi untuk sync");
      };
    });
  });
}

async function getExpenseById(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);

    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject("Gagal mengambil detail transaksi");
    };
  });
}

async function updateExpenseById(id, updatedData) {
  const existingExpense = await getExpenseById(id);

  if (!existingExpense) {
    throw new Error("Transaksi tidak ditemukan");
  }

  const updatedExpense = {
    ...existingExpense,
    ...updatedData,
    synced: false,
    updated_at: new Date().toISOString()
  };

  return updateExpense(updatedExpense);
}