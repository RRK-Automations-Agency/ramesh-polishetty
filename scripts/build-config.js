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
 */

const fs = require('fs');
const path = require('path');

const config = {
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  BUCKET_NAME: process.env.BUCKET_NAME || 'photos',
  TABLE_NAME: process.env.TABLE_NAME || 'photos',
  WHATSAPP_NUMBER: process.env.WHATSAPP_NUMBER || '919000000000'
};

const configDir = path.join(__dirname, '..', 'config');
const configPath = path.join(configDir, 'config.json');

// Ensure config directory exists
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}

// Write config
fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
console.log('✅ config.json generated from environment variables');
