'use client';

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, User, Server, Cpu, ZoomIn } from 'lucide-react';
import { getWorkspaceFromLocalStorage } from '@qwery/shared/workspace';

type StatusBarProps = {
  zoom: number;
};

export function StatusBar({ zoom }: StatusBarProps) {
  const [connection, setConnection] = useState<'connected' | 'disconnected'>('connected');
  const [userLabel, setUserLabel] = useState<string>('Anonymous');

  const updateUserLabel = () => {
    const workspace = getWorkspaceFromLocalStorage();
    setUserLabel(workspace?.isAnonymous ? 'Anonymous' : (workspace?.username ?? 'Anonymous'));
  };

  useEffect(() => {
    updateUserLabel();
    window.addEventListener('workspace-updated', updateUserLabel);
    return () => window.removeEventListener('workspace-updated', updateUserLabel);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/health');
        if (!cancelled) setConnection(res.ok ? 'connected' : 'disconnected');
      } catch {
        if (!cancelled) setConnection('disconnected');
      }
    };
    check();
    const t = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const env = typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'Development' : 'Production';
  const zoomPercent = Math.round(zoom * 100);

  return (
    <footer className="desktop-status-bar" role="status">
      <div className="flex items-center gap-4">
        <span className="desktop-status-bar__item" title="Connection status">
          {connection === 'connected' ? (
            <Wifi className="size-3 text-green-600 dark:text-green-500" aria-hidden />
          ) : (
            <WifiOff className="size-3 text-muted-foreground" aria-hidden />
          )}
          <span>{connection === 'connected' ? 'Connected' : 'Disconnected'}</span>
        </span>
        <span className="desktop-status-bar__item" title="User">
          <User className="size-3" aria-hidden />
          <span>{userLabel}</span>
        </span>
        <span className="desktop-status-bar__item" title="Environment">
          <Cpu className="size-3" aria-hidden />
          <span>{env}</span>
        </span>
        <span className="desktop-status-bar__item" title="Server">
          <Server className="size-3" aria-hidden />
          <span>Local</span>
        </span>
        <span className="desktop-status-bar__item" title="Zoom level">
          <ZoomIn className="size-3" aria-hidden />
          <span>{zoomPercent}%</span>
        </span>
      </div>
    </footer>
  );
}
