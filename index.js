<<<<<<< HEAD
const fs = require('fs');
const path = require('path');

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function list(dir) { return fs.readdirSync(dir); }
function join(...a) { return path.join(...a); }
function size(p) { return fs.statSync(p).size; }

=======
const fs = require('fs');
const path = require('path');

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function list(dir) { return fs.readdirSync(dir); }
function join(...a) { return path.join(...a); }
function size(p) { return fs.statSync(p).size; }

>>>>>>> 0fc19e495c2a9e86ab8f0d2d4de49848d98f2d80
module.exports = { readText, exists, list, join, size };