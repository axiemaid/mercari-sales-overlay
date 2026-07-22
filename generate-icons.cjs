// Generate simple placeholder icons for the extension
// Run with: node generate-icons.cjs

const fs = require('fs');
const path = require('path');

// Simple 1-color PNG generator (minimal format)
// Creates a solid green square icon

function createPNG(size, outputPath) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const width = size;
  const height = size;
  const bitDepth = 8;
  const colorType = 2; // RGB
  const compression = 0;
  const filter = 0;
  const interlace = 0;

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(bitDepth, 8);
  ihdrData.writeUInt8(colorType, 9);
  ihdrData.writeUInt8(compression, 10);
  ihdrData.writeUInt8(filter, 11);
  ihdrData.writeUInt8(interlace, 12);

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk (image data)
  const zlib = require('zlib');

  // Raw image data (RGB, green color)
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    // Filter byte (none)
    rawData[offset++] = 0;
    for (let x = 0; x < width; x++) {
      // Green RGB: #28a745
      rawData[offset++] = 40;  // R
      rawData[offset++] = 167; // G
      rawData[offset++] = 69;  // B
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  // Combine all chunks
  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);

  fs.writeFileSync(outputPath, png);
  console.log(`Created ${outputPath} (${size}x${size})`);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xFFFFFFFF;
  const table = getCRCTable();

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }

  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function getCRCTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

// Generate icons
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

createPNG(16, path.join(iconsDir, 'icon16.png'));
createPNG(48, path.join(iconsDir, 'icon48.png'));
createPNG(128, path.join(iconsDir, 'icon128.png'));

console.log('Done! Icons generated in', iconsDir);