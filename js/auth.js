/* ============================================================
   RAMESH POLISETTY — Secure Authentication Module
   Uses Supabase Auth for backend authentication.
   Falls back to offline mode when Supabase not configured.
   ============================================================ */

const Auth = {
  SESSION_KEY: 'rp_auth_session',
  RATE_LIMIT_KEY: 'rp_rate_limit',
  OFFLINE_AUTH_KEY: 'rp_offline_auth',
  MAX_ATTEMPTS: 5,
  LOCKOUT_TIME: 15 * 60 * 1000, // 15 minutes
  SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours

  /* ---------- rate limiting ---------- */
  getRateLimit() {
    try {
      const data = localStorage.getItem(this.RATE_LIMIT_KEY);
      return data ? JSON.parse(data) : { attempts: 0, lastAttempt: 0 };
    } catch {
      return { attempts: 0, lastAttempt: 0 };
    }
  },

  setRateLimit(attempts) {
    localStorage.setItem(this.RATE_LIMIT_KEY, JSON.stringify({
      attempts,
      lastAttempt: Date.now()
    }));
  },

  isLockedOut() {
    const { attempts, lastAttempt } = this.getRateLimit();
    if (attempts >= this.MAX_ATTEMPTS) {
      const timePassed = Date.now() - lastAttempt;
      if (timePassed < this.LOCKOUT_TIME) {
        const remaining = Math.ceil((this.LOCKOUT_TIME - timePassed) / 60000);
        return { locked: true, remaining };
      }
      // Reset after lockout period
      this.setRateLimit(0);
    }
    return { locked: false };
  },

  recordFailedAttempt() {
    const { attempts } = this.getRateLimit();
    this.setRateLimit(attempts + 1);
  },

  resetAttempts() {
    this.setRateLimit(0);
  },

  /* ---------- input sanitization ---------- */
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .trim()
      .substring(0, 255); // Limit length
  },

  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length <= 254;
  },

  validatePassword(password) {
    return typeof password === 'string' && 
           password.length >= 6 && 
           password.length <= 128;
  },

  /* ---------- session management ---------- */
  getSession() {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      if (!data) return null;
      const session = JSON.parse(data);
      // Check if session expired
      if (Date.now() - session.timestamp > this.SESSION_DURATION) {
        this.logout();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  setSession(user) {
    const sessionData = {
      userId: user.id || 'offline-user',
      email: user.email || 'admin@local',
      timestamp: Date.now(),
      isOffline: user.isOffline || false
    };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    // Also sign out from Supabase if available
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      window.getSupabaseClient().auth.signOut();
    }
  },

  isLoggedIn() {
    return this.getSession() !== null;
  },

  /* ---------- offline authentication ---------- */
  // For when Supabase is not configured
  // ⚠️ WARNING: This is less secure - only use for development/testing
  async offlineLogin(email, password) {
    // Check rate limit first
    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        error: `Too many failed attempts. Please try again in ${lockout.remaining} minutes.`
      };
    }

    // Validate input
    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!this.validatePassword(password)) {
      return { error: 'Password must be between 6 and 128 characters.' };
    }

    // Check for stored offline credentials
    const stored = localStorage.getItem(this.OFFLINE_AUTH_KEY);
    let storedCredentials = null;
    
    if (stored) {
      try {
        storedCredentials = JSON.parse(stored);
      } catch {
        // Invalid stored data
      }
    }

    // If no stored credentials, create one (first time setup)
    if (!storedCredentials) {
      // Hash the password (simple hash for offline mode)
      const passwordHash = await this.simpleHash(password);
      storedCredentials = {
        email: email.toLowerCase(),
        passwordHash: passwordHash,
        createdAt: Date.now()
      };
      localStorage.setItem(this.OFFLINE_AUTH_KEY, JSON.stringify(storedCredentials));
      
      this.resetAttempts();
      this.setSession({ email: email, isOffline: true });
      
      return { 
        success: true, 
        user: { email: email, isOffline: true },
        message: 'Offline admin account created! For cloud storage, create a user in Supabase Dashboard > Authentication > Users.'
      };
    }

    // Verify credentials
    const passwordHash = await this.simpleHash(password);
    if (email.toLowerCase() !== storedCredentials.email || 
        passwordHash !== storedCredentials.passwordHash) {
      this.recordFailedAttempt();
      const { attempts } = this.getRateLimit();
      const remaining = this.MAX_ATTEMPTS - attempts;
      
      if (remaining <= 0) {
        return {
          error: 'Account locked due to too many failed attempts. Please try again later.'
        };
      }
      
      return {
        error: `Invalid credentials. ${remaining} attempts remaining.`
      };
    }

    // Success
    this.resetAttempts();
    this.setSession({ email: email, isOffline: true });
    
    return { 
      success: true, 
      user: { email: email, isOffline: true }
    };
  },

  /* ---------- simple hash for offline mode ---------- */
  async simpleHash(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str + 'rp_salt_2024'); // Add salt
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /* ---------- main authentication ---------- */
  async login(email, password) {
    // Sanitize inputs
    email = this.sanitizeInput(email);
    password = this.sanitizeInput(password);

    // Validate
    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!this.validatePassword(password)) {
      return { error: 'Password must be between 6 and 128 characters.' };
    }

    // Check rate limit first
    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        error: `Too many failed attempts. Please try again in ${lockout.remaining} minutes.`
      };
    }

    // Try Supabase authentication first
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      try {
        const client = window.getSupabaseClient();
        
        const { data, error } = await client.auth.signInWithPassword({
          email: email,
          password: password
        });

        if (error) {
          // If user not found, fall through to offline mode
          const errMsg = error.message || '';
          if (errMsg.includes('Invalid login credentials') || 
              errMsg.includes('User not found') ||
              errMsg.includes('Invalid email')) {
            console.log('Supabase: user not found, trying offline mode');
          } else {
            // Real error (rate limit, network, etc.)
            this.recordFailedAttempt();
            const { attempts } = this.getRateLimit();
            const remaining = this.MAX_ATTEMPTS - attempts;
            
            if (remaining <= 0) {
              return {
                error: 'Account locked due to too many failed attempts. Please try again later.'
              };
            }
            
            return {
              error: `Authentication error: ${errMsg}. ${remaining} attempts remaining.`
            };
          }
        } else if (data && data.user) {
          // Success with Supabase
          this.resetAttempts();
          this.setSession(data.user);
          return { success: true, user: data.user };
        }
      } catch (err) {
        console.error('Supabase login error:', err);
        // Fall through to offline mode
      }
    }

    // Fallback to offline mode
    console.warn('Using offline mode for authentication');
    return this.offlineLogin(email, password);
  },

  /* ---------- user management (Supabase only) ---------- */
  async createUser(email, password, metadata = {}) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'User creation requires Supabase. Please configure Supabase first.' };
    }

    // Sanitize inputs
    email = this.sanitizeInput(email);
    password = this.sanitizeInput(password);

    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!this.validatePassword(password)) {
      return { error: 'Password must be between 6 and 128 characters.' };
    }

    try {
      const client = window.getSupabaseClient();
      
      const { data, error } = await client.auth.signUp({
        email: email,
        password: password,
        options: {
          data: metadata
        }
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true, user: data.user };
    } catch (err) {
      console.error('User creation error:', err);
      return { error: 'Failed to create user.' };
    }
  },

  async resetPassword(email) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'Password reset requires Supabase. Please configure Supabase first.' };
    }

    email = this.sanitizeInput(email);
    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }

    try {
      const client = window.getSupabaseClient();
      
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin.html'
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { error: 'Failed to send reset email.' };
    }
  },

  /* ---------- access control ---------- */
  async checkAccess() {
    const session = this.getSession();
    if (!session) {
      return false;
    }

    // If offline mode, just check session exists
    if (session.isOffline) {
      return true;
    }

    // If Supabase is configured, verify server-side
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      try {
        const client = window.getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        
        if (!user) {
          this.logout();
          return false;
        }
        
        // Check if user has admin role
        const isAdmin = user.email === 'admin@rameshpolisetty.com' || 
                       user.user_metadata?.role === 'admin';
        
        return isAdmin;
      } catch {
        return false;
      }
    }

    return true;
  },

  /* ---------- utility ---------- */
  getAuthMode() {
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      return 'supabase';
    }
    return 'offline';
  },

  clearOfflineCredentials() {
    localStorage.removeItem(this.OFFLINE_AUTH_KEY);
  }
};

// Export for use in other files
window.Auth = Auth;
