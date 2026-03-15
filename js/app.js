// ============================================
// MapOfSounds — Main App Controller v4.0
// ============================================
// Upgraded: page transitions, shortcuts modal, favorites routing

const App = {
  currentPage: 'map',
  
  async init() {
    try {
      await CONFIG.fetchConfig();
      API.init();

      this._safeInit('Player', () => Player.init());
      this._safeInit('SoundMap', () => SoundMap.init());
      this._safeInit('Search', () => Search.init());
      this._safeInit('Upload', () => Upload.init());
      this._safeInit('Tags', () => Tags.init());
      this._safeInit('AmbientMix', () => AmbientMix.init());
      this._safeInit('Journey', () => Journey.init());

      this._initRouter();

      const hash = window.location.hash.slice(1) || 'map';
      this.navigate(hash, false);

      // Theme
      const theme = localStorage.getItem('mos_theme') || 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      const themeBtn = document.getElementById('btn-theme');
      if (themeBtn) themeBtn.textContent = theme === 'dark' ? '🌙' : '☀️';

      this._initKeyboard();

      console.log(
        CONFIG.DEMO_MODE
          ? 'MapOfSounds v4.0 initialized (demo mode)'
          : 'MapOfSounds v4.0 initialized (live API)'
      );
    } catch (err) {
      console.error('App init error:', err);
    } finally {
      setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
      }, 600);
    }
  },

  _safeInit(name, fn) {
    try { fn(); } catch (err) { console.error(`[${name}] init failed:`, err); }
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
    
    if (pushHash) {
      window.location.hash = route;
    }
    
    // Page transition animation
    const currentEl = document.querySelector('.page.active');
    if (currentEl && currentEl.id !== `page-${page}`) {
      currentEl.classList.add('page-exit');
      setTimeout(() => {
        currentEl.classList.remove('active', 'page-exit');
      }, 200);
    } else if (currentEl) {
      currentEl.classList.remove('active');
    }
    
    // Update nav links  
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === page);
    });
    
    // Show target page with entrance animation
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      setTimeout(() => {
        targetPage.classList.add('active', 'page-enter');
        setTimeout(() => targetPage.classList.remove('page-enter'), 300);
      }, currentEl && currentEl.id !== `page-${page}` ? 200 : 0);
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
        if (param === 'tags') {
          Search.showSubTab('tags');
        } else if (param === 'favorites') {
          Search.showSubTab('favorites');
        }
        break;
        
      case 'sound':
        if (param) {
          SoundDetail.show(param);
        }
        break;
        
      case 'fun':
        if (param === 'journey') {
          Fun.showSubTab('journey');
          Journey.renderList();
        } else if (param === 'mix' || !param) {
          Fun.showSubTab('mix');
          AmbientMix.render();
        }
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
        const nearby = await API.getNearby(lat, lng, 50);
        
        if (nearby.length === 0) {
          this.toast('No sounds nearby. Try a larger area!', 'info');
          const all = await API.listSounds();
          if (all.length > 0) {
            const nearest = all.sort((a, b) => {
              const da = API._haversine(lat, lng, a.lat, a.lng);
              const db = API._haversine(lat, lng, b.lat, b.lng);
              return da - db;
            })[0];
            this.toast(`Nearest sound: ${nearest.title}`, 'info');
            if (this.currentPage === 'map') SoundMap.flyToSound(nearest);
          }
        } else {
          this.toast(`Found ${nearby.length} sound${nearby.length > 1 ? 's' : ''} nearby!`, 'success');
          
          if (this.currentPage !== 'map') this.navigate('map');
          
          SoundMap.map.flyTo({ center: [lng, lat], zoom: 11, duration: 2000 });
        }
      },
      () => this.toast('Could not get location', 'error'),
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
    
    if (SoundMap.map) {
      SoundMap.map.setStyle(next === 'dark'
        ? CONFIG.MAP_STYLE
        : (CONFIG.MAP_STYLE_LIGHT || 'mapbox://styles/mapbox/light-v11')
      );
      
      SoundMap.map.once('style.load', () => {
        SoundMap.renderMarkers();
        SoundMap._initHeatmapSource();
      });
    }
  },
  
  showShortcuts() {
    document.getElementById('shortcuts-modal').classList.remove('hidden');
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
  
  closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
  },
  
  copyLink() {
    const link = document.getElementById('qr-link').textContent;
    navigator.clipboard.writeText(link).then(() => {
      this.toast('Link copied!', 'success');
    }).catch(() => {
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
      const inInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      
      // Space = play/pause (not in inputs)  
      if (e.code === 'Space' && !inInput) {
        e.preventDefault();
        Player.toggle();
      }
      
      // Escape = close modals
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
      }
      
      if (inInput) return;
      
      // R = random sound
      if (e.key === 'r') this.randomSound();
      
      // / = focus search
      if (e.key === '/') {
        e.preventDefault();
        this.navigate('search');
      }
      
      // M = map
      if (e.key === 'm') this.navigate('map');
      
      // U = upload
      if (e.key === 'u') this.navigate('upload');
      
      // F = fun zone
      if (e.key === 'f') this.navigate('fun');
      
      // T = toggle theme
      if (e.key === 't') this.toggleTheme();
      
      // ? = shortcuts help
      if (e.key === '?') this.showShortcuts();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
