'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { HealthSnapshot, ServerWithLatestHealth } from '@/lib/types';
import { getServerStatus, StatusBadge } from '@/components/StatusBadge';
import { MetricChart } from '@/components/MetricChart';
import { ToolList } from '@/components/ToolList';
import { useServerContext } from '@/lib/sse';
import {
  ArrowLeft,
  Clock,
  Play,
  Power,
  RefreshCw,
  Server as ServerIcon,
  Terminal,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { latestSnapshots } = useServerContext();

  const [server, setServer] = useState<ServerWithLatestHealth | null>(null);
  const [history, setHistory] = useState<HealthSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [probing, setProbing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'latency' | 'error_rate'>('latency');

  const fetchServerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getServerById(resolvedParams.id);
      setServer(data);

      const histData = await api.getServerHistory(resolvedParams.id, 100);
      setHistory(histData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch server details');
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchServerDetails();
  }, [fetchServerDetails]);

  // Handle manual probe
  const handleProbeNow = async () => {
    try {
      setProbing(true);
      const newSnap = await api.probeServer(resolvedParams.id);
      setServer((prev) => (prev ? { ...prev, latest_snapshot: newSnap } : prev));
      setHistory((prev) => Array.isArray(prev) ? [newSnap, ...prev] : [newSnap]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to probe server');
    } finally {
      setProbing(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to unregister this server?')) return;
    try {
      await api.deleteServer(resolvedParams.id);
      router.push('/');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  // Merge live SSE snapshot updates
  const liveSnap = latestSnapshots[resolvedParams.id];
  const activeSnapshot = liveSnap || server?.latest_snapshot;
  const status = getServerStatus(activeSnapshot);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="h-8 w-32 skeleton" />
        <div className="mt-6 h-48 rounded-xl skeleton" />
        <div className="mt-6 h-80 rounded-xl skeleton" />
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3]"
        >
          <ArrowLeft className="size-3.5" /> Back to Dashboard
        </Link>
        <div className="mt-6 rounded-xl border border-[#f85149]/20 bg-[#f85149]/10 p-6 text-sm text-[#f85149]">
          {error || 'Server not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8b949e] hover:text-[#e6edf3] transition-colors"
      >
        <ArrowLeft className="size-3.5" /> Back to Dashboard
      </Link>

      {/* Header Info Banner */}
      <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            {server.transport === 'sse' ? (
              <ServerIcon className="size-6 text-[#1f6feb]" />
            ) : (
              <Terminal className="size-6 text-[#e3b341]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#e6edf3]">{server.name}</h1>
              <StatusBadge status={status} size="lg" />
            </div>
            <p className="mt-1 text-xs font-mono text-[#8b949e]">
              ID: {server.id}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#8b949e]">
              <span className="uppercase font-mono text-[10px] px-2 py-0.5 rounded bg-white/[0.06] text-[#c9d1d9]">
                {server.transport}
              </span>
              <span>•</span>
              <span className="font-mono text-[#c9d1d9]">
                {server.transport === 'sse' ? server.url : server.command}
              </span>
              <span>•</span>
              <span>Interval: {server.check_interval}s</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchServerDetails}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-medium text-[#8b949e] hover:bg-white/[0.08] hover:text-[#e6edf3]"
          >
            <RefreshCw className="size-3.5" />
            Refresh
          </button>
          <button
            onClick={handleProbeNow}
            disabled={probing}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#39d353]/30 bg-[#39d353]/10 px-3 text-xs font-medium text-[#39d353] hover:bg-[#39d353]/20 disabled:opacity-50"
          >
            <Play className={`size-3.5 ${probing ? 'animate-spin' : ''}`} />
            Probe Now
          </button>
          <button
            onClick={handleDelete}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#f85149]/30 bg-[#f85149]/10 px-3 text-xs font-medium text-[#f85149] hover:bg-[#f85149]/20"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Metrics & Analytics Dashboard Panel */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Time-Series Charts (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-[#39d353]" />
                <h3 className="text-sm font-semibold text-[#e6edf3]">
                  {chartType === 'latency' ? 'Response Latency (ms)' : 'Error Rate (%)'}
                </h3>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1 text-xs">
                <button
                  onClick={() => setChartType('latency')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartType === 'latency'
                      ? 'bg-[#39d353] text-[#0d1117]'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  Latency
                </button>
                <button
                  onClick={() => setChartType('error_rate')}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    chartType === 'error_rate'
                      ? 'bg-[#f85149] text-[#e6edf3]'
                      : 'text-[#8b949e] hover:text-[#e6edf3]'
                  }`}
                >
                  Error Rate
                </button>
              </div>
            </div>

            <div className="mt-4">
              <MetricChart snapshots={history} type={chartType} height={260} />
            </div>
          </div>

          {/* Historical Snapshots Table */}
          <div className="rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-[#1f6feb]" />
                <h3 className="text-sm font-semibold text-[#e6edf3]">
                  Probe Audit History (Last {history.length})
                </h3>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] text-[#8b949e]">
                  <tr>
                    <th className="pb-3 font-medium">Timestamp</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Latency</th>
                    <th className="pb-3 font-medium">Tools</th>
                    <th className="pb-3 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {(Array.isArray(history) ? history : []).slice(0, 15).map((snap) => (
                    <tr key={snap.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-mono text-[#c9d1d9]">
                        {format(parseISO(snap.checked_at), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="py-2.5">
                        <StatusBadge
                          status={getServerStatus(snap)}
                          size="sm"
                        />
                      </td>
                      <td className="py-2.5 font-mono text-[#e6edf3]">
                        {snap.latency_ms != null ? `${Math.round(snap.latency_ms)} ms` : '—'}
                      </td>
                      <td className="py-2.5 font-mono text-[#39d353]">
                        {snap.tool_count != null ? snap.tool_count : '—'}
                      </td>
                      <td className="py-2.5 max-w-[200px] truncate text-[#8b949e]">
                        {snap.error_message || 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Tool Catalog & Config Panel (Right 1 col) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-5">
            <div className="flex items-center gap-2 border-b border-white/[0.06] pb-4">
              <Wrench className="size-4 text-[#39d353]" />
              <h3 className="text-sm font-semibold text-[#e6edf3]">
                Tool Registry Catalog
              </h3>
            </div>
            <div className="mt-4">
              <ToolList snapshot={activeSnapshot} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
