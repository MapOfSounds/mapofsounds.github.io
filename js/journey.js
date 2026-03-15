// ============================================
// MapOfSounds — Sound Journey Module v2.0
// ============================================

const Journey = {
  journeys: [],
  currentJourney: null,
  currentStopIndex: 0,
  isPlaying: false,
  journeyMap: null,
  journeyAudio: null,
  autoPlayTimer: null,
  
  init() {
    // Load saved journeys
    const saved = localStorage.getItem('mos_journeys');
    if (saved) {
      try { this.journeys = JSON.parse(saved); } catch (e) { this.journeys = []; }
    }
    
    // Add demo journeys if empty
    if (this.journeys.length === 0) {
      this.journeys = this._getDemoJourneys();
      this._save();
    }
    
    this.renderList();
  },
  
  _getDemoJourneys() {
    const sounds = API._localSounds || [];
    
    return [
      {
        id: 'journey_1',
        title: 'Tokyo Day',
        description: 'Experience a day in Tokyo through sound',
        stops: sounds.filter(s => 
          s.id === 'demo_1' || s.id === 'demo_5'
        ).map(s => s.id),
      },
      {
        id: 'journey_2',
        title: 'European Cities',
        description: 'Travel through the iconic sounds of European cities',
        stops: sounds.filter(s => 
          s.id === 'demo_3' || s.id === 'demo_9' || s.id === 'demo_13'
        ).map(s => s.id),
      },
      {
        id: 'journey_3',
        title: 'Nature Symphony',
        description: 'Immerse yourself in the sounds of nature around the world',
        stops: sounds.filter(s =>
          s.id === 'demo_2' || s.id === 'demo_4' || s.id === 'demo_10' || s.id === 'demo_15'
        ).map(s => s.id),
      },
    ];
  },
  
  renderList() {
    const container = document.getElementById('journey-list');
    if (!container) return;
    
    container.innerHTML = this.journeys.map(j => {
      const stopCount = j.stops.length;
      const stopsPreview = j.stops.slice(0, 4).map(id => {
        const s = API._localSounds.find(s => s.id === id);
        return s ? `<span class="journey-stop"><span class="journey-stop-dot"></span>${s.title.substring(0, 15)}</span>` : '';
      }).join('<span class="journey-stop-line"></span>');
      
      return `
        <div class="journey-card" onclick="Journey.play('${j.id}')">
          <div class="journey-card-title">🧭 ${j.title}</div>
          <div class="journey-card-stops">${stopCount} stop${stopCount !== 1 ? 's' : ''}</div>
          ${j.description ? `<p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 8px;">${j.description}</p>` : ''}
          <div class="journey-card-path">${stopsPreview}</div>
        </div>
      `;
    }).join('');
  },
  
  async play(journeyId) {
    const journey = this.journeys.find(j => j.id === journeyId);
    if (!journey || journey.stops.length === 0) {
      App.toast('Journey has no stops', 'warning');
      return;
    }
    
    this.currentJourney = journey;
    this.currentStopIndex = 0;
    
    // Show journey player
    const playerEl = document.getElementById('journey-player');
    playerEl.classList.remove('hidden');
    
    // Render timeline
    this._renderTimeline();
    
    // Init map
    setTimeout(() => this._initJourneyMap(), 100);
    
    // Go to first stop
    this.goToStop(0);
  },
  
  _renderTimeline() {
    const container = document.getElementById('journey-timeline');
    if (!container || !this.currentJourney) return;
    
    container.innerHTML = this.currentJourney.stops.map((id, i) => {
      const sound = API._localSounds.find(s => s.id === id);
      if (!sound) return '';
      
      const dot = i === this.currentStopIndex ? 'active' : (i < this.currentStopIndex ? 'played' : '');
      const connector = i < this.currentJourney.stops.length - 1 ? '<span class="journey-timeline-connector"></span>' : '';
      
      return `
        <div class="journey-timeline-stop" onclick="Journey.goToStop(${i})">
          <span class="journey-timeline-dot ${dot}"></span>
          <span class="journey-timeline-label">${sound.title.substring(0, 20)}</span>
        </div>
        ${connector}
      `;
    }).join('');
  },
  
  _initJourneyMap() {
    const container = document.getElementById('journey-map');
    if (!container || container.offsetWidth === 0) return;
    
    // Guard: mapbox token must be available
    if (!CONFIG.MAPBOX_TOKEN) return;
    
    if (this.journeyMap) {
      this.journeyMap.remove();
    }
    
    const stops = this.currentJourney.stops
      .map(id => API._localSounds.find(s => s.id === id))
      .filter(Boolean);
    
    if (stops.length === 0) return;
    
    this.journeyMap = new mapboxgl.Map({
      container: 'journey-map',
      style: CONFIG.MAP_STYLE,
      center: [stops[0].lng, stops[0].lat],
      zoom: 4,
      attributionControl: false,
    });
    
    this.journeyMap.on('load', () => {
      // Add markers for all stops
      stops.forEach((s, i) => {
        const el = document.createElement('div');
        el.style.cssText = `
          width: 28px; height: 28px;
          background: ${i === this.currentStopIndex ? '#00d4aa' : '#2a3650'};
          border: 2px solid #00d4aa;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: ${i === this.currentStopIndex ? '#0a0e17' : '#00d4aa'};
        `;
        el.textContent = i + 1;
        
        new mapboxgl.Marker({ element: el })
          .setLngLat([s.lng, s.lat])
          .addTo(this.journeyMap);
      });
      
      // Draw line between stops
      if (stops.length > 1) {
        this.journeyMap.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: stops.map(s => [s.lng, s.lat])
            }
          }
        });
        
        this.journeyMap.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#00d4aa',
            'line-width': 2,
            'line-opacity': 0.5,
            'line-dasharray': [2, 4]
          }
        });
      }
      
      // Fit bounds
      const bounds = new mapboxgl.LngLatBounds();
      stops.forEach(s => bounds.extend([s.lng, s.lat]));
      this.journeyMap.fitBounds(bounds, { padding: 50, duration: 1000 });
    });
  },
  
  goToStop(index) {
    if (!this.currentJourney) return;
    if (index < 0 || index >= this.currentJourney.stops.length) return;
    
    this.currentStopIndex = index;
    
    const soundId = this.currentJourney.stops[index];
    const sound = API._localSounds.find(s => s.id === soundId);
    
    if (!sound) return;
    
    // Update timeline
    this._renderTimeline();
    
    // Update info
    const info = document.getElementById('journey-info');
    if (info) {
      info.innerHTML = `<strong>${sound.title}</strong><br><span class="text-muted">Stop ${index + 1} of ${this.currentJourney.stops.length}</span>`;
    }
    
    // Fly map to stop
    if (this.journeyMap) {
      this.journeyMap.flyTo({
        center: [sound.lng, sound.lat],
        zoom: 10,
        duration: 2000
      });
    }
    
    // Play sound
    Player.play(sound);
  },
  
  togglePlay() {
    this.isPlaying = !this.isPlaying;
    
    const btn = document.getElementById('journey-play-btn');
    if (btn) {
      btn.textContent = this.isPlaying ? '⏸' : '▶';
    }
    
    if (this.isPlaying) {
      this._autoPlay();
    } else {
      clearTimeout(this.autoPlayTimer);
    }
  },
  
  _autoPlay() {
    if (!this.isPlaying) return;
    
    this.goToStop(this.currentStopIndex);
    
    // Auto advance after 15 seconds
    this.autoPlayTimer = setTimeout(() => {
      if (this.currentStopIndex < this.currentJourney.stops.length - 1) {
        this.currentStopIndex++;
        this._autoPlay();
      } else {
        this.isPlaying = false;
        const btn = document.getElementById('journey-play-btn');
        if (btn) btn.textContent = '▶';
        App.toast('🧭 Journey complete!', 'success');
      }
    }, 15000);
  },
  
  prev() {
    this.goToStop(this.currentStopIndex - 1);
  },
  
  next() {
    this.goToStop(this.currentStopIndex + 1);
  },
  
  async create() {
    const sounds = await API.listSounds();
    
    // Simple journey creation - pick random sounds for now
    const shuffled = [...sounds].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, Math.min(4, shuffled.length));
    
    const journey = {
      id: 'journey_' + Date.now(),
      title: 'My Journey',
      description: 'A custom sound journey',
      stops: picks.map(s => s.id),
    };
    
    this.journeys.push(journey);
    this._save();
    this.renderList();
    
    App.toast('🧭 New journey created! Click to start.', 'success');
  },
  
  _save() {
    localStorage.setItem('mos_journeys', JSON.stringify(this.journeys));
  }
};
