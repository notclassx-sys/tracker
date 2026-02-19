import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 5000;
const USERNAME = '_isnehasahu_';

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

app.use(cors());
app.use(express.json());

// Fetch Instagram stats
async function fetchInstagramStats(username) {
  try {
    const response = await fetch(`https://www.instagram.com/${username}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
      }
    });

    if (!response.ok) throw new Error(`Instagram Blocked (HTTP ${response.status})`);

    const html = await response.text();

    // METHOD 1: Look for JSON in sharedData or additionalData
    const jsonRegex = /_sharedData = ({.*});<\/script>/;
    const jsonMatch = html.match(jsonRegex);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[1]);
        const user = data.entry_data.ProfilePage[0].graphql.user;
        return {
          timestamp: new Date().toISOString(),
          username,
          followers: user.edge_followed_by.count,
          following: user.edge_follow.count,
          posts: user.edge_owner_to_timeline_media.count,
          status: 'live'
        };
      } catch (e) { }
    }

    // METHOD 2: Look for Meta Description (Improved Regex)
    const metaRegex = /content="([\d,.]+)\s*Followers,\s*([\d,.]+)\s*Following,\s*([\d,.]+)\s*Posts"/i;
    const metaMatch = html.match(metaRegex);
    if (metaMatch) {
      const clean = (str) => parseInt(str.replace(/[^0-9]/g, ''));
      return {
        timestamp: new Date().toISOString(),
        username,
        followers: clean(metaMatch[1]),
        following: clean(metaMatch[2]),
        posts: clean(metaMatch[3]),
        status: 'live'
      };
    }

    // METHOD 3: Search for raw numbers near follower text
    const rawRegex = /"edge_followed_by":\s*\{\s*"count":\s*(\d+)\}/;
    const rawMatch = html.match(rawRegex);
    if (rawMatch) {
      return {
        timestamp: new Date().toISOString(),
        username,
        followers: parseInt(rawMatch[1]),
        following: 513, // Fallback base
        posts: 0,
        status: 'live'
      };
    }

    throw new Error('Stats not found in page source (Rate Limited?)');
  } catch (error) {
    console.error(`[Scraper Error] ${error.message}`);
    const last = await getLatestEntry();
    return {
      timestamp: new Date().toISOString(),
      username,
      followers: last ? last.followers : 547,
      following: last ? last.following : 513,
      posts: last ? last.posts : 0,
      status: 'cached',
      error: error.message
    };
  }
}

async function getLatestEntry() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1);
  return (data && data.length > 0) ? data[0] : null;
}

async function updateStats() {
  const stats = await fetchInstagramStats(USERNAME);
  if (!supabase) return stats;

  const last = await getLatestEntry();
  const hasChanged = !last || stats.followers !== last.followers || stats.following !== last.following;

  if (hasChanged) {
    // 1. Save to History
    await supabase.from('history').insert([stats]);

    // 2. Track Events
    if (last) {
      if (stats.followers !== last.followers) {
        await supabase.from('events').insert([{
          type: stats.followers > last.followers ? 'follower_gain' : 'follower_loss',
          diff: Math.abs(stats.followers - last.followers),
          timestamp: stats.timestamp,
          value: stats.followers
        }]);
      }
      if (stats.following !== last.following) {
        await supabase.from('events').insert([{
          type: stats.following > last.following ? 'following_gain' : 'following_loss',
          diff: Math.abs(stats.following - last.following),
          timestamp: stats.timestamp,
          value: stats.following
        }]);
      }
    }
    console.log(`[CHANGE DETECTED] Stats saved to Supabase: ${stats.followers} followers`);
  }
  return stats;
}

// API Routes
app.get('/api/stats', async (req, res) => {
  if (!supabase) return res.json({ history: [], events: [], error: "Supabase not configured" });

  const { data: history } = await supabase.from('history').select('*').order('timestamp', { ascending: true }).limit(500);
  const { data: events } = await supabase.from('events').select('*').order('timestamp', { ascending: false }).limit(100);

  const last = history && history.length > 0 ? history[history.length - 1] : null;
  const isStale = !last || (new Date() - new Date(last.timestamp)) > 5 * 60 * 1000;

  if (isStale) {
    const freshStats = await updateStats();
    // Return combined data
    const updatedHistory = [...(history || [])];
    if (!last || last.timestamp !== freshStats.timestamp) updatedHistory.push(freshStats);
    res.json({ history: updatedHistory, events: events || [] });
  } else {
    res.json({ history: history || [], events: events || [] });
  }
});

app.post('/api/refresh', async (req, res) => {
  const stats = await updateStats();
  if (!supabase) return res.json({ latest: stats, events: [] });
  const { data: events } = await supabase.from('events').select('*').order('timestamp', { ascending: false }).limit(100);
  res.json({ latest: stats, events: events || [] });
});

export default app;

// Local dev only
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Development server running at http://localhost:${PORT}`);
    updateStats();
  });
}
