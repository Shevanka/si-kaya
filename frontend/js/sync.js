const API_BASE_URL = "http://localhost:5000";

let isSyncing = false;

function setSyncStatus(message, type = "idle") {
  const syncStatus = document.getElementById("syncStatus");

  if (!syncStatus) {
    return;
  }

  syncStatus.textContent = message;

  syncStatus.classList.remove(
    "sync-idle",
    "sync-running",
    "sync-success",
    "sync-error"
  );

  syncStatus.classList.add(`sync-${type}`);
}

async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: "GET"
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

async function syncExpenses() {
  if (isSyncing) {
    return {
      skipped: true,
      reason: "Sync sedang berjalan"
    };
  }

  if (!navigator.onLine) {
    setSyncStatus("Offline", "idle");

    return {
      skipped: true,
      reason: "Browser offline"
    };
  }

  isSyncing = true;
  setSyncStatus("Syncing...", "running");

  try {
    const backendReady = await checkBackendHealth();

    if (!backendReady) {
      setSyncStatus("Backend off", "error");

      return {
        success: false,
        error: "Backend tidak tersedia"
      };
    }

    const unsyncedExpenses = await getUnsyncedExpenses();

    if (unsyncedExpenses.length === 0) {
      setSyncStatus("Semua synced", "success");

      return {
        success: true,
        syncedCount: 0
      };
    }

    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        expenses: unsyncedExpenses
      })
    });

    if (!response.ok) {
      throw new Error(`Sync gagal. Status: ${response.status}`);
    }

    const result = await response.json();

    if (!Array.isArray(result.synced_ids)) {
      throw new Error("Response backend tidak valid");
    }

    await markExpensesAsSynced(result.synced_ids);

    setSyncStatus(`${result.synced_ids.length} synced`, "success");

    return {
      success: true,
      syncedCount: result.synced_ids.length,
      failedItems: result.failed_items || []
    };
  } catch (error) {
    console.error("Sync error:", error);
    setSyncStatus("Sync gagal", "error");

    return {
      success: false,
      error: error.message
    };
  } finally {
    isSyncing = false;
  }
}

function scheduleSync() {
  if (!navigator.onLine) {
    setSyncStatus("Offline", "idle");
    return;
  }

  syncExpenses();
}