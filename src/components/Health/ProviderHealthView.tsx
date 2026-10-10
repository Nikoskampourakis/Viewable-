import React, { useEffect, useState } from 'react';
import { ProviderHealth } from '../../types/index.ts';
import { Activity, ShieldCheck, AlertCircle, RefreshCw, Zap, Server } from 'lucide-react';
import { useToast } from '../../context/ToastContext.tsx';

export const ProviderHealthView: React.FC = () => {
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setProviders(data.providers || []);
    } catch {
      showToast('Could not reach health check endpoint', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-sky-400" />
            <span>Fallback Chain Health</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time status, circuit breakers, and latency across all 6 failsafe providers
          </p>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="p-2 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          title="Refresh Provider Status"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Grid of Providers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isOperational = p.status === 'operational';
          const isDegraded = p.status === 'degraded';
          const isDown = p.status === 'down';

          return (
            <div
              key={p.id}
              className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-neutral-800 text-neutral-300">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight">{p.name}</h4>
                    <span className="text-[11px] text-neutral-500 font-mono">Priority #{p.priority}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                    isOperational
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                      : isDegraded
                      ? 'bg-amber-950/60 text-amber-400 border-amber-800'
                      : 'bg-rose-950/60 text-rose-400 border-rose-800'
                  }`}
                >
                  {p.status}
                </span>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">Latency</span>
                  <span className="font-mono font-bold text-white">{p.latencyMs}ms</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Success</span>
                  <span className="font-mono font-bold text-emerald-400">{p.successRate}%</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">Circuit</span>
                  <span className="font-mono font-bold capitalize text-neutral-300">{p.circuitState}</span>
                </div>
              </div>

              {/* Error count if any */}
              {p.errorCount > 0 && (
                <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Errors: {p.errorCount} {p.lastError ? `(${p.lastError})` : ''}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Explanatory Architecture Note */}
      <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 text-xs text-neutral-400 leading-relaxed space-y-2">
        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-sky-400" />
          <span>How the Failsafe Fallback Chain Works</span>
        </h4>
        <p>
          1. <strong>Session Provider:</strong> Runs first if you supplied your own cookies (bypasses rate limits & age locks).<br />
          2. <strong>Guest GraphQL:</strong> Fetches unauthenticated public Twitter threads via rotating guest tokens.<br />
          3. <strong>Syndication CDN:</strong> Ultra-fast public embed mirrors providing complete tweet details.<br />
          4. <strong>Nitter Instances:</strong> Automatic failover rotation across an active pool of open-source instances.<br />
          5. <strong>Local LRU Cache:</strong> Serves previous representations when all live providers fail, marked with a cache banner.<br />
          6. <strong>Wayback Machine:</strong> Internet Archive snapshot lookup for deleted or censored posts.
        </p>
      </div>
    </div>
  );
};
