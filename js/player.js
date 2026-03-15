// ============================================
// MapOfSounds — Audio Player v3.0
// ============================================
// Upgraded: Audio visualizer, download, history

const Player = {
  wavesurfer: null,
  currentSound: null,
  isPlaying: false,
  history: [],
  maxHistory: 20,
  
  // Audio visualizer
  _audioCtx: null,
  _analyser: null,
  _visualizerRAF: null,
  _mediaSource: null,
  
  init() {
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
      this._stopVisualizer();
      document.getElementById('stat-playing')?.classList.add('hidden');
    });
    
    this.wavesurfer.on('play', () => {
      this.isPlaying = true;
      this._updatePlayBtn();
      this._startVisualizer();
      document.getElementById('stat-playing')?.classList.remove('hidden');
    });
    
    this.wavesurfer.on('pause', () => {
      this.isPlaying = false;
      this._updatePlayBtn();
      this._stopVisualizer();
      document.getElementById('stat-playing')?.classList.add('hidden');
    });
    
    // Volume
    const vol = document.getElementById('gp-volume');
    if (vol) {
      vol.addEventListener('input', () => {
        this.wavesurfer.setVolume(parseInt(vol.value) / 100);
      });
    }
    
    // Load play history
    try {
      this.history = JSON.parse(localStorage.getItem('mos_history') || '[]');
    } catch { this.history = []; }
  },
  
  async play(sound) {
    if (!sound || !sound.audio) {
      App.toast('No audio available', 'warning');
      return;
    }
    
    this.currentSound = sound;
    
    // Add to history
    this.history = this.history.filter(h => h.id !== sound.id);
    this.history.unshift({ id: sound.id, title: sound.title, date: new Date().toISOString() });
    if (this.history.length > this.maxHistory) this.history = this.history.slice(0, this.maxHistory);
    localStorage.setItem('mos_history', JSON.stringify(this.history));
    
    // Show global player
    const playerEl = document.getElementById('global-player');
    playerEl.classList.remove('hidden');
    
    // Update info
    document.getElementById('gp-title').textContent = sound.title;
    document.getElementById('gp-location').textContent =
      `📍 ${sound.lat.toFixed(2)}, ${sound.lng.toFixed(2)}`;
    
    this._updateLikeBtn();
    
    // Load and play
    try {
      this.wavesurfer.load(sound.audio);
      this.wavesurfer.once('ready', () => {
        this.wavesurfer.play();
        this._connectVisualizer();
      });
    } catch (e) {
      console.error('Error loading audio:', e);
      App.toast('Could not load audio', 'error');
    }
    
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
    this._stopVisualizer();
    document.getElementById('stat-playing')?.classList.add('hidden');
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
  
  async download() {
    if (!this.currentSound || !this.currentSound.audio) {
      App.toast('No audio to download', 'warning');
      return;
    }
    
    try {
      App.toast('⬇️ Downloading...', 'info');
      const res = await fetch(this.currentSound.audio);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.currentSound.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      App.toast('⬇️ Download started!', 'success');
    } catch (e) {
      App.toast('Download failed', 'error');
    }
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
  
  // -- Audio Visualizer --
  
  _connectVisualizer() {
    try {
      if (!this._audioCtx) {
        this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this._analyser = this._audioCtx.createAnalyser();
        this._analyser.fftSize = 128;
      }
      
      // Connect WaveSurfer media element to analyser
      const mediaEl = this.wavesurfer.getMediaElement();
      if (mediaEl && !this._mediaSource) {
        this._mediaSource = this._audioCtx.createMediaElementSource(mediaEl);
        this._mediaSource.connect(this._analyser);
        this._analyser.connect(this._audioCtx.destination);
      }
    } catch (e) {
      // Visualizer init can fail on some browsers — not critical
      console.warn('Visualizer init failed:', e.message);
    }
  },
  
  _startVisualizer() {
    const canvas = document.getElementById('gp-visualizer');
    if (!canvas || !this._analyser) return;
    
    const ctx = canvas.getContext('2d');
    const bufferLength = this._analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      this._visualizerRAF = requestAnimationFrame(draw);
      
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      this._analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / bufferLength;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        
        const hue = 160 + (i / bufferLength) * 30; // teal-green gradient
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.3 + (dataArray[i] / 255) * 0.5})`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        
        x += barWidth;
      }
    };
    
    draw();
  },
  
  _stopVisualizer() {
    if (this._visualizerRAF) {
      cancelAnimationFrame(this._visualizerRAF);
      this._visualizerRAF = null;
    }
    const canvas = document.getElementById('gp-visualizer');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
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
    } catch { return null; }
  }
};
