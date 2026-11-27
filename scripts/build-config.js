#!/usr/bin/env node
/**
 * Build script for Vercel deployment.
 * Generates config/config.json from environment variables.
 * 
 * Usage:
 *   node scripts/build-config.js
 * 
 * Set these env vars in Vercel Dashboard → Settings → Environment Variables:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   BUCKET_NAME
 *   TABLE_NAME
 *   WHATSAPP_NUMBER
 *   PHONE_NUMBER
 */

const fs = require('fs');
const path = require('path');

/* Confirmed public contact details. These are the values published on every
   page, so they are also the safe fallback for config.json.

   The fallback is not enough on its own: a deployment whose WHATSAPP_NUMBER was
   left at a dummy value still ships that dummy value, because it is set (just
   wrong). The public site was serving "919000000000" for exactly that reason,
   and js/main.js had to catch it at runtime. Reject the placeholder here too, so
   config.json can never carry a dead number. */
const CONFIRMED = {
  WHATSAPP_NUMBER: '919963526973',
  PHONE_NUMBER: '+91 9963526973'
};

function isPlaceholderPhone(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  return !digits || !/^\d{10,15}$/.test(digits) || /0{6,}/.test(digits);
}

function whatsappNumber() {
  if (isPlaceholderPhone(process.env.WHATSAPP_NUMBER)) {
    if (process.env.WHATSAPP_NUMBER) {
      console.warn('\u26a0\ufe0f  WHATSAPP_NUMBER looks like a placeholder ('
        + process.env.WHATSAPP_NUMBER + ') - using the confirmed number instead.');
    }
    return CONFIRMED.WHATSAPP_NUMBER;
  }
  // Normalise whatever format the environment uses to international digits.
  return String(process.env.WHATSAPP_NUMBER).replace(/\D/g, '');
}

function phoneNumber() {
  if (isPlaceholderPhone(process.env.PHONE_NUMBER)) {
    if (process.env.PHONE_NUMBER) {
      console.warn('\u26a0\ufe0f  PHONE_NUMBER looks like a placeholder ('
        + process.env.PHONE_NUMBER + ') - using the confirmed number instead.');
    }
    return CONFIRMED.PHONE_NUMBER;
  }
  return String(process.env.PHONE_NUMBER);
}

const configDir = path.join(__dirname, '..', 'config');
const configPath = path.join(configDir, 'config.json');

/* A missing env var must not blank a value that is already in config.json.

   Supabase credentials have no safe default: writing '' for a missing
   SUPABASE_URL or SUPABASE_ANON_KEY produces a config.json that parses but
   breaks every gallery, the admin panel and the prerender step. Locally that
   happened on every plain `npm run build`, because .env is not exported for you.
   Keep the value already on disk instead, and only fall back to '' when there is
   no previous config at all (a fresh clone, or Vercel, which ships no file). */
function readExistingConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8')) || {};
  } catch (e) {
    return {};
  }
}

const previous = readExistingConfig();

function fromEnv(key, fallback) {
  const value = process.env[key];
  if (value && String(value).trim()) return String(value).trim();
  if (previous[key]) return previous[key];
  return fallback;
}

const config = {
  SUPABASE_URL: fromEnv('SUPABASE_URL', ''),
  SUPABASE_ANON_KEY: fromEnv('SUPABASE_ANON_KEY', ''),
  BUCKET_NAME: fromEnv('BUCKET_NAME', 'photos'),
  TABLE_NAME: fromEnv('TABLE_NAME', 'photos'),
  WHATSAPP_NUMBER: whatsappNumber(),
  PHONE_NUMBER: phoneNumber()
};

if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY) {
  console.warn('\u26a0\ufe0f  SUPABASE_URL / SUPABASE_ANON_KEY are empty in this build'
    + ' - galleries stay client-side rendered. Set them in the deployment env.');
}

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('✅ config.json generated from environment variables');
