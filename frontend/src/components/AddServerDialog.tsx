'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { TransportType } from '@/lib/types';
import { useServerContext } from '@/lib/sse';
import { Plus, X } from 'lucide-react';

interface AddServerDialogProps {
  trigger?: React.ReactNode;
  onAdded?: () => void;
}

export function AddServerDialog({ trigger, onAdded }: AddServerDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<TransportType>('sse');
  const [url, setUrl] = useState('');
  const [command, setCommand] = useState('');
  const [argsStr, setArgsStr] = useState('');
  const [checkInterval, setCheckInterval] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const args = argsStr
        ? argsStr.split(' ').map((a) => a.trim()).filter(Boolean)
        : undefined;

      await api.createServer({
        name,
        transport,
        url: transport === 'sse' ? url : undefined,
        command: transport === 'stdio' ? command : undefined,
        args: transport === 'stdio' ? args : undefined,
        check_interval: Number(checkInterval),
        enabled: true,
      });

      setOpen(false);
      // Reset form
      setName('');
      setUrl('');
      setCommand('');
      setArgsStr('');
      setCheckInterval(30);

      if (onAdded) onAdded();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to register server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#39d353] hover:bg-[#39d353]/90 text-[#0d1117] text-sm font-semibold transition-colors"
        >
          <Plus className="size-3.5" />
          Add Server
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#161b22] p-6 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-[#8b949e] hover:text-[#e6edf3]"
            >
              <X className="size-4" />
            </button>

            <h2 className="text-lg font-semibold text-[#e6edf3]">
              Register MCP Server
            </h2>
            <p className="mt-1 text-xs text-[#8b949e]">
              Add an MCP server endpoint for real-time observability.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-[#f85149]/20 bg-[#f85149]/10 p-3 text-xs text-[#f85149]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Server Name */}
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9]">
                  Server Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Store MCP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#39d353] focus:outline-none"
                />
              </div>

              {/* Transport Type */}
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9]">
                  Transport Protocol
                </label>
                <div className="mt-1.5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransport('sse')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      transport === 'sse'
                        ? 'border-[#39d353] bg-[#39d353]/10 text-[#39d353]'
                        : 'border-white/10 bg-white/[0.04] text-[#8b949e] hover:text-[#e6edf3]'
                    }`}
                  >
                    SSE (Remote HTTP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransport('stdio')}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                      transport === 'stdio'
                        ? 'border-[#39d353] bg-[#39d353]/10 text-[#39d353]'
                        : 'border-white/10 bg-white/[0.04] text-[#8b949e] hover:text-[#e6edf3]'
                    }`}
                  >
                    STDIO (Local Subprocess)
                  </button>
                </div>
              </div>

              {/* URL or Command depending on transport */}
              {transport === 'sse' ? (
                <div>
                  <label className="block text-xs font-medium text-[#c9d1d9]">
                    Server SSE URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="http://localhost:8001/sse"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#39d353] focus:outline-none"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#c9d1d9]">
                      Command Binary
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="npx or python"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#39d353] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#c9d1d9]">
                      Arguments (space-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="-y @modelcontextprotocol/server-memory"
                      value={argsStr}
                      onChange={(e) => setArgsStr(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#e6edf3] placeholder-[#8b949e] focus:border-[#39d353] focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Check Interval */}
              <div>
                <label className="block text-xs font-medium text-[#c9d1d9]">
                  Check Interval (Seconds)
                </label>
                <input
                  type="number"
                  min={5}
                  max={3600}
                  required
                  value={checkInterval}
                  onChange={(e) => setCheckInterval(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-[#e6edf3] focus:border-[#39d353] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-[#39d353] px-4 py-2 text-xs font-semibold text-[#0d1117] hover:bg-[#39d353]/90 disabled:opacity-50"
                >
                  {loading ? 'Registering...' : 'Register Server'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
