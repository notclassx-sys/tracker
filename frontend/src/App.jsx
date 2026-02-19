import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Image, RefreshCw, TrendingUp, Activity, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = '/api';

function App() {
  const [data, setData] = useState({ history: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_URL}/stats`);
      const result = await response.json();
      setData({
        history: result.history || [],
        events: result.events || []
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    try {
      await fetch(`${API_URL}/refresh`, { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Error refreshing stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const latest = data.history.length > 0 ? data.history[data.history.length - 1] : null;
  const isLive = latest && (new Date() - new Date(latest.timestamp)) < 15 * 60 * 1000; // Live if synced in last 15m

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
      <RefreshCw className="animate-spin" size={48} color="#f09433" />
    </div>
  );

  return (
    <div style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }} className="animate-fade-in">
        <div>
          <h1 className="title-gradient" style={{ fontSize: '2.5rem' }}>Instagram Activity</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#94a3b8' }}>
              <Users size={16} />
              <span>Tracking <span style={{ color: '#f8fafc', fontWeight: 600 }}>_isnehasahu_</span></span>
            </div>
            <div style={{ width: '1px', height: '14px', background: '#334155' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: isLive ? '#22c55e' : '#ef4444' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor', boxShadow: isLive ? '0 0 8px #22c55e' : 'none' }}></div>
              <span>{isLive ? 'Active Sync' : 'Offline'}</span>
            </div>
            <div style={{ width: '1px', height: '14px', background: '#334155' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: '#38bdf8' }}>
              <Activity size={16} />
              <span>Permanent History: ON</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <Clock size={12} />
              Last sync
            </div>
            <div style={{ color: '#f8fafc', fontWeight: 500 }}>{latest ? new Date(latest.timestamp).toLocaleTimeString() : '--:--'}</div>
          </div>
          <button
            onClick={refreshStats}
            disabled={refreshing}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #f09433 0%, #dc2743 100%)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(220, 39, 67, 0.3)'
            }}
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Syncing...' : 'Refresh Now'}
          </button>
        </div>
      </header>

      {latest && (
        <div className="stats-grid animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="glass-card stat-item">
            <Users size={24} color="#f09433" style={{ marginBottom: '12px' }} />
            <div className="stat-value">{latest.followers.toLocaleString()}</div>
            <div className="stat-label">Followers</div>
          </div>

          <div className="glass-card stat-item">
            <UserPlus size={24} color="#dc2743" style={{ marginBottom: '12px' }} />
            <div className="stat-value">{latest.following.toLocaleString()}</div>
            <div className="stat-label">Following</div>
          </div>

          <div className="glass-card stat-item">
            <Image size={24} color="#e6683c" style={{ marginBottom: '12px' }} />
            <div className="stat-value">{latest.posts}</div>
            <div className="stat-label">Posts</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '40px', marginTop: '40px' }}>
        <div className="glass-card animate-fade-in" style={{ height: '500px', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={20} color="#f09433" />
              Growth Chart (Followers)
            </h2>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Auto-Synced Every 5m</div>
          </div>
          <div style={{ width: '100%', height: '400px' }}>
            {data.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f09433" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f09433" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="timestamp"
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    tickFormatter={(time) => new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#f8fafc' }}
                    labelStyle={{ color: '#94a3b8' }}
                    labelFormatter={(t) => new Date(t).toLocaleString()}
                  />
                  <Area type="stepAfter" dataKey="followers" stroke="#f09433" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowers)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div style={{ textAlign: 'center', paddingTop: '100px', color: '#64748b' }}>No data recorded yet</div>}
          </div>
        </div>

        <div className="glass-card animate-fade-in" style={{ animationDelay: '0.3s', display: 'flex', flexDirection: 'column', height: '500px' }}>
          <h2 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Activity size={20} color="#dc2743" />
            24/7 Activity Log
          </h2>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
            {data.events.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', marginTop: '60px' }}>
                <Clock size={32} style={{ opacity: 0.3, marginBottom: '12px' }} /><br />
                Monitoring for changes...<br />
                (Checked every 5 minutes)
              </div>
            ) : (
              data.events.slice().reverse().map((event, idx) => (
                <div key={idx} style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px', alignItems: 'flex-start', background: idx === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                  <div style={{ background: event.type.includes('gain') ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '8px' }}>
                    {event.type.includes('gain') ? <ArrowUpRight color="#10b981" size={16} /> : <ArrowDownRight color="#ef4444" size={16} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: event.type.includes('gain') ? '#10b981' : '#ef4444' }}>
                      {event.type.includes('gain') ? '+' : '-'}{event.diff} {event.type.includes('follower') ? 'Follower' : 'Following'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                      {new Date(event.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                      Total now: {event.value}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <footer style={{ marginTop: '60px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }} className="animate-fade-in">
        <p>Premium Instagram Activity Tracker • 24/7 Auto-Monitoring Enabled</p>
      </footer>
    </div>
  );
}

export default App;
