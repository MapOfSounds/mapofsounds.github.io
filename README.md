# 🗺️ MapOfSounds — Frontend

> Discover, record, and share sounds from around the world on an interactive map.

![MapOfSounds](https://img.shields.io/badge/MapOfSounds-Live-00d4aa?style=for-the-badge)
![GitHub Pages](https://img.shields.io/badge/Frontend-GitHub%20Pages-blue?style=flat-square)

**Backend:** [MapOfSounds-Worker] ____NOT OPEN____

---

## ✨ Features

### Core
- 🌍 **Interactive Sound Map** — Browse sounds on a Mapbox 3D globe with filters
- ⬆️ **Upload Sounds** — Record or upload audio files with location & tags
- 🔊 **Audio Player** — WaveSurfer.js waveform player with progress & volume
- 🔍 **Search** — Full-text search with sort (newest, popular, liked, trending)
- 🏷️ **Tag System** — Browse by category (nature, city, water, transport, etc.)
- 🎲 **Random Sound** — One-click discovery
- 📍 **Nearby Sounds** — GPS-based sound discovery

### Advanced
- 🎛️ **Ambient Mix** — Blend up to 6 sounds with individual volume sliders
- 🧭 **Sound Journeys** — Auto-playing travel routes across the map
- 💬 **Comments** — Discuss sounds
- ❤️ **Likes** — Like your favorites
- 📱 **QR Codes** — Share sounds via QR code
- 🎙️ **Direct Recording** — Record audio in-browser
- 🌙☀️ **Dark/Light Theme** — System-aware toggle
- ⌨️ **Keyboard Shortcuts** — Space (play), R (random), / (search), Esc (close)

---

## 🏗️ Architecture (v2)

```
User ─→ GitHub Pages (this repo)
           │
           │  fetch /config (Mapbox token)
           │  fetch /list, /upload, /search ...
           ▼
        Cloudflare Worker  ← MapOfSounds-Worker repo
           │
           ▼
        Cloudflare R2 (audio files + metadata)
```

**Key change in v2:** The Mapbox access token is stored as a **Cloudflare Worker secret** and served via `GET /config`. The frontend fetches it at startup — **no tokens in source code**.

---

## 📁 Project Structure

```
MapOfSounds/
├── index.html          ← SPA shell (all pages)
├── css/style.css       ← Dark/light theme, responsive design
├── js/
│   ├── config.js       ← Runtime config (token fetched from Worker)
│   ├── api.js          ← API client + localStorage fallback
│   ├── app.js          ← Main controller, routing, theme, keyboard
│   ├── map.js          ← Mapbox globe map, markers, popups
│   ├── player.js       ← WaveSurfer.js global audio player
│   ├── upload.js       ← Drag-drop upload + mic recording
│   ├── search.js       ← Search & sort module
│   ├── sound.js        ← Sound detail page with comments
│   ├── tags.js         ← Tag cloud browser
│   ├── mix.js          ← Ambient mix board (6 channels)
│   └── journey.js      ← Sound journey player
├── README.md
└── .gitignore
```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `R` | Random sound |
| `/` | Focus search |
| `Esc` | Close modals |

## 🛠️ Tech Stack

- **Map**: Mapbox GL JS v3 (globe projection)
- **Audio**: WaveSurfer.js v7
- **QR**: QRCode.js
- **Frontend**: Vanilla HTML/CSS/JS — no framework
- **Fonts**: Inter + JetBrains Mono

---

## 📄 License

MIT — Feel free to use, modify, and share!

Made with 🎧 by MapOfSounds
