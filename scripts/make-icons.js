// Gera os ícones PNG do app (sem dependências): fundo escuro arredondado + bolinha vermelha de "rec"
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZES = [16, 32, 48, 64, 128, 256, 512];
const OUT = path.join(__dirname, '..', 'build');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x + 0.5, y + 0.5);
      raw.set([r, g, b, a], y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const clamp = (v) => Math.max(0, Math.min(1, v));

// Distância com sinal até um quadrado de cantos arredondados centrado na origem
function roundedRect(x, y, half, radius) {
  const qx = Math.abs(x) - half + radius;
  const qy = Math.abs(y) - half + radius;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function icon(size) {
  const s = size / 512;
  const bg = [31, 31, 36];
  const ring = [236, 236, 240];
  const red = [229, 72, 77];
  return png(size, (px, py) => {
    const x = px - size / 2;
    const y = py - size / 2;
    const d = Math.hypot(x, y);
    const bgA = clamp(0.5 - roundedRect(x, y, 240 * s, 110 * s));
    const ringA = clamp(0.5 - Math.abs(d - 150 * s) + 14 * s);
    const dotA = clamp(0.5 - (d - 100 * s));
    let c = bg;
    if (ringA > 0) c = c.map((v, i) => v + (ring[i] - v) * ringA);
    if (dotA > 0) c = c.map((v, i) => v + (red[i] - v) * dotA);
    return [...c.map(Math.round), Math.round(bgA * 255)];
  });
}

fs.mkdirSync(path.join(OUT, 'icons'), { recursive: true });
for (const size of SIZES) fs.writeFileSync(path.join(OUT, 'icons', `${size}x${size}.png`), icon(size));
fs.copyFileSync(path.join(OUT, 'icons', '512x512.png'), path.join(OUT, 'icon.png'));
console.log(`Ícones gerados em ${OUT}`);
