// ============================================
// MapOfSounds — Main App Controller v2.0
// ============================================

const App = {
  currentPage: 'map',
  
  async init() {
    // 1. Fetch Mapbox token + config from Worker API (before any map init)
    await CONFIG.fetchConfig();
    
    // 2. Initialize API / data
    API.init();
    
    // 3. Initialize modules (map needs token to be ready)
    Player.init();
    SoundMap.init();   // uses CONFIG.MAPBOX_TOKEN
    Search.init();
    Upload.init();
    Tags.init();
    AmbientMix.init();
    Journey.init();
    
    // Setup routing
    this._initRouter();
    
    // Navigate to initial hash
    const hash = window.location.hash.slice(1) || 'map';
    this.navigate(hash, false);
    
    // Theme
    const theme = localStorage.getItem('mos_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('btn-theme').textContent = theme === 'dark' ? '🌙' : '☀️';
    
    // Hide loading overlay
    setTimeout(() => {
      document.getElementById('loading-overlay').classList.add('hidden');
    }, 800);
    
    // Keyboard shortcuts
    this._initKeyboard();
    
    console.log('🗺️ MapOfSounds initialized');
  },
  
  _initRouter() {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.slice(1) || 'map';
      this.navigate(hash, false);
    });
  },
  
  navigate(route, pushHash = true) {
    const parts = route.split('/');
    const page = parts[0];
    const param = parts[1] || null;
    
    // Update hash
    if (pushHash) {
      window.location.hash = route;
    }
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Show target page
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }
    
    this.currentPage = page;
    
    // Page-specific init
    switch (page) {
      case 'map':
        if (SoundMap.map) {
          setTimeout(() => SoundMap.map.resize(), 100);
        }
        break;
        
      case 'upload':
        Upload.initUploadMap();
        break;
        
      case 'search':
        setTimeout(() => {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }, 200);
        Search.doSearch();
        break;
        
      case 'tags':
        Tags.renderCloud();
        break;
        
      case 'sound':
        if (param) {
          SoundDetail.show(param);
        }
        break;
        
      case 'mix':
        AmbientMix.render();
        break;
        
      case 'journey':
        Journey.renderList();
        break;
    }
  },
  
  async randomSound() {
    const sound = await API.getRandomSound();
    if (sound) {
      App.toast(`🎲 Random: ${sound.title}`, 'info');
      Player.play(sound);
      
      if (this.currentPage === 'map') {
        SoundMap.flyToSound(sound);
      } else {
        this.navigate('map');
        setTimeout(() => SoundMap.flyToSound(sound), 500);
      }
    }
  },
  
  async nearMe() {
    if (!navigator.geolocation) {
      this.toast('Geolocation not available', 'warning');
      return;
    }
    
    this.toast('📍 Getting your location...', 'info');
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const nearby = await API.getNearby(lat, lng, 50); // 50km radius
        
        if (nearby.length === 0) {
          this.toast('No sounds nearby. Try a larger area!', 'info');
          // Show nearest sound instead
          const all = await API.listSounds();
          if (all.length > 0) {
            const nearest = all.sort((a, b) => {
              const da = API._haversine(lat, lng, a.lat, a.lng);
              const db = API._haversine(lat, lng, b.lat, b.lng);
              return da - db;
            })[0];
            this.toast(`Nearest sound: ${nearest.title}`, 'info');
            if (this.currentPage === 'map') {
              SoundMap.flyToSound(nearest);
            }
          }
        } else {
          this.toast(`Found ${nearby.length} sound${nearby.length > 1 ? 's' : ''} nearby!`, 'success');
          
          if (this.currentPage !== 'map') {
            this.navigate('map');
          }
          
          SoundMap.map.flyTo({
            center: [lng, lat],
            zoom: 11,
            duration: 2000
          });
        }
      },
      () => {
        this.toast('Could not get location', 'error');
      },
      { enableHighAccuracy: true }
    );
  },
  
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('mos_theme', next);
    
    const btn = document.getElementById('btn-theme');
    btn.textContent = next === 'dark' ? '🌙' : '☀️';
    
    // Update map style
    if (SoundMap.map) {
      SoundMap.map.setStyle(next === 'dark'
        ? CONFIG.MAP_STYLE
        : (CONFIG.MAP_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11')
      );
      
      // Re-render markers after style change
      SoundMap.map.once('style.load', () => {
        if (next === 'dark') {
          SoundMap.map.setFog({
            color: 'rgb(10, 14, 23)',
            'high-color': 'rgb(20, 30, 60)',
            'horizon-blend': 0.08,
            'space-color': 'rgb(5, 8, 15)',
            'star-intensity': 0.6
          });
        }
        SoundMap.renderMarkers();
      });
    }
  },
  
  // Toast notification
  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
  
  // Modal helpers
  closeModal(id) {
    document.getElementById(id).classList.add('hidden');
  },
  
  copyLink() {
    const link = document.getElementById('qr-link').textContent;
    navigator.clipboard.writeText(link).then(() => {
      this.toast('Link copied!', 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.toast('Link copied!', 'success');
    });
  },
  
  _initKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Space = play/pause (when not in input)
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        Player.toggle();
      }
      
      // Escape = close modals
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(m => {
          m.classList.add('hidden');
        });
      }
      
      // R = random sound
      if (e.key === 'r' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        this.randomSound();
      }
      
      // / = focus search
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        this.navigate('search');
      }
    });
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
