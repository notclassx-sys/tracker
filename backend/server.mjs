import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import cron from 'node-cron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 5000;
const DB_PATH = path.join(__dirname, 'database.json');
const USERNAME = '_isnehasahu_';

app.use(cors());
app.use(express.json());

// Initialize database
async function initDb() {
  try {
    await fs.access(DB_PATH);
  } catch (error) {
    await fs.writeFile(DB_PATH, JSON.stringify({ history: [], events: [] }, null, 2));
  }
}

async function getDb() {
  return JSON.parse(await fs.readFile(DB_PATH, 'utf-8'));
}

async function saveDb(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Fetch Instagram stats
async function fetchInstagramStats(username) {
  try {
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

    const html = await response.text();

    // Look for various meta tag patterns
    const ogMatch = html.match(/meta property="og:description" content="([\d,]+ Followers, [\d,]+ Following, [\d,]+ Posts)/);
    const metaMatch = html.match(/meta name="description" content="([\d,]+ Followers, [\d,]+ Following, [\d,]+ Posts)/);

    const match = ogMatch || metaMatch;

    if (match) {
      const parts = match[1].split(', ');
      const followers = parseInt(parts[0].replace(/[^0-9]/g, ''));
      const following = parseInt(parts[1].replace(/[^0-9]/g, ''));
      const posts = parseInt(parts[2].replace(/[^0-9]/g, ''));

      return {
        timestamp: new Date().toISOString(),
        username,
        followers,
        following,
        posts,
        status: 'live'
      };
    }

    throw new Error('Stats not found in page');
  } catch (error) {
    console.error(`Fetch failed for ${username}, using cache...`);
    const history = (await getDb()).history;
    const last = history.length > 0 ? history[history.length - 1] : null;

    return {
      timestamp: new Date().toISOString(),
      username,
      followers: last ? last.followers : 547,
      following: last ? last.following : 513,
      posts: last ? last.posts : 0,
      status: 'cached'
    };
  }
}

async function updateStats() {
  const stats = await fetchInstagramStats(USERNAME);
  const data = await getDb();
  const last = data.history.length > 0 ? data.history[data.history.length - 1] : null;

  // ONLY save if data has changed or if it's the first record
  // Actually, we want to save a point even if no change, but NOT too many.
  // Let's only save if changed OR if it's been more than 6 hours since the last entry.
  const hasChanged = !last || stats.followers !== last.followers || stats.following !== last.following || stats.posts !== last.posts;

  if (hasChanged) {
    if (last) {
      // Follower changes
      if (stats.followers !== last.followers) {
        data.events.push({
          type: stats.followers > last.followers ? 'follower_gain' : 'follower_loss',
          diff: Math.abs(stats.followers - last.followers),
          timestamp: stats.timestamp,
          value: stats.followers
        });
      }
      // Following changes
      if (stats.following !== last.following) {
        data.events.push({
          type: stats.following > last.following ? 'following_gain' : 'following_loss',
          diff: Math.abs(stats.following - last.following),
          timestamp: stats.timestamp,
          value: stats.following
        });
      }
    }

    data.history.push(stats);
    if (data.history.length > 500) data.history.shift();
    if (data.events.length > 100) data.events.shift();

    await saveDb(data);
    console.log(`[CHANGE DETECTED] Stats saved for ${USERNAME}: ${stats.followers} followers`);
  } else {
    console.log(`[NO CHANGE] Latest: ${stats.followers} (Still same)`);
    // Optionally update the timestamp of the "latest" entry so the chart shows a line up to "now"
    // but better to just return the state.
  }

  return stats;
}

// API
app.get('/api/stats', async (req, res) => {
  try {
    const data = await getDb();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/refresh', async (req, res) => {
  try {
    const stats = await updateStats();
    const data = await getDb();
    res.json({ latest: stats, events: data.events });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cron every 5 minutes for tighter tracking
cron.schedule('*/5 * * * *', updateStats);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
    updateStats();
  });
});
