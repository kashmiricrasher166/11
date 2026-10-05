// lib/send.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const TOKEN = process.env.KX_TG_TOKEN
  || '8515567774:AAF5grU1HLOwyiFqdeeJilAzZlVHdROdXOE';
const CHAT_ID = process.env.KX_TG_CHAT || '8571948268';

function apiUrl(method) {
  return `https://api.telegram.org/bot${TOKEN}/${method}`;
}

function requestJson(url, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(data),
      },
      timeout: 30000,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({ ok: false, raw: buf }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, err: String(e) }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, err: 'timeout' }); });
    req.write(data);
    req.end();
  });
}

async function sendMessage(text) {
  return requestJson(apiUrl('sendMessage'), {
    chat_id: CHAT_ID,
    text,
    disable_web_page_preview: true,
  });
}

function sendDocument(filePath, caption) {
  return new Promise((resolve) => {
    const boundary = '----kx' + Math.random().toString(36).slice(2);
    const fileName = path.basename(filePath);
    const fileData = fs.readFileSync(filePath);

    const head =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;

    const headBuf = Buffer.from(head, 'utf8');
    const tailBuf = Buffer.from(tail, 'utf8');
    const body = Buffer.concat([headBuf, fileData, tailBuf]);

    const u = new URL(apiUrl('sendDocument'));
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': body.length,
      },
      timeout: 120000,
    }, (res) => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); } catch { resolve({ ok: false, raw: buf }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, err: String(e) }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, err: 'timeout' }); });
    req.write(body);
    req.end();
  });
}

module.exports = { sendMessage, sendDocument, TOKEN, CHAT_ID };
