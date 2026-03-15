// ============================================
// MapOfSounds — Configuration v2.0
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

  // Demo/sample data for initial display
  DEMO_MODE: true,

  // ---- Runtime config from Worker ----

  _configLoaded: false,

  /**
   * Fetch public configuration (Mapbox token etc.) from the Worker API.
   * Called once during App.init(). The token is stored as a Cloudflare
   * Worker secret — never in frontend source.
   */
  async fetchConfig() {
    if (this._configLoaded) return;

    try {
      const res = await fetch(`${this.API_URL}/config`);
      if (res.ok) {
        const data = await res.json();
        if (data.mapboxToken) this.MAPBOX_TOKEN = data.mapboxToken;
        if (data.mapStyle) this.MAP_STYLE = data.mapStyle;
        if (data.mapStyleLight) this.MAP_STYLE_LIGHT = data.mapStyleLight;
        this._configLoaded = true;
        console.log('✅ Config loaded from Worker');
      } else {
        console.warn('⚠️ Could not fetch config from Worker (status ' + res.status + ')');
      }
    } catch (e) {
      console.warn('⚠️ Worker unreachable — running in demo mode. ' + e.message);
    }
  },
};
