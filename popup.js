// popup.js - Extension popup logic

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const toggleBtn = document.getElementById('toggle');
  const salesCountEl = document.getElementById('salesCount');
  const pageCountEl = document.getElementById('pageCount');

  // Get current state from storage
  const { overlayActive, salesData } = await chrome.storage.local.get(['overlayActive', 'salesData']);

  // Update UI based on state
  updateUI(overlayActive || false);

  // Show sales count
  if (salesData && Object.keys(salesData).length > 0) {
    salesCountEl.textContent = `${Object.keys(salesData).length} items`;
  } else {
    salesCountEl.textContent = 'No data';
  }

  // Toggle button handler
  toggleBtn.addEventListener('click', async () => {
    const { overlayActive } = await chrome.storage.local.get('overlayActive');
    const newState = !overlayActive;

    // Save new state
    await chrome.storage.local.set({ overlayActive: newState });

    // Tell background to fetch data if activating
    if (newState) {
      await chrome.runtime.sendMessage({ action: 'fetchSales' });
    }

    // Tell content script to update
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url?.includes('jp.mercari.com/search')) {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'toggleOverlay',
        active: newState
      });
    }

    updateUI(newState);
  });

  // Listen for page count updates from content script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'pageStats') {
      pageCountEl.textContent = `${message.loggedCount} logged, ${message.excludedCount || 0} excluded / ${message.totalCount}`;
    }
  });

  function updateUI(active) {
    if (active) {
      statusEl.textContent = 'Overlay ON';
      statusEl.className = 'status active';
      toggleBtn.textContent = 'Disable Overlay';
      toggleBtn.className = 'active';
    } else {
      statusEl.textContent = 'Overlay OFF';
      statusEl.className = 'status inactive';
      toggleBtn.textContent = 'Enable Overlay';
      toggleBtn.className = 'inactive';
    }
  }
});