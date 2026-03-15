// ============================================
// MapOfSounds — Search Module v2.0
// ============================================

const Search = {
  currentSort: 'newest',
  lastQuery: '',
  
  init() {
    const input = document.getElementById('search-input');
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.doSearch();
      });
      
      // Live search with debounce
      let debounceTimer;
      input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.doSearch(), 300);
      });
    }
  },
  
  async doSearch() {
    const query = document.getElementById('search-input').value.trim();
    this.lastQuery = query;
    
    let results;
    if (query) {
      results = await API.searchSounds(query);
    } else {
      results = await API.getPopularSounds(this.currentSort);
    }
    
    this._sortResults(results);
    this.renderResults(results);
  },
  
  sort(sortBy) {
    this.currentSort = sortBy;
    
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sort === sortBy);
    });
    
    this.doSearch();
  },
  
  _sortResults(results) {
    switch (this.currentSort) {
      case 'popular':
        results.sort((a, b) => (b.plays || 0) - (a.plays || 0));
        break;
      case 'liked':
        results.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'newest':
        results.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'trending':
        results.sort((a, b) => ((b.plays || 0) + (b.likes || 0) * 3) - ((a.plays || 0) + (a.likes || 0) * 3));
        break;
    }
  },
  
  renderResults(sounds) {
    const container = document.getElementById('search-results');
    
    if (!sounds || sounds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔇</span>
          <p>No sounds found${this.lastQuery ? ` for "${this.lastQuery}"` : ''}</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = sounds.map(s => this._renderCard(s)).join('');
  },
  
  _renderCard(sound) {
    const tagInfo = CONFIG.ALL_TAGS.find(t => sound.tags.includes(t.id));
    const tagsHtml = sound.tags.slice(0, 3).map(t => `<span class="tag-chip">${t}</span>`).join('');
    
    return `
      <div class="sound-card" onclick="App.navigate('sound/${sound.id}')">
        <div class="sound-card-header">
          <span class="sound-card-title">${sound.title}</span>
          <button class="sound-card-play" onclick="event.stopPropagation(); Player.play(API._localSounds.find(s=>s.id==='${sound.id}'))">▶</button>
        </div>
        <div class="sound-card-tags">${tagsHtml}</div>
        <div class="sound-card-meta">
          <span>▶ ${sound.plays || 0}</span>
          <span>❤️ ${sound.likes || 0}</span>
          <span>📅 ${sound.date || ''}</span>
        </div>
      </div>
    `;
  }
};
