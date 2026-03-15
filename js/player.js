// ============================================
// MapOfSounds — Audio Player v2.0
// ============================================

const Player = {
  wavesurfer: null,
  miniWavesurfer: null,
  currentSound: null,
  isPlaying: false,
  
  init() {
    // Initialize global player waveform
    this.wavesurfer = WaveSurfer.create({
      container: '#gp-waveform',
      waveColor: '#2a3650',
      progressColor: '#00d4aa',
      cursorColor: 'transparent',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      responsive: true,
      normalize: true,
    });
    
    this.wavesurfer.on('timeupdate', (time) => {
      const dur = this.wavesurfer.getDuration();
      document.getElementById('gp-time').textContent =
        `${this._formatTime(time)} / ${this._formatTime(dur)}`;
    });
    
    this.wavesurfer.on('finish', () => {
      this.isPlaying = false;
      this._updatePlayBtn();
      document.getElementById('stat-playing').classList.add('hidden');
    });
    
    this.wavesurfer.on('play', () => {
      this.isPlaying = true;
      this._updatePlayBtn();
      document.getElementById('stat-playing').classList.remove('hidden');
    });
    
    this.wavesurfer.on('pause', () => {
      this.isPlaying = false;
      this._updatePlayBtn();
      document.getElementById('stat-playing').classList.add('hidden');
    });
    
    // Volume
    const vol = document.getElementById('gp-volume');
    if (vol) {
      vol.addEventListener('input', () => {
        this.wavesurfer.setVolume(parseInt(vol.value) / 100);
      });
    }
  },
  
  async play(sound) {
    if (!sound || !sound.audio) {
      App.toast('No audio available', 'warning');
      return;
    }
    
    this.currentSound = sound;
    
    // Show global player
    const playerEl = document.getElementById('global-player');
    playerEl.classList.remove('hidden');
    
    // Update info
    document.getElementById('gp-title').textContent = sound.title;
    document.getElementById('gp-location').textContent =
      `📍 ${sound.lat.toFixed(2)}, ${sound.lng.toFixed(2)}`;
    
    // Update like button
    this._updateLikeBtn();
    
    // Load and play
    try {
      this.wavesurfer.load(sound.audio);
      this.wavesurfer.once('ready', () => {
        this.wavesurfer.play();
      });
    } catch (e) {
      console.error('Error loading audio:', e);
      App.toast('Could not load audio', 'error');
    }
    
    // Increment plays
    API.incrementPlays(sound.id);
  },
  
  toggle() {
    if (!this.wavesurfer) return;
    this.wavesurfer.playPause();
  },
  
  stop() {
    if (!this.wavesurfer) return;
    this.wavesurfer.stop();
    this.isPlaying = false;
    this._updatePlayBtn();
    document.getElementById('stat-playing').classList.add('hidden');
  },
  
  setVolume(val) {
    if (this.wavesurfer) {
      this.wavesurfer.setVolume(parseInt(val) / 100);
    }
  },
  
  async likeCurrentSound() {
    if (!this.currentSound) return;
    
    const liked = this._getLiked();
    if (liked.includes(this.currentSound.id)) {
      App.toast('Already liked!', 'info');
      return;
    }
    
    liked.push(this.currentSound.id);
    localStorage.setItem('mos_liked', JSON.stringify(liked));
    
    await API.likeSound(this.currentSound.id);
    this.currentSound.likes = (this.currentSound.likes || 0) + 1;
    
    this._updateLikeBtn();
    App.toast('❤️ Liked!', 'success');
  },
  
  showQR() {
    if (!this.currentSound) return;
    const url = `${CONFIG.SITE_URL}/#sound/${this.currentSound.id}`;
    
    document.getElementById('qr-link').textContent = url;
    
    const canvas = document.getElementById('qr-canvas');
    canvas.innerHTML = '';
    
    if (typeof QRCode !== 'undefined') {
      QRCode.toCanvas(url, {
        width: 200,
        margin: 2,
        color: { dark: '#00d4aa', light: '#1a2234' }
      }, (err, cvs) => {
        if (!err) canvas.appendChild(cvs);
      });
    }
    
    document.getElementById('qr-modal').classList.remove('hidden');
  },
  
  _getLiked() {
    try {
      return JSON.parse(localStorage.getItem('mos_liked') || '[]');
    } catch { return []; }
  },
  
  _updatePlayBtn() {
    const btn = document.getElementById('gp-play');
    if (btn) btn.textContent = this.isPlaying ? '⏸' : '▶';
  },
  
  _updateLikeBtn() {
    const btn = document.getElementById('gp-like');
    if (!btn || !this.currentSound) return;
    const liked = this._getLiked();
    btn.textContent = liked.includes(this.currentSound.id) ? '❤️' : '🤍';
  },
  
  _formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  },
  
  // Create a standalone mini waveform for sound cards
  createMiniWaveform(container, audioUrl) {
    if (!container || !audioUrl) return null;
    try {
      const ws = WaveSurfer.create({
        container,
        waveColor: '#2a3650',
        progressColor: '#00d4aa',
        cursorColor: 'transparent',
        barWidth: 1,
        barGap: 1,
        height: 40,
        responsive: true,
        interact: false,
        normalize: true,
      });
      ws.load(audioUrl);
      return ws;
    } catch (e) {
      return null;
    }
  }
};
