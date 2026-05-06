'use strict';
const https = require('https');

function apiRequest(url, method, token, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    };

    console.log('[OAT-REQ]', method, url);
    const req = https.request({ ...options, timeout: 10000 }, res => {
      console.log('[OAT-REQ] Response status:', res.statusCode, 'for', method, url.slice(0, 80));
      // Follow single redirect (GAS web apps redirect on first call)
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location) {
        console.log('[OAT-REQ] Redirecting to:', res.headers.location.slice(0, 80));
        return resolve(apiRequest(res.headers.location, method, token, body));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(data);
          else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', e => { console.error('[OAT-REQ] Network error:', e.message); reject(e); });
    req.on('timeout', () => { console.error('[OAT-REQ] Timeout on:', url.slice(0, 80)); req.destroy(new Error('Request timeout (10s)')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

module.exports = { apiRequest };
