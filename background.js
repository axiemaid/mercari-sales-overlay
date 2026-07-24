// background.js - Service worker for fetching sales data

const SALES_URL = 'http://localhost:3010/sales';
const EXCLUDED_URL = 'http://localhost:3010/excluded';

// Listen for messages from popup/content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchSales') {
    fetchSalesData();
  } else if (message.action === 'toggleExclude') {
    toggleExclude(message.item_id, message.title, message.currentlyExcluded);
  }
});

// Fetch and cache sales data
async function fetchSalesData() {
  try {
    console.log('[Mercari Overlay] Fetching sales data from', SALES_URL);

    const response = await fetch(SALES_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const sales = await response.json();

    // Convert array to map by item_id
    const salesMap = {};
    for (const sale of sales) {
      if (sale.item_id) {
        salesMap[sale.item_id] = {
          price_jpy: sale.price_jpy,
          grade: sale.grade,
          card_id: sale.card_id,
          sold_date: sale.sold_date,
          title: sale.title
        };
      }
    }

    // Store in chrome.storage.local
    await chrome.storage.local.set({
      salesData: salesMap,
      lastFetch: Date.now()
    });

    console.log('[Mercari Overlay] Cached', Object.keys(salesMap).length, 'sales');

    // Also fetch excluded data
    await fetchExcludedData();

    // Notify all Mercari tabs to refresh their overlay
    const tabs = await chrome.tabs.query({ url: 'https://jp.mercari.com/search*' });
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'salesUpdated',
          salesData: salesMap
        });
      } catch (e) {
        // Tab might not have content script loaded
      }
    }

  } catch (error) {
    console.error('[Mercari Overlay] Failed to fetch sales:', error);
  }
}

// Fetch and cache excluded data
async function fetchExcludedData() {
  try {
    const response = await fetch(EXCLUDED_URL);
    if (!response.ok) return;

    const excluded = await response.json();
    console.log('[Mercari Overlay] Fetched excluded array, length:', excluded.length);
    
    const excludedMap = {};
    for (const item of excluded) {
      if (item.item_id) {
        excludedMap[item.item_id] = { title: item.title };
      }
    }

    console.log('[Mercari Overlay] Converted to map, keys:', Object.keys(excludedMap).length);
    console.log('[Mercari Overlay] Sample keys:', Object.keys(excludedMap).slice(0, 5));
    
    await chrome.storage.local.set({ excludedData: excludedMap });
    console.log('[Mercari Overlay] Cached', Object.keys(excludedMap).length, 'excluded');

    // Notify tabs
    const tabs = await chrome.tabs.query({ url: 'https://jp.mercari.com/search*' });
    console.log('[Mercari Overlay] Notifying', tabs.length, 'tabs');
    for (const tab of tabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'excludedUpdated',
          excludedData: excludedMap
        });
      } catch (e) {}
    }
  } catch (error) {
    console.error('[Mercari Overlay] Failed to fetch excluded:', error);
  }
}

// Toggle exclude via API
async function toggleExclude(item_id, title, currentlyExcluded) {
  console.log('[Mercari Overlay] ========== toggleExclude ==========');
  console.log('[Mercari Overlay] item_id:', item_id);
  console.log('[Mercari Overlay] currentlyExcluded:', currentlyExcluded, 'type:', typeof currentlyExcluded);
  
  try {
    const action = currentlyExcluded ? 'remove' : 'add';
    console.log('[Mercari Overlay] Action will be:', action);
    
    const response = await fetch('http://localhost:3010/exclude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id, title, action })
    });
    const data = await response.json();
    console.log('[Mercari Overlay] API response - excluded count:', data.excluded ? data.excluded.length : 'unknown');
    
    await fetchExcludedData();
  } catch (error) {
    console.error('[Mercari Overlay] Toggle exclude failed:', error);
  }
}

// On install, fetch initial data
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Mercari Overlay] Extension installed');
  await fetchSalesData();
});

// On startup, fetch data
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Mercari Overlay] Browser started');
  await fetchSalesData();
});