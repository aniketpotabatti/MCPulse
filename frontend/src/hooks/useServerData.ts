'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MCPServer, ServerWithLatestHealth } from '@/lib/types';
import { useServerContext } from '@/lib/sse';

export function useServerData() {
  const { setServers, latestSnapshots } = useServerContext();
  const [servers, setLocalServers] = useState<ServerWithLatestHealth[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const rawServers = await api.getServers();
      setServers(rawServers);

      // Combine servers with latest snapshot from server detail fetch or SSE context
      const detailedServers = await Promise.all(
        rawServers.map(async (srv) => {
          try {
            const detail = await api.getServerById(srv.id);
            return detail;
          } catch {
            return srv as ServerWithLatestHealth;
          }
        })
      );

      setLocalServers(detailedServers);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  }, [setServers]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Merge live SSE snapshot updates into local state
  const mergedServers = servers.map((srv) => {
    const liveSnap = latestSnapshots[srv.id];
    if (liveSnap) {
      return { ...srv, latest_snapshot: liveSnap };
    }
    return srv;
  });

  return {
    servers: mergedServers,
    loading,
    error,
    refresh: fetchServers,
  };
}
