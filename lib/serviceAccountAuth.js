'use strict';
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

const SA_PATH = path.join(__dirname, '..', 'credentials', 'service-account.json');
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';

let _cached = null;
let _expiry = 0;

async function getServiceAccountToken() {
  const now = Math.floor(Date.now() / 1000);
  if (_cached && now < _expiry - 60) return _cached;

  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'));
  const iat = now;
  const exp = iat + 3600;

  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: TOKEN_URL,
    scope: SCOPES,
    iat,
    exp
  }));

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(sa.private_key, 'base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const jwt = `${header}.${payload}.${sig}`;
  const token = await exchangeJwt(jwt);
  _cached = token;
  _expiry = exp;
  return token;
}

function b64url(str) {
  return Buffer.from(str).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function exchangeJwt(jwt) {
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error(`Token exchange failed: ${data}`));
        } catch (e) {
          reject(new Error(`Token parse failed: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { getServiceAccountToken };
