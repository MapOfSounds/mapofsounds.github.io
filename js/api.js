// ============================================
// MapOfSounds — API Client v2.0
// ============================================
// In DEMO_MODE, uses localStorage fallback.
// Otherwise hits the Cloudflare Worker backend.

const API = {
  baseUrl: CONFIG.API_URL,
  
  // Local storage fallback for demo mode
  _localSounds: null,
  
  init() {
    const stored = localStorage.getItem('mos_sounds');
    if (stored) {
      this._localSounds = JSON.parse(stored);
    } else {
      this._localSounds = this._generateDemoData();
      this._saveLocal();
    }
  },
  
  _saveLocal() {
    localStorage.setItem('mos_sounds', JSON.stringify(this._localSounds));
  },
  
  _generateDemoData() {
    return [
      {
        id: 'demo_1', title: 'Tokyo Shibuya Crossing',
        lat: 35.6595, lng: 139.7004,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Shibuya_Crossing.ogg',
        tags: ['city', 'people', 'transport'],
        description: 'The busiest pedestrian crossing in the world. Recorded during rush hour.',
        plays: 1247, likes: 89, date: '2025-12-01',
        comments: [{ author: 'Traveler', text: 'Amazing atmosphere!', date: '2025-12-05' }]
      },
      {
        id: 'demo_2', title: 'Amazon Rainforest Dawn',
        lat: -3.4653, lng: -62.2159,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Parus_major_-_song_1.ogg',
        tags: ['nature', 'animals', 'forest', 'morning'],
        description: 'Dawn chorus in the heart of the Amazon. Howler monkeys, toucans, and countless insects.',
        plays: 2341, likes: 201, date: '2025-11-15',
        comments: []
      },
      {
        id: 'demo_3', title: 'Paris Café',
        lat: 48.8566, lng: 2.3522,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Parus_major_-_song_1.ogg',
        tags: ['cafe', 'people', 'city'],
        description: 'A quiet morning at a Parisian café. Espresso machine, soft chatter, clinking cups.',
        plays: 856, likes: 124, date: '2025-10-20',
        comments: [{ author: 'CaféLover', text: 'I can almost smell the coffee!', date: '2025-10-25' }]
      },
      {
        id: 'demo_4', title: 'Norwegian Fjord Waves',
        lat: 61.2176, lng: 6.7280,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Motor_boat_%28Broads%29.ogg',
        tags: ['water', 'nature', 'ocean', 'wind'],
        description: 'Gentle waves lapping against ancient rocks in a Norwegian fjord.',
        plays: 1893, likes: 167, date: '2026-01-10',
        comments: []
      },
      {
        id: 'demo_5', title: 'Seoul Subway Line 2',
        lat: 37.5665, lng: 126.9780,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Shibuya_Crossing.ogg',
        tags: ['transport', 'city'],
        description: 'Announcement jingles and doors closing on Seoul Metro Line 2.',
        plays: 432, likes: 38, date: '2026-02-01',
        comments: []
      },
      {
        id: 'demo_6', title: 'Sahara Desert Wind',
        lat: 25.0000, lng: 10.0000,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Motor_boat_%28Broads%29.ogg',
        tags: ['wind', 'nature', 'weather'],
        description: 'Wind sweeping across sand dunes in the Sahara.',
        plays: 567, likes: 72, date: '2026-01-20',
        comments: []
      },
      {
        id: 'demo_7', title: 'NYC Times Square',
        lat: 40.7580, lng: -73.9855,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Shibuya_Crossing.ogg',
        tags: ['city', 'people', 'traffic', 'night'],
        description: 'The electric buzz of Times Square at night — car horns, street performers, crowds.',
        plays: 3452, likes: 298, date: '2025-09-15',
        comments: [
          { author: 'NYCFan', text: 'Love this energy!', date: '2025-09-20' },
          { author: 'SoundHunter', text: 'Great recording quality', date: '2025-09-22' }
        ]
      },
      {
        id: 'demo_8', title: 'Bali Temple Morning',
        lat: -8.3405, lng: 115.0920,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Parus_major_-_song_1.ogg',
        tags: ['nature', 'morning', 'music'],
        description: 'Gamelan music drifting from a temple at dawn, mixed with roosters and tropical birds.',
        plays: 1123, likes: 145, date: '2026-02-14',
        comments: []
      },
      {
        id: 'demo_9', title: 'London Underground',
        lat: 51.5074, lng: -0.1278,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Shibuya_Crossing.ogg',
        tags: ['transport', 'city', 'people'],
        description: '"Mind the gap!" — recorded at Westminster station.',
        plays: 789, likes: 56, date: '2026-03-01',
        comments: []
      },
      {
        id: 'demo_10', title: 'Iceland Waterfall',
        lat: 64.1466, lng: -21.9426,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Motor_boat_%28Broads%29.ogg',
        tags: ['water', 'nature'],
        description: 'The thundering roar of Gullfoss waterfall.',
        plays: 2056, likes: 234, date: '2025-08-30',
        comments: []
      },
      {
        id: 'demo_11', title: 'Marrakech Market',
        lat: 31.6295, lng: -7.9811,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Shibuya_Crossing.ogg',
        tags: ['market', 'people', 'city'],
        description: 'The vibrant sounds of Jemaa el-Fnaa square — storytellers, musicians, merchants.',
        plays: 678, likes: 88, date: '2026-01-05',
        comments: []
      },
      {
        id: 'demo_12', title: 'Australian Outback Night',
        lat: -25.2744, lng: 133.7751,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Parus_major_-_song_1.ogg',
        tags: ['nature', 'animals', 'night'],
        description: 'Crickets, distant dingoes, and the vast silence of the outback at night.',
        plays: 445, likes: 67, date: '2026-02-20',
        comments: []
      },
      {
        id: 'demo_13', title: 'Venice Canal',
        lat: 45.4408, lng: 12.3155,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Motor_boat_%28Broads%29.ogg',
        tags: ['water', 'city'],
        description: 'Water taxis, gondolier songs, and waves against ancient stone walls.',
        plays: 912, likes: 103, date: '2025-11-28',
        comments: []
      },
      {
        id: 'demo_14', title: 'Mumbai Monsoon Rain',
        lat: 19.0760, lng: 72.8777,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Motor_boat_%28Broads%29.ogg',
        tags: ['rain', 'weather', 'city'],
        description: 'Heavy monsoon rain hammering tin rooftops in Mumbai.',
        plays: 3210, likes: 412, date: '2025-07-15',
        comments: [{ author: 'RainLover', text: 'Perfect for sleeping', date: '2025-07-20' }]
      },
      {
        id: 'demo_15', title: 'Swiss Alps Cowbells',
        lat: 46.8182, lng: 8.2275,
        audio: 'https://upload.wikimedia.org/wikipedia/commons/4/49/Parus_major_-_song_1.ogg',
        tags: ['animals', 'nature', 'park'],
        description: 'Cowbells echoing across alpine meadows on a clear morning.',
        plays: 567, likes: 78, date: '2026-03-10',
        comments: []
      }
    ];
  },
  
  // ---- API Methods ----
  
  async listSounds() {
    if (CONFIG.DEMO_MODE) {
      return [...this._localSounds];
    }
    try {
      const res = await fetch(`${this.baseUrl}/list`);
      return await res.json();
    } catch (e) {
      console.warn('API unavailable, using local data');
      return [...this._localSounds];
    }
  },
  
  async getSound(id) {
    if (CONFIG.DEMO_MODE) {
      return this._localSounds.find(s => s.id === id) || null;
    }
    try {
      const res = await fetch(`${this.baseUrl}/sound/${id}`);
      return await res.json();
    } catch (e) {
      return this._localSounds.find(s => s.id === id) || null;
    }
  },
  
  async searchSounds(query) {
    const q = query.toLowerCase().trim();
    if (CONFIG.DEMO_MODE || !q) {
      return this._localSounds.filter(s =>
        s.title.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    try {
      const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      return await res.json();
    } catch (e) {
      return this._localSounds.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }
  },
  
  async uploadSound(formData) {
    if (CONFIG.DEMO_MODE) {
      // Simulate upload in demo mode
      const id = 'sound_' + Date.now();
      const audioFile = formData.get('audio');
      const audioUrl = audioFile ? URL.createObjectURL(audioFile) : '';
      const newSound = {
        id,
        title: formData.get('title'),
        description: formData.get('description') || '',
        lat: parseFloat(formData.get('lat')),
        lng: parseFloat(formData.get('lng')),
        audio: audioUrl,
        tags: JSON.parse(formData.get('tags') || '[]'),
        plays: 0,
        likes: 0,
        date: new Date().toISOString().split('T')[0],
        comments: []
      };
      this._localSounds.push(newSound);
      this._saveLocal();
      return newSound;
    }
    const res = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData
    });
    return await res.json();
  },
  
  async getRandomSound() {
    const sounds = await this.listSounds();
    if (sounds.length === 0) return null;
    return sounds[Math.floor(Math.random() * sounds.length)];
  },
  
  async getNearby(lat, lng, radiusKm = 5) {
    const sounds = await this.listSounds();
    return sounds.filter(s => {
      const dist = this._haversine(lat, lng, s.lat, s.lng);
      return dist <= radiusKm;
    }).sort((a, b) => {
      const da = this._haversine(lat, lng, a.lat, a.lng);
      const db = this._haversine(lat, lng, b.lat, b.lng);
      return da - db;
    });
  },
  
  async likeSound(id) {
    const sound = this._localSounds.find(s => s.id === id);
    if (sound) {
      sound.likes = (sound.likes || 0) + 1;
      this._saveLocal();
    }
    if (!CONFIG.DEMO_MODE) {
      try { await fetch(`${this.baseUrl}/sound/${id}/like`, { method: 'POST' }); } catch (e) {}
    }
    return sound;
  },
  
  async addComment(id, author, text) {
    const sound = this._localSounds.find(s => s.id === id);
    if (sound) {
      if (!sound.comments) sound.comments = [];
      sound.comments.push({
        author: author || 'Anonymous',
        text,
        date: new Date().toISOString().split('T')[0]
      });
      this._saveLocal();
    }
    if (!CONFIG.DEMO_MODE) {
      try {
        await fetch(`${this.baseUrl}/sound/${id}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ author, text })
        });
      } catch (e) {}
    }
    return sound;
  },
  
  async incrementPlays(id) {
    const sound = this._localSounds.find(s => s.id === id);
    if (sound) {
      sound.plays = (sound.plays || 0) + 1;
      this._saveLocal();
    }
  },
  
  async getSoundsByTag(tag) {
    const sounds = await this.listSounds();
    return sounds.filter(s => s.tags.includes(tag));
  },
  
  async getPopularSounds(sortBy = 'popular', limit = 20) {
    const sounds = await this.listSounds();
    switch (sortBy) {
      case 'popular': return sounds.sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, limit);
      case 'liked': return sounds.sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, limit);
      case 'newest': return sounds.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
      case 'trending': return sounds.sort((a, b) => ((b.plays || 0) + (b.likes || 0) * 3) - ((a.plays || 0) + (a.likes || 0) * 3)).slice(0, limit);
      default: return sounds.slice(0, limit);
    }
  },
  
  getTagStats() {
    const tagCounts = {};
    this._localSounds.forEach(s => {
      s.tags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  },
  
  // Haversine distance in km
  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
};
