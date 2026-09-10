import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawPixelFn) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel + 1; // 1 filter byte per row
  const rawData = Buffer.alloc(scanlineLength * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = drawPixelFn(x / width, y / height, x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(8 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Header
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT
  const idat = createChunk('IDAT', deflated);

  // IEND
  const iend = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

// Explore AI robot icon renderer
function renderExploreIcon(u, v) {
  // Center is (0.5, 0.5)
  const dx = u - 0.5;
  const dy = v - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Rounded squircle background for Apple touch icon (#090d16)
  // Distance from corner
  const cornerR = 0.22;
  const qx = Math.max(0, Math.abs(dx) - (0.5 - cornerR));
  const qy = Math.max(0, Math.abs(dy) - (0.5 - cornerR));
  const cornerDist = Math.sqrt(qx * qx + qy * qy);

  if (cornerDist > cornerR) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Outer ring (cyan dashed glow)
  if (dist >= 0.33 && dist <= 0.36) {
    const angle = Math.atan2(dy, dx);
    // dashed pattern
    if (Math.sin(angle * 14) > -0.2) {
      return [6, 182, 212, 240]; // cyan #06b6d4
    }
  }

  // Robot head circle (#0f172a / border #38bdf8)
  if (dist <= 0.28) {
    if (dist >= 0.265) {
      return [56, 189, 248, 255]; // border #38bdf8
    }

    // Left eye (around u = 0.42, v = 0.45, w=0.04, h=0.07, rx=0.02)
    const leftEyeX = (u - 0.42) / 0.035;
    const leftEyeY = (v - 0.45) / 0.055;
    if (leftEyeX * leftEyeX + leftEyeY * leftEyeY <= 1.0) {
      // Glow highlight inside eye
      const eyeHl = Math.sqrt(Math.pow(u - 0.41, 2) + Math.pow(v - 0.43, 2));
      if (eyeHl < 0.012) return [255, 255, 255, 255];
      return [56, 189, 248, 255];
    }

    // Right eye (around u = 0.58, v = 0.45, w=0.04, h=0.07, rx=0.02)
    const rightEyeX = (u - 0.58) / 0.035;
    const rightEyeY = (v - 0.45) / 0.055;
    if (rightEyeX * rightEyeX + rightEyeY * rightEyeY <= 1.0) {
      const eyeHl = Math.sqrt(Math.pow(u - 0.57, 2) + Math.pow(v - 0.43, 2));
      if (eyeHl < 0.012) return [255, 255, 255, 255];
      return [56, 189, 248, 255];
    }

    // Smiling voice waveform mouth (u: 0.40 to 0.60, v ≈ 0.58 + curve)
    if (u >= 0.39 && u <= 0.61) {
      const mouthX = (u - 0.50) / 0.11;
      const idealV = 0.57 + 0.04 * (1.0 - mouthX * mouthX);
      if (Math.abs(v - idealV) <= 0.014) {
        return [6, 182, 212, 255]; // cyan mouth
      }
    }

    return [15, 23, 42, 255]; // Dark slate #0f172a inside head
  }

  // Audio wave arcs on left and right
  const leftWaveDist = Math.sqrt(Math.pow(u - 0.23, 2) + Math.pow(v - 0.50, 2));
  if (leftWaveDist >= 0.04 && leftWaveDist <= 0.055 && u < 0.23) {
    return [56, 189, 248, 230];
  }
  const rightWaveDist = Math.sqrt(Math.pow(u - 0.77, 2) + Math.pow(v - 0.50, 2));
  if (rightWaveDist >= 0.04 && rightWaveDist <= 0.055 && u > 0.77) {
    return [56, 189, 248, 230];
  }

  // Base background inside squircle
  return [9, 13, 22, 255]; // #090d16
}

const targets = [
  { file: 'public/apple-touch-icon.png', size: 180 },
  { file: 'public/apple-touch-icon-152x152.png', size: 152 },
  { file: 'public/apple-touch-icon-167x167.png', size: 167 },
  { file: 'public/apple-touch-icon-180x180.png', size: 180 },
  { file: 'public/pwa-192x192.png', size: 192 },
  { file: 'public/pwa-512x512.png', size: 512 },
  { file: 'public/pwa-maskable-512x512.png', size: 512 },
];

for (const t of targets) {
  const pngBuf = createPNG(t.size, t.size, renderExploreIcon);
  fs.writeFileSync(t.file, pngBuf);
  console.log(`Generated ${t.file} (${t.size}x${t.size}, ${pngBuf.length} bytes)`);

  // Mirror to docs/ if exists
  const docsTarget = path.join('docs', path.basename(t.file));
  fs.writeFileSync(docsTarget, pngBuf);
}

console.log('All Apple and PWA icons generated successfully!');
