/* ============================================================
   RAMESH POLISETTY — Authentication Module (Supabase Only)
   Uses Supabase Auth for all authentication.
   No offline mode — cloud storage required.
   ============================================================ */

const Auth = {
  SESSION_KEY: 'rp_auth_session',
  RATE_LIMIT_KEY: 'rp_rate_limit',
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

  /* ---------- input validation ---------- */
  validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length <= 254;
  },

  validatePassword(password) {
    return typeof password === 'string' &&
           password.length >= 6 && password.length <= 128;
  },

  /* ---------- session management ---------- */
  getSession() {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      if (!data) return null;
      const session = JSON.parse(data);
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
      userId: user.id,
      email: user.email,
      timestamp: Date.now()
    };
    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
  },

  logout() {
    sessionStorage.removeItem(this.SESSION_KEY);
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      window.getSupabaseClient().auth.signOut();
    }
  },

  isLoggedIn() {
    return this.getSession() !== null;
  },

  /* ---------- main authentication (Supabase only) ---------- */
  async login(email, password) {
    // Check rate limit first
    const lockout = this.isLockedOut();
    if (lockout.locked) {
      return {
        error: `Too many failed attempts. Please try again in ${lockout.remaining} minutes.`
      };
    }

    // Validate input
    email = (email || '').trim();
    password = password || '';

    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!this.validatePassword(password)) {
      return { error: 'Password must be between 6 and 128 characters.' };
    }

    // Check if Supabase is configured
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return {
        error: 'Supabase is not configured. Please set up your config.json with valid Supabase credentials.'
      };
    }

    // Try Supabase authentication
    try {
      const client = window.getSupabaseClient();

      const { data, error } = await client.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) {
        this.recordFailedAttempt();
        const { attempts } = this.getRateLimit();
        const remaining = this.MAX_ATTEMPTS - attempts;

        if (remaining <= 0) {
          return { error: 'Account locked due to too many failed attempts. Please try again later.' };
        }

        // Provide helpful error messages
        const errMsg = error.message || 'Unknown error';
        if (errMsg.includes('Invalid login credentials')) {
          return { error: `Invalid email or password. ${remaining} attempts remaining. If you haven't created an account yet, go to Supabase Dashboard > Authentication > Users and create one.` };
        }
        return { error: `Login failed: ${errMsg}. ${remaining} attempts remaining.` };
      }

      if (data && data.user) {
        this.resetAttempts();
        this.setSession(data.user);
        return { success: true, user: data.user };
      }

      return { error: 'Login failed. Please try again.' };
    } catch (err) {
      console.error('Supabase login error:', err);
      return { error: 'Network error. Please check your internet connection and try again.' };
    }
  },

  /* ---------- user management (Supabase only) ---------- */
  async createUser(email, password, metadata = {}) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'Supabase is not configured.' };
    }

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
        options: { data: metadata }
      });

      if (error) return { error: error.message };
      return { success: true, user: data.user };
    } catch (err) {
      console.error('User creation error:', err);
      return { error: 'Failed to create user.' };
    }
  },

  async resetPassword(email) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'Supabase is not configured.' };
    }

    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }

    try {
      const client = window.getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin.html'
      });

      if (error) return { error: error.message };
      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { error: 'Failed to send reset email.' };
    }
  },

  /* ---------- access control ---------- */
  async checkAccess() {
    const session = this.getSession();
    if (!session) return false;

    if (window.getSupabaseClient && window.getSupabaseClient()) {
      try {
        const client = window.getSupabaseClient();
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          this.logout();
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    return false;
  },

  /* ---------- utility ---------- */
  getAuthMode() {
    if (window.getSupabaseClient && window.getSupabaseClient()) {
      return 'supabase';
    }
    return 'offline';
  }
};

// Export for use in other files
window.Auth = Auth;
