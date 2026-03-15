// ============================================
// MapOfSounds — Search Module v4.0
// ============================================
// Sub-tabs: Results, Tags, Favorites
// Enhanced sound cards with location and gradient

const Search = {
  currentSort: 'newest',
  lastQuery: '',
  activeSubTab: 'results',
  
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

  /** Switch between Results, Tags, and Favorites sub-tabs */
  showSubTab(tab) {
    this.activeSubTab = tab;

    // Update sub-tab buttons
    document.querySelectorAll('#page-search .sub-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === tab);
    });

    // Toggle panels
    const panels = ['search-results-panel', 'search-tags-panel', 'search-favorites-panel'];
    panels.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !id.includes(tab === 'results' ? 'results' : tab === 'tags' ? 'tags' : 'favorites'));
    });

    // Sort controls only for results
    const sortControls = document.getElementById('search-sort-controls');
    if (sortControls) sortControls.classList.toggle('hidden', tab !== 'results');

    // Search bar only for results
    const searchBar = document.querySelector('#page-search .search-bar-lg');
    if (searchBar) searchBar.style.display = tab === 'favorites' ? 'none' : '';

    if (tab === 'tags') {
      Tags.renderCloud();
    } else if (tab === 'favorites') {
      this.renderFavorites();
    }
  },
  
  async doSearch() {
    const query = document.getElementById('search-input')?.value?.trim() || '';
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
      case 'popular': results.sort((a, b) => (b.plays || 0) - (a.plays || 0)); break;
      case 'liked': results.sort((a, b) => (b.likes || 0) - (a.likes || 0)); break;
      case 'newest': results.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
      case 'trending': results.sort((a, b) => ((b.plays||0) + (b.likes||0)*3) - ((a.plays||0) + (a.likes||0)*3)); break;
    }
  },
  
  renderResults(sounds) {
    const container = document.getElementById('search-results');
    if (!container) return;
    
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
  
  async renderFavorites() {
    const container = document.getElementById('favorites-list');
    if (!container) return;
    
    const likedIds = Player._getLiked();
    
    if (likedIds.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">❤️</span>
          <p>No favorites yet. Like sounds to see them here!</p>
        </div>
      `;
      return;
    }
    
    const allSounds = await API.listSounds();
    const favorites = allSounds.filter(s => likedIds.includes(s.id));
    
    if (favorites.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">❤️</span>
          <p>Your favorites will appear here</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="favorites-header">
        <span class="favorites-count">${favorites.length} favorite${favorites.length !== 1 ? 's' : ''}</span>
      </div>
      ${favorites.map(s => this._renderCard(s, true)).join('')}
    `;
  },
  
  _renderCard(sound, isFavorite = false) {
    const tagsHtml = sound.tags.slice(0, 3).map(t => {
      const info = CONFIG.ALL_TAGS.find(ti => ti.id === t);
      return `<span class="tag-chip">${info ? info.emoji + ' ' : ''}${t}</span>`;
    }).join('');
    
    const liked = Player._getLiked();
    const isLiked = liked.includes(sound.id);
    
    // Color accent based on primary tag
    const tagColors = {
      nature: '#22c55e', city: '#6366f1', water: '#3b82f6', transport: '#f59e0b',
      people: '#ec4899', music: '#8b5cf6', weather: '#64748b', animals: '#10b981',
      cafe: '#d97706', night: '#1e293b', morning: '#fb923c', ocean: '#0ea5e9',
      forest: '#16a34a', rain: '#94a3b8', wind: '#a1a1aa', traffic: '#ef4444',
      market: '#f97316', park: '#22c55e', river: '#06b6d4', industrial: '#78716c'
    };
    const accentColor = tagColors[sound.tags[0]] || '#00d4aa';
    
    return `
      <div class="sound-card" onclick="App.navigate('sound/${sound.id}')" style="--card-accent: ${accentColor}">
        <div class="sound-card-accent"></div>
        <div class="sound-card-header">
          <div class="sound-card-title-group">
            <span class="sound-card-emoji">${SoundMap._getMarkerEmoji(sound.tags)}</span>
            <span class="sound-card-title">${sound.title}</span>
          </div>
          <div class="sound-card-actions">
            <button class="sound-card-like ${isLiked ? 'liked' : ''}" onclick="event.stopPropagation(); Search.toggleLike('${sound.id}')" title="${isLiked ? 'Unlike' : 'Like'}">
              ${isLiked ? '❤️' : '🤍'}
            </button>
            <button class="sound-card-play" onclick="event.stopPropagation(); Player.play(API._localSounds.find(s=>s.id==='${sound.id}'))">▶</button>
          </div>
        </div>
        ${sound.description ? `<p class="sound-card-desc">${sound.description.substring(0, 80)}${sound.description.length > 80 ? '...' : ''}</p>` : ''}
        <div class="sound-card-tags">${tagsHtml}</div>
        <div class="sound-card-meta">
          <span>📍 ${sound.lat.toFixed(1)}, ${sound.lng.toFixed(1)}</span>
          <span>▶ ${(sound.plays || 0).toLocaleString()}</span>
          <span>❤️ ${sound.likes || 0}</span>
        </div>
      </div>
    `;
  },
  
  async toggleLike(id) {
    const liked = Player._getLiked();
    const index = liked.indexOf(id);
    
    if (index >= 0) {
      liked.splice(index, 1);
      App.toast('Removed from favorites', 'info');
    } else {
      liked.push(id);
      await API.likeSound(id);
      App.toast('❤️ Added to favorites!', 'success');
    }
    
    localStorage.setItem('mos_liked', JSON.stringify(liked));
    
    // Refresh current view
    if (this.activeSubTab === 'favorites') {
      this.renderFavorites();
    } else {
      this.doSearch();
    }
  }
};
