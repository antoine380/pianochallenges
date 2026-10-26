// Encode des octets dans un PNG (RVB 8 bits, deflate « stocké » sans compression, filtre 0) : sert à faire passer un JSON vers Figma par upload_assets,
// relu dans use_figma par figma.getImageByHash(h).getBytesAsync() (voir decodeDataPng dans build_figma.js).
import zlib from 'zlib';
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
export function encodeDataPng(data, W = 1024) {
  const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write('PCJ1', 4);
  const all = Buffer.concat([head, data]); const row = W * 3; const H = Math.max(1, Math.ceil(all.length / row));
  const raw = Buffer.alloc(H * (row + 1)); for (let y = 0; y < H; y++) all.copy(raw, y * (row + 1) + 1, y * row, Math.min(all.length, (y + 1) * row));
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
  const idat = zlib.deflateSync(raw, { level: 0 });
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}
