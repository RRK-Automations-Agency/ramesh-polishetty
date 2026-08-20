/* ============================================================
   RAMESH POLISETTY — Supabase Configuration
   Loads credentials from config.json (never hardcoded)
   ============================================================ */

// Default configuration (used if config.json not found)
const DEFAULT_CONFIG = {
  url: '',
  anonKey: '',
  bucketName: 'photos',
  tableName: 'photos'
};

// Loaded configuration
let SUPABASE_CONFIG = { ...DEFAULT_CONFIG };
let configLoaded = false;

/**
 * Load configuration from config.json
 * This keeps credentials out of source code
 */
async function loadConfig() {
  try {
    const response = await fetch('/config/config.json');
    if (response.ok) {
      const data = await response.json();
      SUPABASE_CONFIG = {
        url: data.SUPABASE_URL || '',
        anonKey: data.SUPABASE_ANON_KEY || '',
        bucketName: data.BUCKET_NAME || 'photos',
        tableName: data.TABLE_NAME || 'photos'
      };
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
