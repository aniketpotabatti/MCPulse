'use client';

import { HealthSnapshot, MCPServer } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ServerStatus = 'online' | 'offline' | 'degraded' | 'unknown';

export function getServerStatus(snapshot?: HealthSnapshot | null): ServerStatus {
  if (!snapshot) return 'unknown';
  if (!snapshot.is_online) return 'offline';
  if (!snapshot.handshake_ok || !snapshot.ping_ok) return 'degraded';
  return 'online';
}

interface StatusBadgeProps {
  status: ServerStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG = {
  online: {
    label: 'Online',
    dot: 'bg-[#39d353] pulse-online',
    badge: 'bg-[#39d353]/10 text-[#39d353] border-[#39d353]/30',
  },
  offline: {
    label: 'Offline',
    dot: 'bg-[#f85149] pulse-offline',
    badge: 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/30',
  },
  degraded: {
    label: 'Degraded',
    dot: 'bg-[#e3b341] pulse-degraded',
    badge: 'bg-[#e3b341]/10 text-[#e3b341] border-[#e3b341]/30',
  },
  unknown: {
    label: 'Unknown',
    dot: 'bg-[#8b949e]',
    badge: 'bg-[#8b949e]/10 text-[#8b949e] border-[#8b949e]/30',
  },
};

const SIZE_MAP = {
  sm: { badge: 'text-xs px-2 py-0.5', dot: 'size-1.5' },
  md: { badge: 'text-xs px-2.5 py-1',  dot: 'size-2' },
  lg: { badge: 'text-sm px-3 py-1.5',  dot: 'size-2.5' },
};

export function StatusBadge({
  status,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const sz = SIZE_MAP[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        cfg.badge,
        sz.badge,
        className
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', cfg.dot, sz.dot)} />
      )}
      {cfg.label}
    </span>
  );
}
