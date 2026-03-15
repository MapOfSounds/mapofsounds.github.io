// ============================================
// MapOfSounds — Tags Module v3.0
// ============================================
// Updated card rendering to match new design

const Tags = {
  selectedTag: null,
  
  init() {
    this.renderCloud();
  },
  
  renderCloud() {
    const stats = API.getTagStats();
    const container = document.getElementById('tags-cloud');
    if (!container) return;
    
    const maxCount = Math.max(...stats.map(s => s.count), 1);
    
    container.innerHTML = stats.map(({ tag, count }) => {
      const info = CONFIG.ALL_TAGS.find(t => t.id === tag);
      const emoji = info ? info.emoji : '🏷️';
      const size = count >= maxCount * 0.7 ? 'size-lg' : count >= maxCount * 0.3 ? 'size-md' : 'size-sm';
      const active = this.selectedTag === tag ? 'active' : '';
      
      return `<button class="tag-cloud-item ${size} ${active}" onclick="Tags.selectTag('${tag}')">${emoji} ${tag} (${count})</button>`;
    }).join('');
    
    // Tags without sounds
    CONFIG.ALL_TAGS.forEach(t => {
      if (!stats.find(s => s.tag === t.id)) {
        container.innerHTML += `<button class="tag-cloud-item size-sm" onclick="Tags.selectTag('${t.id}')">${t.emoji} ${t.id} (0)</button>`;
      }
    });
  },
  
  async selectTag(tag) {
    this.selectedTag = this.selectedTag === tag ? null : tag;
    
    document.querySelectorAll('.tag-cloud-item').forEach(el => {
      el.classList.toggle('active', el.textContent.includes(tag) && this.selectedTag === tag);
    });
    
    const resultsContainer = document.getElementById('tags-results');
    
    if (!this.selectedTag) {
      resultsContainer.innerHTML = '';
      return;
    }
    
    const sounds = await API.getSoundsByTag(this.selectedTag);
    
    if (sounds.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🏷️</span>
          <p>No sounds with tag "${tag}"</p>
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = sounds.map(s => {
      const tagsHtml = s.tags.slice(0, 3).map(t => {
        const info = CONFIG.ALL_TAGS.find(ti => ti.id === t);
        return `<span class="tag-chip">${info ? info.emoji + ' ' : ''}${t}</span>`;
      }).join('');
      
      const liked = Player._getLiked();
      const isLiked = liked.includes(s.id);
      
      return `
        <div class="sound-card" onclick="App.navigate('sound/${s.id}')" style="--card-accent: var(--accent)">
          <div class="sound-card-accent"></div>
          <div class="sound-card-header">
            <div class="sound-card-title-group">
              <span class="sound-card-emoji">${SoundMap._getMarkerEmoji(s.tags)}</span>
              <span class="sound-card-title">${s.title}</span>
            </div>
            <div class="sound-card-actions">
              <button class="sound-card-like ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); Search.toggleLike('${s.id}')">${isLiked ? '❤️' : '🤍'}</button>
              <button class="sound-card-play" onclick="event.stopPropagation(); Player.play(API._localSounds.find(ss=>ss.id==='${s.id}'))">▶</button>
            </div>
          </div>
          <div class="sound-card-tags">${tagsHtml}</div>
          <div class="sound-card-meta">
            <span>📍 ${s.lat.toFixed(1)}, ${s.lng.toFixed(1)}</span>
            <span>▶ ${(s.plays || 0).toLocaleString()}</span>
            <span>❤️ ${s.likes || 0}</span>
          </div>
        </div>
      `;
    }).join('');
  }
};
