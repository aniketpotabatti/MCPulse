'use client';

import { useState } from 'react';
import { HealthSnapshot } from '@/lib/types';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolListProps {
  snapshot?: HealthSnapshot | null;
  className?: string;
}

export function ToolList({ snapshot, className }: ToolListProps) {
  const [expanded, setExpanded] = useState(false);

  const tools = snapshot?.tool_names ?? [];
  const count = snapshot?.tool_count ?? tools.length;

  if (!snapshot || !snapshot.is_online) {
    return (
      <div className={cn('text-[#8b949e] text-sm flex items-center gap-2', className)}>
        <Wrench className="size-3.5 shrink-0 opacity-50" />
        No tool data available
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 text-sm font-medium text-[#e6edf3] hover:text-[#39d353] transition-colors w-full text-left"
      >
        <Wrench className="size-3.5 text-[#39d353] shrink-0" />
        <span>{count} tool{count !== 1 ? 's' : ''} available</span>
        {tools.length > 0 && (
          expanded
            ? <ChevronDown className="size-3.5 ml-auto opacity-60" />
            : <ChevronRight className="size-3.5 ml-auto opacity-60" />
        )}
      </button>

      {expanded && tools.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5 animate-fade-in">
          {tools.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 text-xs text-[#8b949e] bg-white/[0.03] rounded-md px-2.5 py-1.5 border border-white/[0.06] font-mono"
            >
              <span className="size-1 rounded-full bg-[#39d353]/60 shrink-0" />
              {name}
            </div>
          ))}
        </div>
      )}

      {expanded && tools.length === 0 && (
        <p className="text-xs text-[#8b949e] pl-5">Tool names not recorded</p>
      )}
    </div>
  );
}
