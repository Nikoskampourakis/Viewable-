import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import {
  Bell,
  Eye,
  Plus,
  Trash2,
  CheckCheck,
  RefreshCw,
  Clock,
  Sparkles,
} from 'lucide-react';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    markNotificationsAsRead,
    settings,
    updateSettings,
    navigate,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist'>('alerts');
  const [newAccount, setNewAccount] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [isPolling, setIsPolling] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAccount.replace(/^@/, '').trim().toLowerCase();
    if (!clean) return;
    if (settings.watchlist.accounts.includes(clean)) {
      showToast('Account is already on your watchlist', 'info');
      return;
    }
    updateSettings({
      watchlist: {
        ...settings.watchlist,
        accounts: [...settings.watchlist.accounts, clean],
      },
    });
    setNewAccount('');
    showToast(`Watching @${clean}`, 'success');
  };

  const handleRemoveAccount = (username: string) => {
    updateSettings({
      watchlist: {
        ...settings.watchlist,
        accounts: settings.watchlist.accounts.filter((u) => u !== username),
      },
    });
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newKeyword.trim().toLowerCase();
    if (!clean) return;
    if (settings.watchlist.keywords.includes(clean)) {
      showToast('Keyword is already on your watchlist', 'info');
      return;
    }
    updateSettings({
      watchlist: {
        ...settings.watchlist,
        keywords: [...settings.watchlist.keywords, clean],
      },
    });
    setNewKeyword('');
    showToast(`Tracking "${clean}"`, 'success');
  };

  const handleRemoveKeyword = (kw: string) => {
    updateSettings({
      watchlist: {
        ...settings.watchlist,
        keywords: settings.watchlist.keywords.filter((k) => k !== kw),
      },
    });
  };

  const triggerPollCheck = async () => {
    setIsPolling(true);
    try {
      const res = await fetch('/api/cron/poll');
      const data = await res.json();
      showToast(`Poller checked: ${data.notificationsSent || 0} updates found`, 'info');
    } catch {
      showToast('Poller run completed', 'info');
    } finally {
      setIsPolling(false);
    }
  };

  const togglePushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast('Web Push is not supported in this browser environment', 'error');
      return;
    }

    try {
      if (!pushEnabled) {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showToast('Notification permission was denied', 'error');
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const keyRes = await fetch('/api/push/vapid-key');
        const { publicKey } = await keyRes.json();

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });

        // Send to backend
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...subscription.toJSON(),
            watchedAccounts: settings.watchlist.accounts,
            watchedKeywords: settings.watchlist.keywords,
            lastCheckedTweetIds: {},
          }),
        });

        setPushEnabled(true);
        showToast('Web Push notifications enabled!', 'success');
      } else {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
        }
        setPushEnabled(false);
        showToast('Web Push disabled', 'info');
      }
    } catch (err: any) {
      showToast(`Push error: ${err.message}`, 'error');
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Notifications</h2>
        <div className="flex items-center gap-2">
          {activeTab === 'alerts' && (
            <button
              onClick={markNotificationsAsRead}
              className="text-xs font-semibold text-neutral-400 hover:text-white flex items-center gap-1 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}
          <button
            onClick={triggerPollCheck}
            disabled={isPolling}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
            title="Poll watched accounts now"
          >
            <RefreshCw className={`w-4 h-4 ${isPolling ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex-1 py-3 text-center transition relative ${
            activeTab === 'alerts' ? 'text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span>All Alerts</span>
          {activeTab === 'alerts' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-sky-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('watchlist')}
          className={`flex-1 py-3 text-center transition relative ${
            activeTab === 'watchlist' ? 'text-white font-bold' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <span>Watchlist & Keywords</span>
          {activeTab === 'watchlist' && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-sky-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Alerts */}
      {activeTab === 'alerts' && (
        <div className="divide-y divide-neutral-800">
          {/* Push Notifications banner */}
          <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-sky-400" />
              <div>
                <p className="text-xs font-bold text-white">Browser Web Push</p>
                <p className="text-[11px] text-neutral-400">Receive alerts even when tab is closed</p>
              </div>
            </div>
            <button
              onClick={togglePushNotifications}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                pushEnabled
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-white'
              }`}
            >
              {pushEnabled ? 'Enabled' : 'Enable Push'}
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-neutral-500">
              No recent notifications. Add accounts to your Watchlist to receive alerts.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => item.tweetId && navigate('tweet', { tweetId: item.tweetId })}
                className={`p-4 flex gap-3 hover:bg-neutral-900/30 transition cursor-pointer ${
                  !item.read ? 'bg-sky-500/5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 line-clamp-2">{item.body}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Watchlist & Keywords */}
      {activeTab === 'watchlist' && (
        <div className="p-4 space-y-6">
          {/* Watched Accounts */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-400" />
              <span>Watched Accounts</span>
            </h3>
            <p className="text-xs text-neutral-400">
              The backend poller and client timer will periodically check these creators for new posts.
            </p>

            <form onSubmit={handleAddAccount} className="flex gap-2">
              <input
                type="text"
                value={newAccount}
                onChange={(e) => setNewAccount(e.target.value)}
                placeholder="Enter handle (e.g. elonmusk, nasa)..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-1">
              {settings.watchlist.accounts.map((user) => (
                <div
                  key={user}
                  className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 flex items-center gap-2 text-xs text-neutral-200"
                >
                  <span
                    onClick={() => navigate('profile', { username: user })}
                    className="hover:underline cursor-pointer font-medium"
                  >
                    @{user}
                  </span>
                  <button
                    onClick={() => handleRemoveAccount(user)}
                    className="text-neutral-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {settings.watchlist.accounts.length === 0 && (
                <p className="text-xs text-neutral-500">No accounts watched yet.</p>
              )}
            </div>
          </div>

          {/* Watched Keywords */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Keywords & Topics</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Posts containing these keywords will receive an affinity boost in your feed.
            </p>

            <form onSubmit={handleAddKeyword} className="flex gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Enter keyword (e.g. AI, Space, OpenSource)..."
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>

            <div className="flex flex-wrap gap-2 pt-1">
              {settings.watchlist.keywords.map((kw) => (
                <div
                  key={kw}
                  className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 flex items-center gap-2 text-xs text-neutral-200"
                >
                  <span className="font-medium">{kw}</span>
                  <button
                    onClick={() => handleRemoveKeyword(kw)}
                    className="text-neutral-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {settings.watchlist.keywords.length === 0 && (
                <p className="text-xs text-neutral-500">No keywords tracked yet.</p>
              )}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="pt-4 border-t border-neutral-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span className="text-sm font-semibold text-white">Quiet Hours (22:00 - 08:00)</span>
              </div>
              <input
                type="checkbox"
                checked={settings.quietHours.enabled}
                onChange={(e) =>
                  updateSettings({
                    quietHours: { ...settings.quietHours, enabled: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
              />
            </div>
            <p className="text-xs text-neutral-400">
              Mutes all push and notification sounds during overnight hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
