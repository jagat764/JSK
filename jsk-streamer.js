// jsk-streamer.js (Node.js backend)
const express = require('express');
const axios = require('axios');
const https = require('https');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

let token = null;

async function getToken() {
  const res = await axios.get('https://api.redgifs.com/v2/auth/temporary');
  token = res.data.token;
}

async function searchRedgifs(query, page = 1) {
  if (!token) await getToken();
  const res = await axios.get('https://api.redgifs.com/v2/gifs/search', {
    headers: { Authorization: `Bearer ${token}` },
    params: { search_text: query, count: 20, page }
  });
  return res.data.gifs.map(v => ({
    video: v.urls.hd || v.urls.sd,
    thumbnail: v.urls.poster,
    title: v.title || ''
  }));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API route
app.get('/api/search', async (req, res) => {
  const q = req.query.q || 'milf';
  const page = parseInt(req.query.page) || 1;
  try {
    const results = await searchRedgifs(q, page);
    res.json(results);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: 'Failed to fetch RedGIFs' });
  }
});

// Proxy route for video and thumbnail
app.get('/proxy', (req, res) => {
  const url = req.query.url;
  const type = req.query.type || 'video';

  if (!url) return res.status(400).send('Missing URL.');

  const headers = {
    'Referer': 'https://redgifs.com/',
    'User-Agent': 'Mozilla/5.0'
  };

  res.setHeader('Content-Type', type === 'thumbnail' ? 'image/jpeg' : 'video/mp4');

  https.get(url, { headers }, stream => {
    stream.pipe(res);
  }).on('error', err => {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy fetch failed.');
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

/* public/index.html */
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>JSK Stream Gallery</title>
  <style>
    body { background: #121212; color: white; font-family: sans-serif; margin: 0; }
    h1 { text-align: center; color: #ff3c00; margin-top: 20px; }
    #gallery { max-width: 600px; margin: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
    .card { background: #222; border-radius: 10px; padding: 10px; text-align: center; }
    .card img { width: 100%; border-radius: 8px; }
    .card a {
      display: inline-block; margin-top: 10px; padding: 10px 20px;
      color: #ff3c00; border: 2px solid #ff3c00; border-radius: 6px;
      text-decoration: none; font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>JSK RedGIFs Viewer</h1>
  <div id="gallery"></div>

  <script>
    async function loadVideos() {
      const res = await fetch("/api/search?q=milf&page=1");
      const data = await res.json();
      const gallery = document.getElementById("gallery");

      data.forEach(v => {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = `/proxy?url=${encodeURIComponent(v.thumbnail)}&type=thumbnail`;

        const link = document.createElement("a");
        link.href = `player.html?video=${encodeURIComponent(v.video)}&poster=${encodeURIComponent(v.thumbnail)}`;
        link.textContent = "▶ Play";

        card.appendChild(img);
        card.appendChild(link);
        gallery.appendChild(card);
      });
    }

    loadVideos();
  </script>
</body>
</html>

/* public/player.html */
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>JSK Player</title>
  <style>
    body { background: #000; margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
    video { max-width: 100%; max-height: 90vh; border: 4px solid #ff3c00; border-radius: 10px; }
    h1 { color: white; }
  </style>
</head>
<body>
  <video id="player" controls autoplay muted playsinline></video>

  <script>
    const params = new URLSearchParams(location.search);
    const src = params.get("video");
    const poster = params.get("poster");
    const player = document.getElementById("player");

    if (src) {
      player.src = `/proxy?url=${encodeURIComponent(src)}&type=video`;
      if (poster) {
        player.poster = `/proxy?url=${encodeURIComponent(poster)}&type=thumbnail`;
      }
    } else {
      document.body.innerHTML = "<h1>No video URL provided.</h1>";
    }
  </script>
</body>
</html>
