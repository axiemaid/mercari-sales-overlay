// content.js - Overlay logic for Mercari search pages

let overlayActive = false;
let salesData = {};

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
    if (overlayActive) {
      applyOverlay();
    }
  }
});

// Load cached sales data on init
async function init() {
  const { overlayActive: savedActive, salesData: savedData } =
    await chrome.storage.local.get(['overlayActive', 'salesData']);

  if (savedData) {
    salesData = savedData;
  }

  if (savedActive) {
    overlayActive = true;
    applyOverlay();
  }
}

// Main overlay function
function applyOverlay() {
  // Find all listing items on the page
  const listings = document.querySelectorAll('a[href^="/item/m"]');

  let loggedCount = 0;
  let totalCount = listings.length;

  listings.forEach(listing => {
    // Extract item ID from URL: /item/m12345678901
    const href = listing.getAttribute('href');
    const match = href?.match(/\/item\/(m\d+)/);
    if (!match) return;

    const itemId = match[1];
    const saleInfo = salesData[itemId];

    if (saleInfo) {
      loggedCount++;
      highlightListing(listing, saleInfo);
    }

    // Add copy icon to all listings
    addCopyIcon(listing, itemId);
  });

  // Send stats to popup
  chrome.runtime.sendMessage({
    action: 'pageStats',
    loggedCount,
    totalCount
  });
}

// Add copy icon to a listing
function addCopyIcon(listing, itemId) {
  // Don't double-add
  if (listing.querySelector('.mercsales-copy')) return;

  const figure = listing.querySelector('figure');
  if (!figure) return;

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
      // Flash success
      copyBtn.innerHTML = '✓';
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.innerHTML = '📋';
        copyBtn.classList.remove('copied');
      }, 1000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  });

  figure.style.position = 'relative';
  figure.appendChild(copyBtn);
}

// Add visual highlight to a logged listing
function highlightListing(listing, saleInfo) {
  // Don't double-highlight
  if (listing.classList.contains('mercsales-logged')) return;

  listing.classList.add('mercsales-logged');

  // Create badge element
  const badge = document.createElement('div');
  badge.className = 'mercsales-badge';
  badge.textContent = `✓ ${saleInfo.grade || ''}`;

  // Add tooltip with more info
  const tooltip = `Logged: ¥${saleInfo.price_jpy?.toLocaleString() || '?'}\nGrade: ${saleInfo.grade || '?'}\nDate: ${saleInfo.sold_date || '?'}`;
  badge.title = tooltip;

  // Find the figure/image container to position badge
  const figure = listing.querySelector('figure');
  if (figure) {
    figure.style.position = 'relative';
    figure.appendChild(badge);
  }
}

// Clear all highlights
function clearOverlay() {
  // Remove badge elements
  document.querySelectorAll('.mercsales-badge').forEach(el => el.remove());

  // Remove copy buttons
  document.querySelectorAll('.mercsales-copy').forEach(el => el.remove());

  // Remove logged class
  document.querySelectorAll('.mercsales-logged').forEach(el => {
    el.classList.remove('mercsales-logged');
  });

  // Clear stats
  chrome.runtime.sendMessage({
    action: 'pageStats',
    loggedCount: 0,
    totalCount: 0
  });
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