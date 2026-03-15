// ============================================
// MapOfSounds — Auth Module v2.0
// ============================================
// Real Google OAuth 2.0 via Worker backend
// Flow: Frontend → Worker → Google → Worker (code exchange) → Frontend
// Session persisted in localStorage with signed token

const Auth = {
  user: null,
  token: null,

  init() {
    // 1. Check URL hash for auth callback from Worker
    this._handleAuthCallback();

    // 2. Restore persisted session
    this._restoreSession();

    // 3. Update UI
    this._updateUI();
  },

  // ---- OAuth Flow ----

  /** Redirect to Worker's /auth/google which redirects to Google consent */
  login() {
    const authUrl = `${CONFIG.API_URL}/auth/google`;
    window.location.href = authUrl;
  },

  /** Handle the redirect back from Worker with token or error in URL hash */
  _handleAuthCallback() {
    const hash = window.location.hash;
    if (!hash) return;

    const params = new URLSearchParams(hash.slice(1));

    // Success: Worker redirected with auth_token
    const authToken = params.get('auth_token');
    if (authToken) {
      this.token = decodeURIComponent(authToken);
      this._decodeAndStoreUser(this.token);

      // Clean URL — remove auth_token from hash
      history.replaceState(null, '', window.location.pathname);
      return;
    }

    // Error: Worker redirected with auth_error
    const authError = params.get('auth_error');
    if (authError) {
      console.error('Auth error:', authError);
      setTimeout(() => {
        App.toast(`Sign-in failed: ${authError}`, 'error');
      }, 1000);

      // Clean URL
      history.replaceState(null, '', window.location.pathname);
    }
  },

  /** Decode the signed session token payload (base64.signature format) */
  _decodeAndStoreUser(token) {
    try {
      const [b64] = token.split('.');
      const data = JSON.parse(atob(b64));

      this.user = {
        sub: data.sub,
        name: data.name,
        email: data.email,
        picture: data.picture,
        exp: data.exp,
      };

      this._saveSession();
      this._updateUI();

      setTimeout(() => {
        App.toast(`👋 Welcome, ${this.user.name}!`, 'success');
      }, 800);
    } catch (e) {
      console.error('Auth: Failed to decode token', e);
      this.token = null;
    }
  },

  // ---- Session Persistence ----

  _saveSession() {
    if (this.user && this.token) {
      localStorage.setItem('mos_auth_token', this.token);
      localStorage.setItem('mos_auth_user', JSON.stringify(this.user));
    }
  },

  _restoreSession() {
    try {
      const token = localStorage.getItem('mos_auth_token');
      const userData = localStorage.getItem('mos_auth_user');

      if (token && userData) {
        const user = JSON.parse(userData);

        // Check expiration
        if (user.exp && user.exp < Math.floor(Date.now() / 1000)) {
          console.log('Auth: Session expired, clearing');
          this._clearSession();
          return;
        }

        this.token = token;
        this.user = user;
      }
    } catch (e) {
      this._clearSession();
    }
  },

  _clearSession() {
    localStorage.removeItem('mos_auth_token');
    localStorage.removeItem('mos_auth_user');
    this.user = null;
    this.token = null;
  },

  // ---- Public API ----

  isLoggedIn() {
    if (!this.user) return false;
    // Check expiration
    if (this.user.exp && this.user.exp < Math.floor(Date.now() / 1000)) {
      this._clearSession();
      this._updateUI();
      return false;
    }
    return true;
  },

  getUser() {
    return this.user;
  },

  getToken() {
    return this.token;
  },

  getUserName() {
    return this.user ? this.user.name : 'Anonymous';
  },

  logout() {
    this._clearSession();
    this._updateUI();
    App.toast('Signed out', 'info');
  },

  /** Require login — returns true if logged in, shows prompt + redirects if not */
  requireLogin(action = 'do that') {
    if (this.isLoggedIn()) return true;
    App.toast(`Please sign in to ${action}`, 'warning');
    // Small delay so user sees the toast before redirect
    setTimeout(() => this.login(), 1500);
    return false;
  },

  // ---- UI Updates ----

  _updateUI() {
    const loginBtn = document.getElementById('auth-login-btn');
    const userArea = document.getElementById('auth-user-area');
    const userPic = document.getElementById('auth-user-pic');
    const userName = document.getElementById('auth-user-name');

    if (!loginBtn || !userArea) return;

    if (this.user) {
      loginBtn.classList.add('hidden');
      userArea.classList.remove('hidden');
      if (userPic) {
        userPic.src = this.user.picture || '';
        userPic.alt = this.user.name || '';
        userPic.referrerPolicy = 'no-referrer';
      }
      if (userName) {
        userName.textContent = this.user.name || 'User';
      }

      // Set username for comments
      localStorage.setItem('mos_username', this.user.name || 'User');
    } else {
      loginBtn.classList.remove('hidden');
      userArea.classList.add('hidden');
    }
  },
};
