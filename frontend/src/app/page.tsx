'use client';

import { useState } from 'react';
import { useServerData } from '@/hooks/useServerData';
import { ServerCard } from '@/components/ServerCard';
import { AddServerDialog } from '@/components/AddServerDialog';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Filter,
  RefreshCw,
  Search,
  Server as ServerIcon,
  Zap,
} from 'lucide-react';
import { getServerStatus } from '@/components/StatusBadge';

export default function Home() {
  const { servers, loading, error, refresh } = useServerData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Compute aggregate stats
  const totalServers = servers.length;
  const onlineServers = servers.filter(
    (s) => getServerStatus(s.latest_snapshot) === 'online'
  ).length;
  const offlineServers = servers.filter(
    (s) => getServerStatus(s.latest_snapshot) === 'offline'
  ).length;

  const validLatencies = servers
    .map((s) => s.latest_snapshot?.latency_ms)
    .filter((l): l is number => l != null && l > 0);

  const avgLatency = validLatencies.length
    ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
    : 0;

  // Filtered servers
  const filteredServers = servers.filter((srv) => {
    const matchesSearch = srv.name.toLowerCase().includes(search.toLowerCase());
    const status = getServerStatus(srv.latest_snapshot);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'online' && status === 'online') ||
      (filterStatus === 'offline' && status === 'offline') ||
      (filterStatus === 'degraded' && status === 'degraded');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Servers */}
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#1f6feb]/10 text-[#1f6feb]">
            <ServerIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8b949e]">Total Monitored</p>
            <p className="text-xl font-bold font-mono text-[#e6edf3]">
              {loading ? '—' : totalServers}
            </p>
          </div>
        </div>

        {/* Online */}
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#39d353]/10 text-[#39d353]">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8b949e]">Healthy & Online</p>
            <p className="text-xl font-bold font-mono text-[#39d353]">
              {loading ? '—' : onlineServers}
            </p>
          </div>
        </div>

        {/* Offline */}
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#f85149]/10 text-[#f85149]">
            <AlertTriangle className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8b949e]">Offline / Failing</p>
            <p className="text-xl font-bold font-mono text-[#f85149]">
              {loading ? '—' : offlineServers}
            </p>
          </div>
        </div>

        {/* Avg Latency */}
        <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#161b22]/90 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-[#e3b341]/10 text-[#e3b341]">
            <Zap className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#8b949e]">Avg Latency</p>
            <p className="text-xl font-bold font-mono text-[#e6edf3]">
              {loading ? '—' : `${avgLatency} ms`}
            </p>
          </div>
        </div>
      </div>

      {/* Filter / Search & Control Bar */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-[#e6edf3]">MCP Servers</h2>
          <button
            onClick={refresh}
            title="Refresh Server List"
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-[#8b949e] hover:bg-white/[0.08] hover:text-[#e6edf3]"
          >
            <RefreshCw className="size-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 sm:w-64 sm:flex-none">
            <Search className="absolute left-3 top-2.5 size-4 text-[#8b949e]" />
            <input
              type="text"
              placeholder="Search servers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] pl-9 pr-3 py-1.5 text-xs text-[#e6edf3] placeholder-[#8b949e] focus:border-[#39d353] focus:outline-none"
            />
          </div>

          {/* Filter select */}
          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-[#8b949e]">
            <Filter className="size-3.5" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-[#e6edf3] focus:outline-none"
            >
              <option value="all" className="bg-[#161b22]">All Statuses</option>
              <option value="online" className="bg-[#161b22]">Online Only</option>
              <option value="offline" className="bg-[#161b22]">Offline Only</option>
              <option value="degraded" className="bg-[#161b22]">Degraded Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mt-6 rounded-xl border border-[#f85149]/20 bg-[#f85149]/10 p-4 text-sm text-[#f85149]">
          Failed to load servers: {error}. Make sure the backend server is running on <code>http://localhost:8000</code>.
        </div>
      )}

      {/* Grid Content */}
      <div className="mt-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-xl border border-white/[0.06] bg-[#161b22] p-5 skeleton" />
            ))}
          </div>
        ) : filteredServers.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredServers.map((server) => (
              <ServerCard key={server.id} server={server} onRefresh={refresh} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white/[0.04]">
              <Activity className="size-6 text-[#8b949e]" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#e6edf3]">No servers found</h3>
            <p className="mt-1 text-xs text-[#8b949e] max-w-sm">
              {search || filterStatus !== 'all'
                ? 'No MCP servers match your current search and filter criteria.'
                : 'Get started by adding your first MCP server for observability and health monitoring.'}
            </p>
            <div className="mt-6">
              <AddServerDialog onAdded={refresh} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
