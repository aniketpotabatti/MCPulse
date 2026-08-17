'use client';

import { useServerContext } from '@/lib/sse';

export function useSSE() {
  const { latestSnapshots, sseConnected } = useServerContext();
  return { latestSnapshots, sseConnected };
}
