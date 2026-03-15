// ============================================
// MapOfSounds — Map Module v2.0
// ============================================
// Mapbox token is fetched from Worker at runtime.
// SoundMap.init() is called AFTER CONFIG.fetchConfig() resolves.

const SoundMap = {
  map: null,
  markers: [],
  markerElements: [],
  popup: null,
  sounds: [],
  activeFilter: 'all',
  userLocation: null,
  
  init() {
    // Guard: token must be ready (fetched in App.init → CONFIG.fetchConfig)
    if (!CONFIG.MAPBOX_TOKEN) {
      console.warn('⚠️ Mapbox token not available — map disabled');
      const container = document.getElementById('map');
      if (container) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);flex-direction:column;gap:12px;"><span style="font-size:3rem;">🗺️</span><p>Map unavailable — configure your Worker API URL and Mapbox token.</p></div>';
      }
      return;
    }

    mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;
    
    this.map = new mapboxgl.Map({
      container: 'map',
      style: CONFIG.MAP_STYLE,
      center: CONFIG.MAP_CENTER,
      zoom: CONFIG.MAP_ZOOM,
      projection: 'globe',
      attributionControl: false,
    });
    
    this.map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');
    
    // Globe atmosphere effect
    this.map.on('style.load', () => {
      this.map.setFog({
        color: 'rgb(10, 14, 23)',
        'high-color': 'rgb(20, 30, 60)',
        'horizon-blend': 0.08,
        'space-color': 'rgb(5, 8, 15)',
        'star-intensity': 0.6
      });
    });
    
    this.map.on('load', () => {
      this.loadSounds();
    });
  },
  
  async loadSounds() {
    this.sounds = await API.listSounds();
    this.renderMarkers();
    this._updateStats();
  },
  
  renderMarkers() {
    // Clear existing markers
    this.markerElements.forEach(m => m.remove());
    this.markerElements = [];
    this.markers = [];
    
    const filtered = this.activeFilter === 'all'
      ? this.sounds
      : this.sounds.filter(s => s.tags.includes(this.activeFilter));
    
    filtered.forEach(sound => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'sound-marker';
      el.innerHTML = this._getMarkerEmoji(sound.tags);
      el.style.cssText = `
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 212, 170, 0.2);
        border: 2px solid #00d4aa;
        border-radius: 50%;
        cursor: pointer;
        font-size: 16px;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 0 12px rgba(0, 212, 170, 0.3);
      `;
      
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
        el.style.boxShadow = '0 0 24px rgba(0, 212, 170, 0.6)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 0 12px rgba(0, 212, 170, 0.3)';
      });
      
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([sound.lng, sound.lat])
        .addTo(this.map);
      
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showPopup(sound, [sound.lng, sound.lat]);
      });
      
      this.markers.push({ marker, sound });
      this.markerElements.push(marker);
    });
    
    this._updateStats();
  },
  
  showPopup(sound, lngLat) {
    if (this.popup) this.popup.remove();
    
    const tagsHtml = sound.tags.map(t => `<span class="popup-tag">${t}</span>`).join('');
    
    const html = `
      <div class="popup-content">
        <div class="popup-title">${sound.title}</div>
        <div class="popup-tags">${tagsHtml}</div>
        <div style="font-size: 0.8rem; color: #8b95a8;">
          ▶ ${sound.plays || 0} plays · ❤️ ${sound.likes || 0} likes
        </div>
        <div class="popup-play">
          <button class="popup-play-btn" onclick="Player.play(API._localSounds.find(s=>s.id==='${sound.id}'))">▶ Play</button>
          <button class="popup-detail-btn" onclick="App.navigate('sound/${sound.id}')">Details</button>
        </div>
      </div>
    `;
    
    this.popup = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '280px',
      offset: 20
    })
      .setLngLat(lngLat)
      .setHTML(html)
      .addTo(this.map);
  },
  
  filter(tag) {
    this.activeFilter = tag;
    
    // Update filter chips UI
    document.querySelectorAll('.filter-chip').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === tag);
    });
    
    this.renderMarkers();
  },
  
  zoomIn() {
    this.map.zoomIn({ duration: 300 });
  },
  
  zoomOut() {
    this.map.zoomOut({ duration: 300 });
  },
  
  async locateMe() {
    if (!navigator.geolocation) {
      App.toast('Geolocation not available', 'warning');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.userLocation = { lat, lng };
        
        this.map.flyTo({
          center: [lng, lat],
          zoom: 13,
          duration: 2000
        });
        
        // Add user marker
        const el = document.createElement('div');
        el.style.cssText = `
          width: 20px; height: 20px;
          background: #4da6ff;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 16px rgba(77, 166, 255, 0.6);
        `;
        
        new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(this.map);
        
        App.toast('📍 Location found!', 'success');
      },
      (err) => {
        App.toast('Could not get location', 'error');
      },
      { enableHighAccuracy: true }
    );
  },
  
  resetView() {
    this.map.flyTo({
      center: CONFIG.MAP_CENTER,
      zoom: CONFIG.MAP_ZOOM,
      duration: 2000
    });
  },
  
  flyToSound(sound) {
    this.map.flyTo({
      center: [sound.lng, sound.lat],
      zoom: 14,
      duration: 2000
    });
    
    setTimeout(() => {
      this.showPopup(sound, [sound.lng, sound.lat]);
    }, 2100);
  },
  
  _getMarkerEmoji(tags) {
    const tagMap = {
      nature: '🌿', city: '🏙️', water: '💧', transport: '🚆',
      people: '👥', music: '🎵', weather: '⛈️', animals: '🐦',
      cafe: '☕', night: '🌙', morning: '🌅', ocean: '🌊',
      forest: '🌲', rain: '🌧️', wind: '💨', traffic: '🚗',
      market: '🛒', park: '🏞️', river: '🏞️', industrial: '🏭'
    };
    
    for (const tag of tags) {
      if (tagMap[tag]) return tagMap[tag];
    }
    return '🔊';
  },
  
  _updateStats() {
    const total = this.activeFilter === 'all'
      ? this.sounds.length
      : this.sounds.filter(s => s.tags.includes(this.activeFilter)).length;
    document.getElementById('stat-total').textContent = `${total} sound${total !== 1 ? 's' : ''}`;
  }
};
