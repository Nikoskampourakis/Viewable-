import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { AppSettings, ThemeType, AccentColor, FontSize } from '../../types/index.ts';
import {
  X,
  Palette,
  Shield,
  Sliders,
  Database,
  Lock,
  Download,
  Upload,
  AlertTriangle,
  KeyRound,
  EyeOff,
  Trash2,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    settings,
    updateSettings,
    setIsPanicModalOpen,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'appearance' | 'content' | 'byo' | 'algorithm' | 'privacy'>('appearance');

  // Form states for BYO session cookies
  const [authToken, setAuthToken] = useState(settings.byoCookies.authToken);
  const [ct0, setCt0] = useState(settings.byoCookies.ct0);
  const [xBearer, setXBearer] = useState(() => localStorage.getItem('viewable_x_bearer_token') || '');

  // 18+ confirmation gate modal state
  const [showAgeGateModal, setShowAgeGateModal] = useState(false);

  if (!isSettingsOpen) return null;

  const handleSaveCookies = () => {
    updateSettings({
      byoCookies: { authToken: authToken.trim(), ct0: ct0.trim() },
    });
    if (xBearer.trim()) {
      localStorage.setItem('viewable_x_bearer_token', xBearer.trim());
    } else {
      localStorage.removeItem('viewable_x_bearer_token');
    }
    showToast('Credentials saved locally on device', 'success');
  };

  const handleToggleSensitive = () => {
    if (settings.blurSensitive) {
      // User is attempting to UNBLUR sensitive media -> enforce 18+ age gate
      if (!settings.ageVerified18Plus) {
        setShowAgeGateModal(true);
        return;
      }
      updateSettings({ blurSensitive: false });
    } else {
      updateSettings({ blurSensitive: true });
    }
  };

  const confirm18Plus = () => {
    updateSettings({
      ageVerified18Plus: true,
      blurSensitive: false,
    });
    setShowAgeGateModal(false);
    showToast('18+ confirmed: Sensitive media unblurred', 'info');
  };

  const exportConfigJSON = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `viewable-settings-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Config exported successfully', 'success');
  };

  const importConfigJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        updateSettings(imported);
        showToast('Settings imported successfully', 'success');
      } catch {
        showToast('Invalid settings JSON format', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={() => setIsSettingsOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl relative overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button
            onClick={() => setIsSettingsOpen(false)}
            className="text-neutral-400 hover:text-white p-1 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-neutral-800 text-xs font-semibold overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'appearance', label: 'Appearance', icon: Palette },
              { id: 'content', label: 'Content & Safety', icon: EyeOff },
              { id: 'byo', label: 'BYO Session & Keys', icon: KeyRound },
              { id: 'algorithm', label: 'Algorithm Tuning', icon: Sliders },
              { id: 'privacy', label: 'Privacy & Storage', icon: Shield },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-3 px-4 whitespace-nowrap transition border-b-2 ${
                  activeTab === t.id
                    ? 'border-sky-500 text-white font-bold bg-neutral-900/40'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. Appearance */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Theme Picker */}
              <div>
                <label className="text-neutral-300 font-bold block mb-2">Display Theme</label>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'dark', label: 'Default Dark', bg: 'bg-black text-white border-neutral-700' },
                      { id: 'dim', label: 'Dim (Navy)', bg: 'bg-[#15202b] text-[#f7f9f9] border-neutral-700' },
                      { id: 'light', label: 'Light', bg: 'bg-white text-black border-neutral-300' },
                    ] as const
                  ).map((themeOpt) => (
                    <button
                      key={themeOpt.id}
                      onClick={() => updateSettings({ theme: themeOpt.id as ThemeType })}
                      className={`p-3 rounded-xl border text-center font-bold text-xs transition ${themeOpt.bg} ${
                        settings.theme === themeOpt.id ? 'ring-2 ring-sky-500 shadow-lg' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {themeOpt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="text-neutral-300 font-bold block mb-2">Accent Color</label>
                <div className="flex gap-4">
                  {(
                    [
                      { id: 'blue', color: 'bg-sky-500' },
                      { id: 'yellow', color: 'bg-yellow-500' },
                      { id: 'pink', color: 'bg-pink-500' },
                      { id: 'purple', color: 'bg-purple-500' },
                      { id: 'orange', color: 'bg-orange-500' },
                      { id: 'green', color: 'bg-emerald-500' },
                    ] as const
                  ).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => updateSettings({ accent: c.id as AccentColor })}
                      className={`w-8 h-8 rounded-full ${c.color} flex items-center justify-center transition ${
                        settings.accent === c.id ? 'ring-4 ring-white/30 scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <label className="text-neutral-300 font-bold block mb-2">Font Size</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['small', 'medium', 'large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => updateSettings({ fontSize: size as FontSize })}
                      className={`p-2.5 rounded-xl border capitalize font-semibold transition ${
                        settings.fontSize === size
                          ? 'border-sky-500 bg-sky-500/10 text-white'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. Content & Safety */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Blur Sensitive Media</h4>
                    <p className="text-neutral-400 text-xs mt-0.5">
                      Blurs potentially explicit media behind a click-to-reveal barrier.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.blurSensitive}
                    onChange={handleToggleSensitive}
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                  />
                </div>
                {!settings.blurSensitive && (
                  <p className="text-[11px] text-amber-400 flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Sensitive media is set to show automatically without blur.</span>
                  </p>
                )}
              </div>

              {/* Muted Words */}
              <div className="space-y-2">
                <h4 className="font-bold text-white text-sm">Muted Words & Hashtags</h4>
                <p className="text-neutral-400 text-xs">
                  Posts containing these terms will be hidden from your feed on-device.
                </p>
                <div className="flex gap-2">
                  <input
                    id="new-mute-input"
                    type="text"
                    placeholder="Enter word or hashtag..."
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value.trim().toLowerCase();
                        if (val && !settings.mutedWords.includes(val)) {
                          updateSettings({ mutedWords: [...settings.mutedWords, val] });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {settings.mutedWords.map((word) => (
                    <span
                      key={word}
                      className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300 flex items-center gap-1.5"
                    >
                      <span>{word}</span>
                      <button
                        onClick={() =>
                          updateSettings({
                            mutedWords: settings.mutedWords.filter((w) => w !== word),
                          })
                        }
                        className="text-neutral-500 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {settings.mutedWords.length === 0 && (
                    <p className="text-neutral-500 text-xs">No muted words configured.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. BYO Session & Keys */}
          {activeTab === 'byo' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-800 text-sky-200 leading-relaxed text-xs">
                <strong>🔒 Privacy Assurance:</strong> These session cookies and developer credentials are saved
                <strong> exclusively in your local browser storage</strong>. They are sent per-request in secure proxy
                headers and are <em>never logged or saved on the backend server</em>.
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-white text-sm">X User Session Cookies (Optional)</h4>
                <p className="text-neutral-400 leading-relaxed text-xs">
                  Supplying cookies unlocks full-text search, user timelines, and age-restricted posts that unauthenticated endpoints cannot view.
                </p>

                <div className="space-y-1">
                  <label className="text-neutral-400 font-semibold block">auth_token cookie</label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="e.g. 1a2b3c4d5e6f..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-neutral-400 font-semibold block">ct0 cookie (CSRF)</label>
                  <input
                    type="password"
                    value={ct0}
                    onChange={(e) => setCt0(e.target.value)}
                    placeholder="e.g. 987654321fedcba..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800 space-y-2">
                <h4 className="font-bold text-white text-sm">X Developer App Bearer Token (For Posting)</h4>
                <p className="text-neutral-400 leading-relaxed text-xs">
                  Required to publish tweets via the Compose box using your own Twitter developer portal free-tier app.
                </p>
                <input
                  type="password"
                  value={xBearer}
                  onChange={(e) => setXBearer(e.target.value)}
                  placeholder="Bearer AAAAAAAAAAAAAAAAAAAAA..."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                onClick={handleSaveCookies}
                className="w-full py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-bold transition"
              >
                Save Credentials Locally
              </button>
            </div>
          )}

          {/* 4. Algorithm Tuning */}
          {activeTab === 'algorithm' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <h4 className="font-bold text-white text-sm mb-1">On-Device "For You" Formula</h4>
                <code className="text-sky-400 font-mono text-[11px] block overflow-x-auto pb-1">
                  score = w1·recency + w2·affinity + w3·velocity + w4·diversity - w5·repetition
                </code>
                <p className="text-neutral-400 text-xs mt-2">
                  Adjust the sliders below to calibrate your personal feed. All calculations occur locally in real time.
                </p>
              </div>

              {/* Sliders */}
              <div className="space-y-4">
                {[
                  { key: 'recency', label: 'w1: Recency Decay (Prioritize latest posts)', val: settings.rankingWeights.recency },
                  { key: 'affinity', label: 'w2: Topic & Author Affinity (Followed accounts)', val: settings.rankingWeights.affinity },
                  { key: 'velocity', label: 'w3: Engagement Velocity (Likes & retweets)', val: settings.rankingWeights.velocity },
                  { key: 'diversity', label: 'w4: Source Diversity Bonus (Fresh creators)', val: settings.rankingWeights.diversity },
                  { key: 'repetition', label: 'w5: Repetition Penalty (Downgrade viewed posts)', val: settings.rankingWeights.repetition },
                ].map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-300 font-medium">{item.label}</span>
                      <span className="font-mono text-sky-400 font-bold">{Math.round(item.val * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={item.val}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateSettings({
                          rankingWeights: {
                            ...settings.rankingWeights,
                            [item.key]: val,
                          },
                        });
                      }}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. Privacy & Storage */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {/* Emergency Panic Button */}
              <div className="p-4 rounded-xl border border-rose-900/60 bg-rose-950/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Shield className="w-4 h-4" />
                  <span>Emergency Panic Purge</span>
                </div>
                <p className="text-neutral-300 leading-relaxed text-xs">
                  Immediately obliterates all client-side history, cookies, bookmarks, caches, and session credentials.
                </p>
                <button
                  onClick={() => setIsPanicModalOpen(true)}
                  className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Launch Panic Purge (Shift+P)</span>
                </button>
              </div>

              {/* Import / Export Config */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-white text-sm">Export & Import Configuration</h4>
                <div className="flex gap-3">
                  <button
                    onClick={exportConfigJSON}
                    className="flex-1 py-2.5 px-4 rounded-full border border-neutral-700 hover:bg-neutral-900 text-neutral-300 font-semibold flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export JSON</span>
                  </button>
                  <label className="flex-1 py-2.5 px-4 rounded-full border border-neutral-700 hover:bg-neutral-900 text-neutral-300 font-semibold flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4" />
                    <span>Import JSON</span>
                    <input type="file" accept=".json" onChange={importConfigJSON} className="hidden" />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 18+ Age Verification Modal */}
      {showAgeGateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-150">
          <div className="max-w-sm rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Age Verification Required (18+)</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              Unblurring sensitive media requires confirming you are 18 years of age or older. This choice is stored solely in your local browser preferences.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAgeGateModal(false)}
                className="flex-1 py-2 rounded-full border border-neutral-700 text-xs font-semibold text-neutral-300"
              >
                Cancel
              </button>
              <button
                onClick={confirm18Plus}
                className="flex-1 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white"
              >
                I Am 18+
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
