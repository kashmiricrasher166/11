HEADconst fs = require('fs');
const path = require('path');

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function list(dir) { return fs.readdirSync(dir); }
function join(...a) { return path.join(...a); }
function size(p) { return fs.statSync(p).size; }


const fs = require('fs');
const path = require('path');

function readText(p) { return fs.readFileSync(p, 'utf8'); }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function list(dir) { return fs.readdirSync(dir); }
function join(...a) { return path.join(...a); }
function size(p) { return fs.statSync(p).size; }

module.exports = { readText, exists, list, join, size };
