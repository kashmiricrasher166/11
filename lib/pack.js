const fs = require('fs');
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function dosTime(d) {
  const time = ((d.getHours() & 0x1F) << 11)
             | ((d.getMinutes() & 0x3F) << 5)
             | ((d.getSeconds() / 2) & 0x1F);
  const date = (((d.getFullYear() - 1980) & 0x7F) << 9)
             | (((d.getMonth() + 1) & 0x0F) << 5)
             | (d.getDate() & 0x1F);
  return { time, date };
}

function makeZip(entries, outPath) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const { time, date } = dosTime(now);

  for (const e of entries) {
    const nameBuf = Buffer.from(e.name.replace(/\\/g, '/'), 'utf8');
    const data = e.data;
    const crc = crc32(data);
    const comp = zlib.deflateRawSync(data);
    const useDeflate = comp.length < data.length;
    const finalData = useDeflate ? comp : data;
    const method = useDeflate ? 8 : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(finalData.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);

    chunks.push(local, nameBuf, finalData);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(method, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(finalData.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);

    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + finalData.length;
  }

  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  const out = Buffer.concat([...chunks, centralBuf, eocd]);
  fs.writeFileSync(outPath, out);
  return outPath;
}

function makeZipFromItems(items, outPath, meta) {
  const entries = [];
  if (meta) {
    entries.push({
      name: '_meta.json',
      data: Buffer.from(JSON.stringify(meta, null, 2), 'utf8'),
    });
  }
  for (const it of items) {
    const rel = it.path
      .replace(/^[A-Za-z]:/, '')
      .replace(/^[\\\/]+/, '')
      .replace(/\\/g, '/');
    entries.push({ name: rel, data: it.data });
  }
  return makeZip(entries, outPath);
}

module.exports = { makeZipFromItems, makeZip };