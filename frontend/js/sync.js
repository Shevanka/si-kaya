const API_BASE_URL = window.API_BASE_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000'
    : 'https://si-kaya-production.up.railway.app' // Ganti URL ini dengan URL Backend Render/Railway kamu setelah backend di-deploy
)

let isSyncing = false

function setSyncStatus(message, type = 'idle') {
  const syncStatus = document.getElementById('syncStatus')

  if (!syncStatus) {
    return
  }

  syncStatus.textContent = message

  syncStatus.classList.remove('sync-idle', 'sync-running', 'sync-success', 'sync-error')

  syncStatus.classList.add(`sync-${type}`)
}

function updateConnectionStatus() {
  const connectionStatus = document.getElementById('connectionStatus')

  if (!connectionStatus) {
    return
  }

  if (navigator.onLine) {
    connectionStatus.textContent = 'Online'
    connectionStatus.classList.remove('offline')
    connectionStatus.classList.add('online')
  } else {
    connectionStatus.textContent = 'Offline'
    connectionStatus.classList.remove('online')
    connectionStatus.classList.add('offline')
    setSyncStatus('Offline', 'idle')
  }
}

async function checkBackendHealth() {
  if (!navigator.onLine) {
    return { online: false, backend: false }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)

    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return { online: true, backend: true }
    } else {
      return { online: true, backend: false }
    }
  } catch (error) {
    if (!navigator.onLine || error.name === 'AbortError') {
      return { online: false, backend: false }
    }
    return { online: true, backend: false }
  }
}

async function syncExpenses() {
  console.log('SYNC START')

  updateConnectionStatus()

  if (isSyncing) {
    return {
      skipped: true,
      reason: 'Sync sedang berjalan',
    }
  }

  if (!navigator.onLine) {
    setSyncStatus('Offline', 'idle')

    return {
      skipped: true,
      reason: 'Browser offline',
    }
  }

  isSyncing = true
  setSyncStatus('Syncing...', 'running')

  try {
    const health = await checkBackendHealth()

    if (!health.online) {
      updateConnectionStatus()
      setSyncStatus('Offline', 'idle')

      return {
        success: false,
        error: 'Browser offline',
      }
    }

    if (!health.backend) {
      setSyncStatus('Backend off', 'error')

      return {
        success: false,
        error: 'Backend tidak tersedia',
      }
    }

    const unsyncedExpenses = await getUnsyncedExpenses()

    if (unsyncedExpenses.length === 0) {
      setSyncStatus('Semua synced', 'success')

      return {
        success: true,
        syncedCount: 0,
      }
    }

    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expenses: unsyncedExpenses,
      }),
    })

    if (!response.ok) {
      throw new Error(`Sync gagal. Status: ${response.status}`)
    }

    const result = await response.json()

    if (!Array.isArray(result.synced_ids)) {
      throw new Error('Response backend tidak valid')
    }

    await markExpensesAsSynced(result.synced_ids)

    setSyncStatus(`${result.synced_ids.length} synced`, 'success')

    return {
      success: true,
      syncedCount: result.synced_ids.length,
      failedItems: result.failed_items || [],
    }
  } catch (error) {
    console.error('Sync error:', error)
    setSyncStatus('Sync gagal', 'error')

    return {
      success: false,
      error: error.message,
    }
  } finally {
    isSyncing = false
  }
}

function scheduleSync() {
  if (!navigator.onLine) {
    setSyncStatus('Offline', 'idle')
    return
  }

  syncExpenses()
}
