'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ServerWithLatestHealth } from '@/lib/types';
import { getServerStatus, StatusBadge } from './StatusBadge';
import { ToolList } from './ToolList';
import { api } from '@/lib/api';
import {
  Activity,
  AlertCircle,
  Clock,
  ExternalLink,
  Play,
  Power,
  Server as ServerIcon,
  Terminal,
  Wrench,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ServerCardProps {
  server: ServerWithLatestHealth;
  onRefresh?: () => void;
}

export function ServerCard({ server, onRefresh }: ServerCardProps) {
  const [probing, setProbing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const snapshot = server.latest_snapshot;
  const status = getServerStatus(snapshot);

  const handleProbeNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setProbing(true);
      await api.probeServer(server.id);
      if (onRefresh) onRefresh();
    } catch {
      // Toast / error handled by parent
    } finally {
      setProbing(false);
    }
  };

  const handleToggleEnabled = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      setToggling(true);
      await api.updateServer(server.id, { enabled: !server.enabled });
      if (onRefresh) onRefresh();
    } catch {
      // Handle error
    } finally {
      setToggling(false);
    }
  };

  const lastCheckedText = snapshot?.checked_at
    ? formatDistanceToNow(parseISO(snapshot.checked_at), { addSuffix: true })
    : 'Never';

  return (
    <div
      className={cn(
        'group relative flex flex-col justify-between rounded-xl border bg-[#161b22]/90 p-5 transition-all hover:border-[#39d353]/30 hover:shadow-lg hover:shadow-[#39d353]/5',
        !server.enabled && 'opacity-60 grayscale-[40%]'
      )}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
              {server.transport === 'sse' ? (
                <ServerIcon className="size-4 text-[#1f6feb]" />
              ) : (
                <Terminal className="size-4 text-[#e3b341]" />
              )}
            </div>
            <div className="truncate">
              <h3 className="truncate text-base font-semibold text-[#e6edf3]">
                {server.name}
              </h3>
              <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-[#c9d1d9]">
                  {server.transport}
                </span>
                <span className="truncate max-w-[180px]">
                  {server.transport === 'sse' ? server.url : server.command}
                </span>
              </div>
            </div>
          </div>

          <StatusBadge status={server.enabled ? status : 'unknown'} />
        </div>

        {/* Metrics Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <div>
            <span className="text-[11px] font-medium text-[#8b949e]">Latency</span>
            <p className="mt-0.5 text-sm font-semibold font-mono text-[#e6edf3]">
              {snapshot?.latency_ms != null
                ? `${Math.round(snapshot.latency_ms)} ms`
                : '—'}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#8b949e]">Tools</span>
            <p className="mt-0.5 text-sm font-semibold font-mono text-[#39d353]">
              {snapshot?.tool_count != null ? snapshot.tool_count : '—'}
            </p>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#8b949e]">Handshake</span>
            <p className="mt-0.5 text-xs font-semibold font-mono text-[#e6edf3]">
              {snapshot?.handshake_ok ? (
                <span className="text-[#39d353]">OK</span>
              ) : (
                <span className="text-[#f85149]">FAIL</span>
              )}
            </p>
          </div>
        </div>

        {/* Error message banner if failing */}
        {snapshot && !snapshot.is_online && snapshot.error_message && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#f85149]/20 bg-[#f85149]/10 p-2.5 text-xs text-[#f85149]">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span className="line-clamp-2 font-mono">{snapshot.error_message}</span>
          </div>
        )}

        {/* Expandable tool list preview */}
        <div className="mt-3">
          <ToolList snapshot={snapshot} />
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs text-[#8b949e]">
        <div className="flex items-center gap-1.5">
          <Clock className="size-3.5" />
          <span>{lastCheckedText}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleEnabled}
            disabled={toggling}
            title={server.enabled ? 'Disable polling' : 'Enable polling'}
            className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] text-[#8b949e] hover:bg-white/[0.08] hover:text-[#e6edf3] transition-colors"
          >
            <Power className={cn('size-3.5', server.enabled && 'text-[#39d353]')} />
          </button>

          <button
            onClick={handleProbeNow}
            disabled={probing || !server.enabled}
            title="Trigger instant probe"
            className="flex h-7 items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 text-[#8b949e] hover:bg-white/[0.08] hover:text-[#39d353] transition-colors disabled:opacity-40"
          >
            <Play className={cn('size-3', probing && 'animate-spin')} />
            <span>Probe</span>
          </button>

          <Link
            href={`/servers/${server.id}`}
            className="flex h-7 items-center gap-1 rounded-md border border-[#39d353]/30 bg-[#39d353]/10 px-2.5 font-medium text-[#39d353] hover:bg-[#39d353]/20 transition-colors"
          >
            <span>Details</span>
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
