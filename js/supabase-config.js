/* ============================================================
   RAMESH POLISETTY — Supabase Configuration
   Loads credentials from config.json (never hardcoded)
   ============================================================ */

// Default configuration (used if config.json not found)
const DEFAULT_CONFIG = {
  url: '',
  anonKey: '',
  bucketName: 'photos',
  tableName: 'photos',
  phoneNumber: '+91 9963526973',
  whatsappNumber: '919963526973'
};

// Loaded configuration
let SUPABASE_CONFIG = { ...DEFAULT_CONFIG };
let configLoaded = false;

/* A deployment that never got the real number ships a placeholder such as
   919000000000. Treat that as "not set". */
function isPlaceholderNumber(value) {
  const digits = String(value == null ? '' : value).replace(/\D/g, '');
  return !digits || !/^\d{10,15}$/.test(digits) || /0{6,}/.test(digits);
}

/**
 * Load configuration from config.json
 * This keeps credentials out of source code
 */
/* One fetch per page load. Several scripts ask for the config (js/main.js,
   js/gallery.js, js/admin-boot.js, and anything that calls initSupabase) and
   the response is served no-store, so without this every caller paid its own
   round trip. Guarding the *result* is not enough: the callers all run from
   their own DOMContentLoaded handler, so they are still in flight at the same
   time. The promise is therefore cached too, and cleared again if the load
   failed so a later attempt can still retry. */
let configPromise = null;

async function loadConfig() {
  if (configLoaded) return true;
  if (configPromise) return configPromise;
  configPromise = loadConfigOnce().then((ok) => {
    if (!ok) configPromise = null;
    return ok;
  });
  return configPromise;
}

async function loadConfigOnce() {
  try {
    const response = await fetch('/config/config.json');
    if (response.ok) {
      const data = await response.json();
      SUPABASE_CONFIG = {
        url: data.SUPABASE_URL || '',
        anonKey: data.SUPABASE_ANON_KEY || '',
        bucketName: data.BUCKET_NAME || 'photos',
        tableName: data.TABLE_NAME || 'photos',
        phoneNumber: data.PHONE_NUMBER || '+91 9963526973',
        // Same placeholder guard js/main.js applies: a deployment that never
        // received WHATSAPP_NUMBER ships a dead value, and linking visitors to
        // a dead line is worse than ignoring the setting.
        whatsappNumber: isPlaceholderNumber(data.WHATSAPP_NUMBER)
          ? '919963526973'
          : String(data.WHATSAPP_NUMBER).replace(/\D/g, '')
      };
      window.SUPABASE_CONFIG = SUPABASE_CONFIG;
      configLoaded = true;
      console.log('✅ Config loaded successfully');
      return true;
    } else {
      console.warn('⚠️ config.json not found. Using default config.');
      return false;
    }
  } catch (error) {
    console.error('❌ Error loading config:', error);
    return false;
  }
}

/**
 * Validate that required config is present
 */
function isConfigValid() {
  return SUPABASE_CONFIG.url && 
         SUPABASE_CONFIG.anonKey && 
         SUPABASE_CONFIG.url !== '' &&
         SUPABASE_CONFIG.anonKey !== '' &&
         SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL';
}

// Initialize Supabase client
let supabaseClient = null;

async function initSupabase() {
  // Already initialized — skip
  if (supabaseClient) {
    console.log('✅ Supabase client already initialized');
    return true;
  }
  
  // Load config first
  if (!configLoaded) {
    await loadConfig();
  }
  
  // Check if config is valid
  if (!isConfigValid()) {
    console.warn('⚠️ Supabase config not valid. Running in offline mode.');
    return false;
  }
  
  // Check if Supabase library is loaded
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded');
    return false;
  }
  
  try {
    supabaseClient = window.supabase.createClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    );
    console.log('✅ Supabase client initialized');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error);
    return false;
  }
}

/**
 * Get Supabase status for UI display
 */
function getSupabaseStatus() {
  if (!configLoaded) return { status: 'loading', message: 'Loading config...' };
  if (!isConfigValid()) return { status: 'offline', message: 'Offline Mode (config.json missing or invalid)' };
  if (!supabaseClient) return { status: 'error', message: 'Failed to initialize' };
  return { status: 'online', message: 'Connected to Supabase' };
}

// Export for use in other files
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.loadConfig = loadConfig;
window.initSupabase = initSupabase;
window.getSupabaseClient = () => supabaseClient;
window.getSupabaseStatus = getSupabaseStatus;
window.isConfigValid = isConfigValid;
