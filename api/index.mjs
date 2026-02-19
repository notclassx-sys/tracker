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
const PORT = process.env.PORT || 5000;
const DB_PATH = path.join(__dirname, 'database.json');
const USERNAME = '_isnehasahu_';

app.use(cors());
app.use(express.json());

// Initialize database
async function initDb() {
  try {
    await fs.access(DB_PATH);
  } catch (error) {
    try {
      await fs.writeFile(DB_PATH, JSON.stringify({ history: [], events: [] }, null, 2));
    } catch (writeError) {
      console.warn('Database initialization failed (Read-only filesystem detected)');
    }
  }
}

async function getDb() {
  try {
    const content = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return { history: [], events: [] };
  }
}

async function saveDb(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Could not save to database (Vercel is read-only)');
  }
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
    const match = html.match(/meta property="og:description" content="([\d,]+ Followers, [\d,]+ Following, [\d,]+ Posts)/) ||
      html.match(/meta name="description" content="([\d,]+ Followers, [\d,]+ Following, [\d,]+ Posts)/);

    if (match) {
      const parts = match[1].split(', ');
      return {
        timestamp: new Date().toISOString(),
        username,
        followers: parseInt(parts[0].replace(/[^0-9]/g, '')),
        following: parseInt(parts[1].replace(/[^0-9]/g, '')),
        posts: parseInt(parts[2].replace(/[^0-9]/g, '')),
        status: 'live'
      };
    }
    throw new Error('Stats not found');
  } catch (error) {
    const data = await getDb();
    const last = data.history.length > 0 ? data.history[data.history.length - 1] : null;
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

  const hasChanged = !last || stats.followers !== last.followers || stats.following !== last.following;

  if (hasChanged) {
    if (last) {
      if (stats.followers !== last.followers) {
        data.events.push({
          type: stats.followers > last.followers ? 'follower_gain' : 'follower_loss',
          diff: Math.abs(stats.followers - last.followers),
          timestamp: stats.timestamp,
          value: stats.followers
        });
      }
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
  }
  return stats;
}

// API Routes
app.get('/api/stats', async (req, res) => {
  const data = await getDb();
  const last = data.history.length > 0 ? data.history[data.history.length - 1] : null;

  // Vercel only: Since cron doesn't run, we fetch on-demand if data is older than 5 mins
  const isStale = !last || (new Date() - new Date(last.timestamp)) > 5 * 60 * 1000;

  if (isStale) {
    console.log('Data stale, performing on-demand fetch...');
    const stats = await updateStats();
    // Re-read db (in case it worked) or just append the live stats to our local response
    if (data.history.length === 0 || data.history[data.history.length - 1].timestamp !== stats.timestamp) {
      data.history.push(stats);
    }
    res.json(data);
  } else {
    res.json(data);
  }
});

app.post('/api/refresh', async (req, res) => {
  const stats = await updateStats();
  const data = await getDb();
  res.json({ latest: stats, events: data.events });
});

// Cron (Only for permanent hosting, not Vercel)
if (process.env.NODE_ENV !== 'production' || process.env.RENDER) {
  cron.schedule('*/5 * * * *', updateStats);
}

// Export for Vercel
export default app;

// Local server startup
if (process.env.NODE_ENV !== 'production') {
  initDb().then(() => {
    app.listen(PORT, () => {
      console.log(`Development server: http://localhost:${PORT}`);
      updateStats();
    });
  });
}
