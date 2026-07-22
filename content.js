// content.js - Overlay logic for Mercari search pages

let overlayActive = false;
let salesData = {};
let excludedData = {};

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleOverlay') {
    overlayActive = message.active;
    if (overlayActive) {
      applyOverlay();
    } else {
      clearOverlay();
    }
  } else if (message.action === 'salesUpdated') {
    salesData = message.salesData;
    if (overlayActive) applyOverlay();
  } else if (message.action === 'excludedUpdated') {
    excludedData = message.excludedData;
    if (overlayActive) applyOverlay();
  }
});

// Load cached sales data on init
async function init() {
  const { overlayActive: savedActive, salesData: savedSales, excludedData: savedExcluded } =
    await chrome.storage.local.get(['overlayActive', 'salesData', 'excludedData']);

  if (savedSales) salesData = savedSales;
  if (savedExcluded) excludedData = savedExcluded;

  if (savedActive) {
    overlayActive = true;
    applyOverlay();
  }
}

// Main overlay function
function applyOverlay() {
  const listings = document.querySelectorAll('a[href^="/item/m"]');

  let loggedCount = 0;
  let excludedCount = 0;
  let totalCount = listings.length;

  listings.forEach(listing => {
    const href = listing.getAttribute('href');
    const match = href?.match(/\/item\/(m\d+)/);
    if (!match) return;

    const itemId = match[1];
    const saleInfo = salesData[itemId];
    const isExcluded = excludedData[itemId];

    if (saleInfo) {
      loggedCount++;
      highlightListing(listing, saleInfo);
    } else if (isExcluded) {
      excludedCount++;
      markExcluded(listing);
    }

    // Add buttons (only if not already present)
    addButtons(listing, itemId, isExcluded);
  });

  // Send stats to popup
  try {
    chrome.runtime.sendMessage({
      action: 'pageStats',
      loggedCount,
      excludedCount,
      totalCount
    });
  } catch (e) {}
}

// Add copy and exclude buttons
function addButtons(listing, itemId, isExcluded) {
  if (listing.querySelector('.mercsales-copy')) return; // Already added

  const figure = listing.querySelector('figure');
  if (!figure) return;
  figure.style.position = 'relative';

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'mercsales-copy';
  copyBtn.title = 'Copy link';
  copyBtn.innerHTML = '📋';
  copyBtn.type = 'button';
  copyBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://jp.mercari.com/item/${itemId}`;
    try {
      await navigator.clipboard.writeText(url);
      copyBtn.innerHTML = '✓';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
        copyBtn.classList.remove('copied');
      }, 1000);
    } catch (err) {}
  });

  // Exclude button
  const excludeBtn = document.createElement('button');
  excludeBtn.className = 'mercsales-exclude' + (isExcluded ? ' active' : '');
  excludeBtn.title = isExcluded ? 'Unexclude' : 'Exclude (bulk lot)';
  excludeBtn.innerHTML = '🚫';
  excludeBtn.type = 'button';
  excludeBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      chrome.runtime.sendMessage({
        action: 'toggleExclude',
        item_id: itemId,
        title: listing.getAttribute('aria-label') || '',
        currentlyExcluded: isExcluded
      });
    } catch (err) {}
  });

  figure.appendChild(copyBtn);
  figure.appendChild(excludeBtn);
}

// Add visual highlight to a logged listing
function highlightListing(listing, saleInfo) {
  if (listing.classList.contains('mercsales-logged')) return;
  listing.classList.add('mercsales-logged');

  const badge = document.createElement('div');
  badge.className = 'mercsales-badge';
  badge.textContent = `✓ ${saleInfo.grade || ''}`;
  badge.title = `Logged: ¥${saleInfo.price_jpy?.toLocaleString() || '?'}\nGrade: ${saleInfo.grade || '?'}\nDate: ${saleInfo.sold_date || '?'}`;

  const figure = listing.querySelector('figure');
  if (figure) figure.appendChild(badge);
}

// Mark listing as excluded (yellow border)
function markExcluded(listing) {
  if (listing.classList.contains('mercsales-excluded')) return;
  listing.classList.add('mercsales-excluded');
}

// Clear all highlights
function clearOverlay() {
  document.querySelectorAll('.mercsales-badge').forEach(el => el.remove());
  document.querySelectorAll('.mercsales-copy').forEach(el => el.remove());
  document.querySelectorAll('.mercsales-exclude').forEach(el => el.remove());
  document.querySelectorAll('.mercsales-logged').forEach(el => el.classList.remove('mercsales-logged'));
  document.querySelectorAll('.mercsales-excluded').forEach(el => el.classList.remove('mercsales-excluded'));

  try {
    chrome.runtime.sendMessage({
      action: 'pageStats',
      loggedCount: 0,
      excludedCount: 0,
      totalCount: 0
    });
  } catch (e) {}
}

// Re-apply overlay when DOM changes (infinite scroll)
const observer = new MutationObserver(() => {
  if (overlayActive) {
    applyOverlay();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Initialize on load
init();