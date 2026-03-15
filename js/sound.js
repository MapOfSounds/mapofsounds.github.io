// ============================================
// MapOfSounds — Sound Detail Page v2.0
// ============================================

const SoundDetail = {
  currentSound: null,
  detailWs: null,
  detailMap: null,
  
  async show(id) {
    const sound = await API.getSound(id);
    if (!sound) {
      App.toast('Sound not found', 'error');
      App.navigate('map');
      return;
    }
    
    this.currentSound = sound;
    const container = document.getElementById('sound-detail');
    
    const tagsHtml = sound.tags.map(t => {
      const info = CONFIG.ALL_TAGS.find(ti => ti.id === t);
      return `<span class="tag-chip clickable" onclick="App.navigate('tags'); Tags.selectTag('${t}')">${info ? info.emoji + ' ' : ''}${t}</span>`;
    }).join('');
    
    const commentsHtml = (sound.comments || []).map(c => `
      <div class="comment-item">
        <div class="comment-author">${c.author}</div>
        <div class="comment-text">${c.text}</div>
        <div class="comment-date">${c.date}</div>
      </div>
    `).join('');
    
    const liked = Player._getLiked();
    const isLiked = liked.includes(sound.id);
    
    container.innerHTML = `
      <div class="sound-detail-hero">
        <h1 class="sound-detail-title">${sound.title}</h1>
        <div class="sound-detail-location">📍 ${sound.lat.toFixed(4)}, ${sound.lng.toFixed(4)}</div>
        
        <div class="sound-detail-waveform" id="detail-waveform"></div>
        
        <div class="sound-detail-controls">
          <button class="btn btn-primary" onclick="Player.play(SoundDetail.currentSound)">▶ Play</button>
          <button class="btn ${isLiked ? 'btn-primary' : ''}" id="detail-like-btn" onclick="SoundDetail.like()">
            ${isLiked ? '❤️' : '🤍'} ${sound.likes || 0} Like${(sound.likes || 0) !== 1 ? 's' : ''}
          </button>
          <button class="btn btn-ghost" onclick="SoundDetail.shareQR()">📱 QR</button>
          <button class="btn btn-ghost" onclick="SoundDetail.goToMap()">🗺️ Map</button>
        </div>
        
        <div class="sound-detail-tags">${tagsHtml}</div>
        
        ${sound.description ? `<p class="sound-detail-desc">${sound.description}</p>` : ''}
        
        <div class="sound-detail-info">
          <div class="info-stat">
            <div class="info-stat-value">${sound.plays || 0}</div>
            <div class="info-stat-label">Plays</div>
          </div>
          <div class="info-stat">
            <div class="info-stat-value">${sound.likes || 0}</div>
            <div class="info-stat-label">Likes</div>
          </div>
          <div class="info-stat">
            <div class="info-stat-value">${sound.date || '—'}</div>
            <div class="info-stat-label">Date</div>
          </div>
        </div>
      </div>
      
      <div class="sound-detail-map" id="detail-map"></div>
      
      <div class="comments-section">
        <h3>💬 Comments (${(sound.comments || []).length})</h3>
        <div class="comment-form">
          <input type="text" id="comment-input" placeholder="Write a comment...">
          <button class="btn btn-primary btn-sm" onclick="SoundDetail.addComment()">Send</button>
        </div>
        <div class="comment-list" id="comment-list">
          ${commentsHtml || '<p class="text-muted" style="text-align:center;padding:20px;">No comments yet. Be the first!</p>'}
        </div>
      </div>
    `;
    
    // Init detail waveform
    setTimeout(() => {
      this._initDetailWaveform(sound);
      this._initDetailMap(sound);
    }, 100);
  },
  
  _initDetailWaveform(sound) {
    const container = document.getElementById('detail-waveform');
    if (!container) return;
    
    if (this.detailWs) this.detailWs.destroy();
    
    this.detailWs = WaveSurfer.create({
      container: '#detail-waveform',
      waveColor: '#2a3650',
      progressColor: '#00d4aa',
      cursorColor: '#00d4aa',
      barWidth: 3,
      barGap: 1,
      barRadius: 2,
      height: 100,
      normalize: true,
    });
    
    if (sound.audio) {
      this.detailWs.load(sound.audio);
      this.detailWs.on('click', () => {
        Player.play(sound);
      });
    }
  },
  
  _initDetailMap(sound) {
    const container = document.getElementById('detail-map');
    if (!container || container.offsetWidth === 0) return;
    
    // Guard: mapbox token must be available
    if (!CONFIG.MAPBOX_TOKEN) return;
    
    if (this.detailMap) {
      this.detailMap.remove();
      this.detailMap = null;
    }
    
    this.detailMap = new mapboxgl.Map({
      container: 'detail-map',
      style: CONFIG.MAP_STYLE,
      center: [sound.lng, sound.lat],
      zoom: 12,
      attributionControl: false,
      interactive: true,
    });
    
    new mapboxgl.Marker({ color: '#00d4aa' })
      .setLngLat([sound.lng, sound.lat])
      .addTo(this.detailMap);
  },
  
  async like() {
    if (!this.currentSound) return;
    
    const liked = Player._getLiked();
    if (liked.includes(this.currentSound.id)) {
      App.toast('Already liked!', 'info');
      return;
    }
    
    liked.push(this.currentSound.id);
    localStorage.setItem('mos_liked', JSON.stringify(liked));
    
    await API.likeSound(this.currentSound.id);
    this.currentSound.likes = (this.currentSound.likes || 0) + 1;
    
    const btn = document.getElementById('detail-like-btn');
    if (btn) {
      btn.classList.add('btn-primary');
      btn.innerHTML = `❤️ ${this.currentSound.likes} Like${this.currentSound.likes !== 1 ? 's' : ''}`;
    }
    
    App.toast('❤️ Liked!', 'success');
  },
  
  async addComment() {
    const input = document.getElementById('comment-input');
    const text = input.value.trim();
    if (!text) return;
    
    const author = localStorage.getItem('mos_username') || 'Anonymous';
    await API.addComment(this.currentSound.id, author, text);
    
    input.value = '';
    
    // Refresh comments
    const sound = await API.getSound(this.currentSound.id);
    if (sound) {
      this.currentSound = sound;
      const list = document.getElementById('comment-list');
      list.innerHTML = (sound.comments || []).map(c => `
        <div class="comment-item">
          <div class="comment-author">${c.author}</div>
          <div class="comment-text">${c.text}</div>
          <div class="comment-date">${c.date}</div>
        </div>
      `).join('');
    }
    
    App.toast('Comment added!', 'success');
  },
  
  shareQR() {
    Player.currentSound = this.currentSound;
    Player.showQR();
  },
  
  goToMap() {
    App.navigate('map');
    setTimeout(() => {
      SoundMap.flyToSound(this.currentSound);
    }, 300);
  }
};
