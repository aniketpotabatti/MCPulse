'use client';

import { useServerContext } from '@/lib/sse';
import Link from 'next/link';
import { Activity, Plus, Wifi, WifiOff } from 'lucide-react';
import { AddServerDialog } from './AddServerDialog';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { sseConnected, servers } = useServerContext();

  const onlineCount = servers.filter((s) => s.enabled).length;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0d1117]/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex items-center justify-center size-8 rounded-lg bg-[#39d353]/10 border border-[#39d353]/20 group-hover:bg-[#39d353]/20 transition-colors">
            <Activity className="size-4 text-[#39d353]" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#e6edf3]">
            MCP{' '}
            <span className="text-[#39d353]">Monitor</span>
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* SSE connection indicator */}
          <div
            className={cn(
              'hidden sm:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border',
              sseConnected
                ? 'text-[#39d353] bg-[#39d353]/10 border-[#39d353]/20'
                : 'text-[#8b949e] bg-[#8b949e]/10 border-[#8b949e]/20'
            )}
          >
            {sseConnected ? (
              <Wifi className="size-3" />
            ) : (
              <WifiOff className="size-3" />
            )}
            {sseConnected ? 'Live' : 'Reconnecting…'}
          </div>

          {/* Server count */}
          {servers.length > 0 && (
            <span className="hidden sm:inline text-xs text-[#8b949e]">
              {onlineCount}/{servers.length} enabled
            </span>
          )}

          {/* Add server */}
          <AddServerDialog
            trigger={
              <button className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#39d353] hover:bg-[#39d353]/90 text-[#0d1117] text-sm font-semibold transition-colors">
                <Plus className="size-3.5" />
                Add Server
              </button>
            }
          />
        </div>
      </div>
    </header>
  );
}
