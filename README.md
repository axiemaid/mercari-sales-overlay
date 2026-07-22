# Mercari Sales Overlay

Chrome extension that highlights Mercari Japan listings you've already logged in your sales tracker.

## Install

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select this folder (`mercari-overlay-extension`)

## Usage

1. Go to your tracker site: https://hb-tracker.vercel.app/
2. Click a card's Mercari search link to view sold listings
3. Click the extension icon in Chrome toolbar
4. Click **Enable Overlay**
5. Logged items will show:
   - Green left border
   - Badge showing grade (e.g., "✓ A")
   - Hover for logged price and date

### Copy Link Feature

When overlay is active, every listing has a **📋** button in the bottom-right corner:
- Click to copy the full Mercari URL to clipboard
- Icon flashes to ✓ when copied
- Faster than right-click → Copy link address

## Data Source

Fetches from local server: `http://localhost:3010/sales`

**Requirements:**
- Server must be running on port 3010
- Start with: `cd ~/.openclaw/op-cardtracker && node server.cjs &`

**Updates are instant** — no need to push to GitHub. Just toggle the overlay off/on to refresh data.

## Files

- `manifest.json` - Extension config
- `popup.html/js` - UI for toggling overlay
- `content.js` - DOM manipulation on Mercari pages
- `overlay.css` - Styles for highlights
- `background.js` - Fetches sales data from local server

## Notes

- Works on `jp.mercari.com/search*` pages only
- Data is cached per session — toggle off/on to refresh
- Shows logged count in popup stats