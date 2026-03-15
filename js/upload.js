// ============================================
// MapOfSounds — Upload Module v2.0
// ============================================

const Upload = {
  file: null,
  previewWs: null,
  tags: [],
  uploadMap: null,
  uploadMarker: null,
  mediaRecorder: null,
  recordedChunks: [],
  isRecording: false,
  recordInterval: null,
  recordStart: 0,
  turnstileToken: null,
  
  init() {
    this._initDropzone();
    this._initTagInput();
    this._initForm();
    this._initTurnstile();
  },

  _initTurnstile() {
    // Turnstile data-callback requires plain global function names
    window.onTurnstileSuccess = (token) => {
      this.turnstileToken = token;
    };
    window.onTurnstileExpired = () => {
      this.turnstileToken = null;
    };
    window.onTurnstileError = () => {
      this.turnstileToken = null;
      App.toast('Verification failed. Please try again.', 'error');
    };
  },
  
  initUploadMap() {
    if (this.uploadMap) return;
    
    // Guard: mapbox token must be available
    if (!CONFIG.MAPBOX_TOKEN) return;
    
    setTimeout(() => {
      const container = document.getElementById('upload-map');
      if (!container || container.offsetWidth === 0) return;
      
      this.uploadMap = new mapboxgl.Map({
        container: 'upload-map',
        style: CONFIG.MAP_STYLE,
        center: CONFIG.MAP_CENTER,
        zoom: 2,
        attributionControl: false,
      });
      
      this.uploadMap.on('click', (e) => {
        const { lat, lng } = e.lngLat;
        this._setLocation(lat, lng);
      });
    }, 100);
  },
  
  _initDropzone() {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('upload-file');
    
    dropzone.addEventListener('click', () => fileInput.click());
    
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });
    
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this._handleFile(e.dataTransfer.files[0]);
      }
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this._handleFile(e.target.files[0]);
      }
    });
  },
  
  _handleFile(file) {
    // Validate format
    if (!CONFIG.ALLOWED_FORMATS.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) {
      App.toast('Invalid audio format. Use MP3, WAV, OGG, or M4A.', 'error');
      return;
    }
    
    // Validate size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      App.toast('File too large. Maximum 10MB.', 'error');
      return;
    }
    
    this.file = file;
    
    // Show preview
    const preview = document.getElementById('upload-preview');
    preview.classList.remove('hidden');
    document.getElementById('upload-dropzone').classList.add('hidden');
    
    // Create waveform preview
    if (this.previewWs) this.previewWs.destroy();
    
    this.previewWs = WaveSurfer.create({
      container: '#upload-waveform',
      waveColor: '#2a3650',
      progressColor: '#00d4aa',
      cursorColor: '#00d4aa',
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 60,
      normalize: true,
    });
    
    this.previewWs.loadBlob(file);
    
    // Auto-fill title from filename
    const titleInput = document.getElementById('upload-title');
    if (!titleInput.value) {
      titleInput.value = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    }
    
    App.toast('Audio file loaded!', 'success');
  },
  
  playPreview() {
    if (this.previewWs) {
      this.previewWs.playPause();
    }
  },
  
  removeFile() {
    this.file = null;
    if (this.previewWs) {
      this.previewWs.destroy();
      this.previewWs = null;
    }
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('upload-dropzone').classList.remove('hidden');
    document.getElementById('upload-file').value = '';
  },
  
  async toggleRecord() {
    if (this.isRecording) {
      this._stopRecording();
    } else {
      this._startRecording();
    }
  },
  
  async _startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: this.mediaRecorder.mimeType });
        const file = new File([blob], 'recording.' + (this.mediaRecorder.mimeType.includes('webm') ? 'webm' : 'm4a'), {
          type: this.mediaRecorder.mimeType
        });
        this._handleFile(file);
        stream.getTracks().forEach(t => t.stop());
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      
      const btn = document.getElementById('btn-record');
      btn.classList.add('recording');
      btn.innerHTML = '<span class="record-dot"></span> Stop';
      
      const timer = document.getElementById('record-timer');
      timer.classList.remove('hidden');
      this.recordStart = Date.now();
      this.recordInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.recordStart) / 1000);
        const m = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const s = (elapsed % 60).toString().padStart(2, '0');
        timer.textContent = `${m}:${s}`;
      }, 1000);
      
      App.toast('🎙️ Recording...', 'info');
    } catch (e) {
      App.toast('Microphone access denied', 'error');
    }
  },
  
  _stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording = false;
    
    const btn = document.getElementById('btn-record');
    btn.classList.remove('recording');
    btn.innerHTML = '<span class="record-dot"></span> Record';
    
    clearInterval(this.recordInterval);
    document.getElementById('record-timer').classList.add('hidden');
  },
  
  useGPS() {
    if (!navigator.geolocation) {
      App.toast('Geolocation not available', 'warning');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        this._setLocation(lat, lng);
        App.toast('📍 Location set from GPS!', 'success');
      },
      () => {
        App.toast('Could not get location', 'error');
      },
      { enableHighAccuracy: true }
    );
  },
  
  _setLocation(lat, lng) {
    document.getElementById('upload-lat').value = lat;
    document.getElementById('upload-lng').value = lng;
    document.getElementById('upload-location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    
    if (this.uploadMap) {
      if (this.uploadMarker) this.uploadMarker.remove();
      
      this.uploadMarker = new mapboxgl.Marker({ color: '#00d4aa' })
        .setLngLat([lng, lat])
        .addTo(this.uploadMap);
      
      this.uploadMap.flyTo({ center: [lng, lat], zoom: 12, duration: 1000 });
    }
  },
  
  _initTagInput() {
    const input = document.getElementById('upload-tags');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const tag = input.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (tag) this.addTag(tag);
        input.value = '';
      }
    });
  },
  
  addTag(tag) {
    tag = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!tag || this.tags.includes(tag)) return;
    if (this.tags.length >= 10) {
      App.toast('Maximum 10 tags', 'warning');
      return;
    }
    
    this.tags.push(tag);
    this._renderTags();
  },
  
  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this._renderTags();
  },
  
  _renderTags() {
    const container = document.getElementById('upload-tags-list');
    container.innerHTML = this.tags.map(tag => `
      <span class="tag-chip">
        ${tag}
        <span class="tag-remove" onclick="Upload.removeTag('${tag}')">✕</span>
      </span>
    `).join('');
  },
  
  _initForm() {
    const form = document.getElementById('upload-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._submit();
    });
  },
  
  async _submit() {
    const title = document.getElementById('upload-title').value.trim();
    const desc = document.getElementById('upload-desc').value.trim();
    const lat = document.getElementById('upload-lat').value;
    const lng = document.getElementById('upload-lng').value;

    // Get token: prefer live widget response, fall back to stored callback value
    const tsToken = (typeof turnstile !== 'undefined' && turnstile.getResponse()) || this.turnstileToken || null;
    
    if (!this.file) {
      App.toast('Please add an audio file', 'error');
      return;
    }
    if (!title) {
      App.toast('Please enter a title', 'error');
      return;
    }
    if (!lat || !lng) {
      App.toast('Please set a location', 'error');
      return;
    }
    if (!tsToken) {
      App.toast('Please complete the verification', 'error');
      return;
    }
    
    const btn = document.getElementById('btn-upload');
    btn.disabled = true;
    btn.innerHTML = '<span>Uploading...</span>';
    
    const progress = document.getElementById('upload-progress');
    progress.classList.remove('hidden');
    
    // Simulate progress
    let pct = 0;
    const progressFill = document.getElementById('upload-progress-fill');
    const progressText = document.getElementById('upload-progress-text');
    const progressTimer = setInterval(() => {
      pct = Math.min(pct + Math.random() * 20, 90);
      progressFill.style.width = pct + '%';
      progressText.textContent = `Uploading... ${Math.round(pct)}%`;
    }, 300);
    
    try {
      const formData = new FormData();
      formData.append('audio', this.file);
      formData.append('title', title);
      formData.append('description', desc);
      formData.append('lat', lat);
      formData.append('lng', lng);
      formData.append('tags', JSON.stringify(this.tags));
      formData.append('cf-turnstile-response', tsToken);
      
      const result = await API.uploadSound(formData);
      
      clearInterval(progressTimer);
      progressFill.style.width = '100%';
      progressText.textContent = 'Upload complete!';
      
      App.toast('🎉 Sound uploaded successfully!', 'success');
      
      // Refresh map
      await SoundMap.loadSounds();
      
      // Reset form
      setTimeout(() => {
        this._resetForm();
        App.navigate('map');
        
        // Fly to the new sound
        if (result) {
          SoundMap.flyToSound(result);
        }
      }, 1000);
    } catch (e) {
      clearInterval(progressTimer);
      App.toast('Upload failed: ' + e.message, 'error');
    }
    
    btn.disabled = false;
    btn.innerHTML = '<span>⬆️ Upload Sound</span>';
  },
  
  _resetForm() {
    this.file = null;
    this.tags = [];
    if (this.previewWs) { this.previewWs.destroy(); this.previewWs = null; }
    document.getElementById('upload-form').reset();
    document.getElementById('upload-preview').classList.add('hidden');
    document.getElementById('upload-dropzone').classList.remove('hidden');
    document.getElementById('upload-progress').classList.add('hidden');
    document.getElementById('upload-tags-list').innerHTML = '';
    if (this.uploadMarker) { this.uploadMarker.remove(); this.uploadMarker = null; }
    this.turnstileToken = null;
    if (typeof turnstile !== 'undefined') turnstile.reset();
  }
};
