// ============================================
// MapOfSounds — Configuration v3.0
// ============================================
// Mapbox token is fetched from the Worker API at runtime
// so it is NEVER exposed in frontend source code.
// ============================================

const CONFIG = {
  // Mapbox token — populated at runtime via fetchConfig()
  MAPBOX_TOKEN: null,

  // Cloudflare Worker API URL — replace after deploying worker
  API_URL: 'https://soundmap-api.rukkit.workers.dev',

  // Site URL for sharing/QR
  SITE_URL: 'https://mapofsounds.github.io',

  // Map defaults
  MAP_CENTER: [0, 20],
  MAP_ZOOM: 2,
  MAP_STYLE: 'mapbox://styles/mapbox/dark-v11',
  MAP_STYLE_LIGHT: 'mapbox://styles/mapbox/light-v11',

  // Upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FORMATS: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a', 'audio/webm'],

  // Tags
  ALL_TAGS: [
    { id: 'nature', emoji: '🌿', label: 'Nature' },
    { id: 'city', emoji: '🏙️', label: 'City' },
    { id: 'water', emoji: '💧', label: 'Water' },
    { id: 'transport', emoji: '🚆', label: 'Transport' },
    { id: 'people', emoji: '👥', label: 'People' },
    { id: 'music', emoji: '🎵', label: 'Music' },
    { id: 'weather', emoji: '⛈️', label: 'Weather' },
    { id: 'animals', emoji: '🐦', label: 'Animals' },
    { id: 'cafe', emoji: '☕', label: 'Café' },
    { id: 'night', emoji: '🌙', label: 'Night' },
    { id: 'morning', emoji: '🌅', label: 'Morning' },
    { id: 'ocean', emoji: '🌊', label: 'Ocean' },
    { id: 'forest', emoji: '🌲', label: 'Forest' },
    { id: 'rain', emoji: '🌧️', label: 'Rain' },
    { id: 'wind', emoji: '💨', label: 'Wind' },
    { id: 'traffic', emoji: '🚗', label: 'Traffic' },
    { id: 'market', emoji: '🛒', label: 'Market' },
    { id: 'park', emoji: '🏞️', label: 'Park' },
    { id: 'river', emoji: '🏞️', label: 'River' },
    { id: 'industrial', emoji: '🏭', label: 'Industrial' },
  ],

  // Demo mode — auto-detected. True until Worker is confirmed reachable.
  DEMO_MODE: true,

  // Fetch timeout (ms) — never block the app longer than this
  _FETCH_TIMEOUT: 5000,

  // ---- Runtime config from Worker ----

  _configLoaded: false,

  /**
   * Fetch public configuration (Mapbox token etc.) from the Worker API.
   * Uses AbortController to enforce a 5-second timeout so the app
   * never hangs on a slow/unreachable Worker.
   */
  async fetchConfig() {
    if (this._configLoaded) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this._FETCH_TIMEOUT);

    try {
      const res = await fetch(`${this.API_URL}/config`, { signal: controller.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        if (data.mapboxToken) this.MAPBOX_TOKEN = data.mapboxToken;
        if (data.mapStyle) this.MAP_STYLE = data.mapStyle;
        if (data.mapStyleLight) this.MAP_STYLE_LIGHT = data.mapStyleLight;
        if (data.maxFileSize) this.MAX_FILE_SIZE = data.maxFileSize;
        if (data.allowedFormats) this.ALLOWED_FORMATS = data.allowedFormats;
        this._configLoaded = true;
        this.DEMO_MODE = false; // Worker is live — disable demo mode
        console.log('Config loaded from Worker API');
      } else {
        console.warn('Could not fetch config from Worker (status ' + res.status + ')');
      }
    } catch (e) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        console.warn('Worker config fetch timed out after ' + this._FETCH_TIMEOUT + 'ms — using demo mode');
      } else {
        console.warn('Worker unreachable — using demo mode. ' + e.message);
      }
    }
  },
};
