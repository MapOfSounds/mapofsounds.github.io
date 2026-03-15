// ============================================
// MapOfSounds — Map Module v3.0
// ============================================
// Mapbox Geocoder, Heatmap layer, enhanced stats

const SoundMap = {
  map: null,
  markers: [],
  markerElements: [],
  popup: null,
  sounds: [],
  activeFilter: 'all',
  userLocation: null,
  heatmapVisible: false,
  geocoder: null,
  
  init() {
    if (!CONFIG.MAPBOX_TOKEN) {
      console.warn('Mapbox token not available — map disabled');
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
    
    // Globe atmosphere
    this.map.on('style.load', () => {
      try { this.map.setFog({}); } catch { /* */ }
    });
    
    // Add geocoder search
    this._initGeocoder();
    
    this.map.on('load', () => {
      this.loadSounds();
    });
  },
  
  _initGeocoder() {
    if (typeof MapboxGeocoder === 'undefined') return;
    
    this.geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      placeholder: 'Search places...',
      collapsed: true,
      marker: false,
    });
    
    const geocoderContainer = document.getElementById('map-geocoder');
    if (geocoderContainer) {
      geocoderContainer.appendChild(this.geocoder.onAdd(this.map));
    }
    
    // On result, fly to location and show nearby sounds
    this.geocoder.on('result', async (e) => {
      const [lng, lat] = e.result.center;
      this.map.flyTo({ center: [lng, lat], zoom: 12, duration: 2000 });
      
      const nearby = await API.getNearby(lat, lng, 50);
      if (nearby.length > 0) {
        App.toast(`Found ${nearby.length} sound${nearby.length > 1 ? 's' : ''} near ${e.result.place_name.split(',')[0]}`, 'success');
      } else {
        App.toast(`No sounds near ${e.result.place_name.split(',')[0]} yet`, 'info');
      }
    });
  },
  
  async loadSounds() {
    this.sounds = await API.listSounds();
    this.renderMarkers();
    this._initHeatmapSource();
    this._updateStats();
  },
  
  renderMarkers() {
    this.markerElements.forEach(m => m.remove());
    this.markerElements = [];
    this.markers = [];
    
    const filtered = this.activeFilter === 'all'
      ? this.sounds
      : this.sounds.filter(s => s.tags.includes(this.activeFilter));
    
    filtered.forEach(sound => {
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
  
  // -- Heatmap layer --
  _initHeatmapSource() {
    if (!this.map) return;
    
    try {
      // Remove existing source/layer
      if (this.map.getLayer('sound-heat')) this.map.removeLayer('sound-heat');
      if (this.map.getSource('sounds-geo')) this.map.removeSource('sounds-geo');
    } catch { /* */ }
    
    const features = this.sounds.map(s => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
      properties: { plays: s.plays || 1 }
    }));
    
    this.map.addSource('sounds-geo', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features }
    });
    
    this.map.addLayer({
      id: 'sound-heat',
      type: 'heatmap',
      source: 'sounds-geo',
      layout: { visibility: this.heatmapVisible ? 'visible' : 'none' },
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'plays'], 0, 0.1, 5000, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 14, 2],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(0,0,0,0)',
          0.2, 'rgba(0,212,170,0.2)',
          0.4, 'rgba(0,212,170,0.4)',
          0.6, 'rgba(0,234,188,0.6)',
          0.8, 'rgba(255,184,77,0.8)',
          1, 'rgba(255,77,106,1)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 14, 40],
        'heatmap-opacity': 0.7
      }
    });
  },
  
  toggleHeatmap() {
    this.heatmapVisible = !this.heatmapVisible;
    if (this.map && this.map.getLayer('sound-heat')) {
      this.map.setLayoutProperty('sound-heat', 'visibility', this.heatmapVisible ? 'visible' : 'none');
    }
    App.toast(this.heatmapVisible ? '🔥 Heatmap ON' : 'Heatmap OFF', 'info');
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
    document.querySelectorAll('.filter-chip').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === tag);
    });
    this.renderMarkers();
  },
  
  zoomIn() { this.map.zoomIn({ duration: 300 }); },
  zoomOut() { this.map.zoomOut({ duration: 300 }); },
  
  async locateMe() {
    if (!navigator.geolocation) {
      App.toast('Geolocation not available', 'warning');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this.userLocation = { lat, lng };
        
        this.map.flyTo({ center: [lng, lat], zoom: 13, duration: 2000 });
        
        const el = document.createElement('div');
        el.className = 'user-location-marker';
        el.style.cssText = `
          width: 20px; height: 20px;
          background: #4da6ff;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 16px rgba(77, 166, 255, 0.6);
          animation: pulse-ring 2s ease-out infinite;
        `;
        
        new mapboxgl.Marker({ element: el })
          .setLngLat([lng, lat])
          .addTo(this.map);
        
        App.toast('📍 Location found!', 'success');
      },
      () => App.toast('Could not get location', 'error'),
      { enableHighAccuracy: true }
    );
  },
  
  resetView() {
    this.map.flyTo({ center: CONFIG.MAP_CENTER, zoom: CONFIG.MAP_ZOOM, duration: 2000 });
  },
  
  flyToSound(sound) {
    this.map.flyTo({ center: [sound.lng, sound.lat], zoom: 14, duration: 2000 });
    setTimeout(() => this.showPopup(sound, [sound.lng, sound.lat]), 2100);
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
    const filtered = this.activeFilter === 'all'
      ? this.sounds
      : this.sounds.filter(s => s.tags.includes(this.activeFilter));
    
    const total = filtered.length;
    const totalPlays = filtered.reduce((sum, s) => sum + (s.plays || 0), 0);
    
    // Calculate unique "countries" by rough lat/lng bucketing
    const regions = new Set();
    filtered.forEach(s => {
      const latBucket = Math.round(s.lat / 15) * 15;
      const lngBucket = Math.round(s.lng / 30) * 30;
      regions.add(`${latBucket},${lngBucket}`);
    });
    
    const el = (id) => document.getElementById(id);
    if (el('stat-total')) el('stat-total').textContent = `${total} sound${total !== 1 ? 's' : ''}`;
    if (el('stat-countries')) el('stat-countries').textContent = `🌍 ${regions.size} region${regions.size !== 1 ? 's' : ''}`;
    if (el('stat-plays')) el('stat-plays').textContent = `▶ ${totalPlays.toLocaleString()}`;
  }
};
