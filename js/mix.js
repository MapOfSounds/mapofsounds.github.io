// ============================================
// MapOfSounds — Ambient Mix Module v2.0
// ============================================

const AmbientMix = {
  slots: [],
  maxSlots: 6,
  targetSlotIndex: -1,
  
  init() {
    // Load saved mix
    const saved = localStorage.getItem('mos_mix');
    if (saved) {
      try { this.slots = JSON.parse(saved); } catch (e) { this.slots = []; }
    }
    this.render();
  },
  
  render() {
    const container = document.getElementById('mix-slots');
    if (!container) return;
    
    if (this.slots.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 40px;">
          <span class="empty-icon">🎛️</span>
          <p>Add sounds to create your perfect ambient mix</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.slots.map((slot, i) => `
      <div class="mix-slot" data-index="${i}">
        <span style="font-size: 1.2rem;">${this._getEmoji(slot.sound)}</span>
        <span class="mix-slot-name">${slot.sound.title}</span>
        <button class="mix-slot-btn" onclick="AmbientMix.toggleSlot(${i})" title="Play/Pause">
          ${slot.playing ? '⏸' : '▶'}
        </button>
        <input type="range" class="mix-slot-volume" min="0" max="100" value="${slot.volume || 50}"
          oninput="AmbientMix.setSlotVolume(${i}, this.value)">
        <button class="mix-slot-btn" onclick="AmbientMix.removeSlot(${i})" title="Remove">✕</button>
      </div>
    `).join('');
  },
  
  addSlot() {
    if (this.slots.length >= this.maxSlots) {
      App.toast(`Maximum ${this.maxSlots} sounds in mix`, 'warning');
      return;
    }
    this.targetSlotIndex = this.slots.length;
    this._openPicker();
  },
  
  _openPicker() {
    document.getElementById('picker-modal').classList.remove('hidden');
    document.getElementById('picker-search').value = '';
    this.searchForSlot('');
  },
  
  async searchForSlot(query) {
    const sounds = query
      ? await API.searchSounds(query)
      : await API.listSounds();
    
    const container = document.getElementById('picker-results');
    container.innerHTML = sounds.slice(0, 20).map(s => {
      const tagsText = s.tags.slice(0, 3).join(', ');
      return `
        <div class="picker-item" onclick="AmbientMix.selectSound('${s.id}')">
          <span style="font-size: 1.5rem;">${SoundMap._getMarkerEmoji(s.tags)}</span>
          <div>
            <div class="picker-item-title">${s.title}</div>
            <div class="picker-item-tags">${tagsText}</div>
          </div>
        </div>
      `;
    }).join('');
  },
  
  async selectSound(id) {
    const sound = await API.getSound(id);
    if (!sound) return;
    
    this.slots.push({
      sound,
      volume: 50,
      playing: false,
      audio: null
    });
    
    App.closeModal('picker-modal');
    this.render();
    this._save();
    App.toast(`Added "${sound.title}" to mix`, 'success');
  },
  
  toggleSlot(index) {
    const slot = this.slots[index];
    if (!slot) return;
    
    if (slot.playing) {
      // Pause
      if (slot.audio) {
        slot.audio.pause();
      }
      slot.playing = false;
    } else {
      // Play
      if (!slot.audio) {
        slot.audio = new Audio(slot.sound.audio);
        slot.audio.loop = true;
        slot.audio.volume = (slot.volume || 50) / 100;
      }
      slot.audio.play().catch(e => {
        App.toast('Could not play audio', 'error');
      });
      slot.playing = true;
    }
    
    this.render();
  },
  
  setSlotVolume(index, value) {
    const slot = this.slots[index];
    if (!slot) return;
    
    slot.volume = parseInt(value);
    if (slot.audio) {
      slot.audio.volume = slot.volume / 100;
    }
    this._save();
  },
  
  removeSlot(index) {
    const slot = this.slots[index];
    if (slot && slot.audio) {
      slot.audio.pause();
      slot.audio = null;
    }
    this.slots.splice(index, 1);
    this.render();
    this._save();
  },
  
  stopAll() {
    this.slots.forEach(slot => {
      if (slot.audio) {
        slot.audio.pause();
      }
      slot.playing = false;
    });
    this.render();
    App.toast('All sounds stopped', 'info');
  },
  
  saveMix() {
    this._save();
    App.toast('Mix saved locally!', 'success');
  },
  
  async loadPreset(presetId) {
    // Stop current mix
    this.stopAll();
    this.slots = [];
    
    const sounds = await API.listSounds();
    
    const presets = {
      'rainy-cafe': { tags: ['rain', 'cafe'], fallback: ['weather', 'cafe'] },
      'forest-morning': { tags: ['forest', 'animals'], fallback: ['nature', 'animals'] },
      'ocean-breeze': { tags: ['ocean', 'wind'], fallback: ['water', 'wind'] },
      'city-night': { tags: ['city', 'night'], fallback: ['city', 'traffic'] },
      'train-journey': { tags: ['transport', 'city'], fallback: ['transport', 'people'] },
      'thunderstorm': { tags: ['weather', 'rain'], fallback: ['weather', 'water'] },
    };
    
    const preset = presets[presetId];
    if (!preset) return;
    
    // Find matching sounds
    const matchedSounds = [];
    for (const tag of preset.tags) {
      const match = sounds.find(s => s.tags.includes(tag) && !matchedSounds.includes(s));
      if (match) matchedSounds.push(match);
    }
    
    // Fallback
    if (matchedSounds.length < 2) {
      for (const tag of preset.fallback) {
        const match = sounds.find(s => s.tags.includes(tag) && !matchedSounds.includes(s));
        if (match) matchedSounds.push(match);
      }
    }
    
    // Add to slots
    matchedSounds.forEach(sound => {
      this.slots.push({
        sound,
        volume: 50,
        playing: false,
        audio: null
      });
    });
    
    this.render();
    this._save();
    
    const presetNames = {
      'rainy-cafe': 'Rainy Café',
      'forest-morning': 'Forest Morning',
      'ocean-breeze': 'Ocean Breeze',
      'city-night': 'City Night',
      'train-journey': 'Train Journey',
      'thunderstorm': 'Thunderstorm',
    };
    
    App.toast(`🎛️ Loaded "${presetNames[presetId]}" preset`, 'success');
  },
  
  _getEmoji(sound) {
    return SoundMap._getMarkerEmoji(sound.tags);
  },
  
  _save() {
    const data = this.slots.map(s => ({
      sound: s.sound,
      volume: s.volume,
      playing: false,
    }));
    localStorage.setItem('mos_mix', JSON.stringify(data));
  }
};
