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

app.use(express.static(path.join(__dirname, 'public')));

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
