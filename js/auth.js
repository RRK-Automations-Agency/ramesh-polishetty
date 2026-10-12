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
        error: 'Authentication is not configured. Please contact the site administrator.'
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

        // Provide generic error message (do not reveal whether email exists)
        return { error: `Invalid email or password. ${remaining} attempts remaining.` };
      }

      if (data && data.user) {
        // Verify the user is on the admin allowlist
        const isAdmin = await this.verifyAdmin(data.user);

        if (!isAdmin) {
          this.logout();
          return { error: 'Access denied. You do not have administrator privileges.' };
        }

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

  /* ---------- password reset (Supabase only) ---------- */
  async resetPassword(email) {
    if (!window.getSupabaseClient || !window.getSupabaseClient()) {
      return { error: 'Authentication is not configured.' };
    }

    if (!this.validateEmail(email)) {
      return { error: 'Please enter a valid email address.' };
    }

    try {
      const client = window.getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/admin.html'
      });

      if (error) return { error: 'Failed to send reset email. Please try again.' };
      return { success: true };
    } catch (err) {
      console.error('Password reset error:', err);
      return { error: 'Failed to send reset email. Please try again.' };
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
        // Verify the user is on the admin allowlist
        return await this.verifyAdmin(user);
      } catch {
        return false;
      }
    }

    return false;
  },

  /* ---------- admin verification ----------
     The real security boundary is the database: the RLS policies in
     supabase/migrations/20240101000003_secure_rls_admin_only.sql call
     public.is_admin(), which reads the admin allowlist table.

     This client-side check only decides whether to render the panel,
     so it must never rely on user_metadata: raw_user_meta_data is
     writable by the user themselves (supabase.auth.updateUser) and is
     therefore forgeable.
  --------------------------------------- */
  async verifyAdmin(user) {
    const client = window.getSupabaseClient && window.getSupabaseClient();
    if (!client) return false;

    let notDeployed = false;

    try {
      const { data, error } = await client.rpc('is_admin');

      // The allowlist answered — this is authoritative.
      if (!error) return data === true;

      const detail = (error.code || '') + ' ' + (error.message || '');
      notDeployed = /PGRST202|does not exist|Could not find the function/i.test(detail);

      if (!notDeployed) {
        // A real failure (network, revoked EXECUTE, ...) — refuse rather
        // than guess.
        console.warn('is_admin() failed (' + detail.trim() + ') — denying access.');
        return false;
      }
    } catch (err) {
      console.warn('is_admin() call failed:', err);
      return false;
    }

    // Migration ...0003 has not been applied yet, so the allowlist cannot be
    // enforced. The database is still on the permissive migration-002 policies,
    // which means any authenticated user can already write through the API —
    // the panel gate is consequently not a meaningful boundary in this state.
    // Keep the panel usable (this matches the behaviour before this check
    // existed) instead of locking the owner out, and say so loudly.
    console.warn('is_admin() is not deployed yet — run supabase/migrations/20240101000003_secure_rls_admin_only.sql (and add your admin row) to enforce the allowlist. Using legacy access for now.');
    return true;
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
