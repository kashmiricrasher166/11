// lib/pack.js
const zlib = require('zlib');
const tar = require('tar'); // npm dep: tar

async function makeTarGz(items, outPath) {
  const fs = require('fs');
  const tmpDir = require('os').tmpdir();
  const staging = require('path').join(tmpDir, 'kx_' + Date.now());
  fs.mkdirSync(staging, { recursive: true });

  for (const it of items) {
    const safe = it.path.replace(/^[A-Za-z]:/, '').replace(/^\/+/, '').replace(/[:\\]/g, '_');
    const dest = require('path').join(staging, safe);
    fs.mkdirSync(require('path').dirname(dest), { recursive: true });
    try { fs.writeFileSync(dest, it.data); } catch {}
  }

  await tar.c(
    { gzip: true, file: outPath, cwd: staging },
    ['.']
  );

  // cleanup
  try { fs.rmSync(staging, { recursive: true, force: true }); } catch {}
  return outPath;
}

module.exports = { makeTarGz };