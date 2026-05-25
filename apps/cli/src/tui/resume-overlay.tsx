import { Session as SessionUseCases } from '@qwery/application';
import type { Session } from '@qwery/domain';
import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import { useServices } from '../services';

const VISIBLE = 12;

export interface ResumeOverlayProps {
  onResume: (sessionId: string) => void;
  onClose: () => void;
}

function fmtWhen(d: Date): string {
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  const diffDays = Math.round(diffMin / (60 * 24));
  if (diffDays < 30) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

export function ResumeOverlay({ onResume, onClose }: ResumeOverlayProps) {
  const { sessionRepo, logger, currentProject } = useServices();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [cursor, setCursor] = useState(0);
  const [windowStart, setWindowStart] = useState(0);
  // Default to the current project's sessions; toggle to see every project's.
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = showAll
      ? SessionUseCases.listSessions({ sessionRepo })
      : SessionUseCases.listSessionsByProject({ sessionRepo }, currentProject.id);
    load
      .then((list) => {
        if (cancelled) return;
        setSessions(list);
        setCursor(0);
        setWindowStart(0);
      })
      .catch((err) => {
        logger.error('resume.list.error', { message: err instanceof Error ? err.message : String(err) });
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionRepo, logger, currentProject, showAll]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (input === 'a') {
      setShowAll((v) => !v);
      return;
    }
    if (!sessions || sessions.length === 0) return;
    if (key.upArrow) {
      const next = Math.max(0, cursor - 1);
      setCursor(next);
      if (next < windowStart) setWindowStart(next);
    } else if (key.downArrow) {
      const next = Math.min(sessions.length - 1, cursor + 1);
      setCursor(next);
      if (next >= windowStart + VISIBLE) setWindowStart(next - VISIBLE + 1);
    } else if (key.return) {
      const chosen = sessions[cursor];
      if (chosen) onResume(chosen.id);
    }
  });

  const scopeLabel = showAll ? 'all projects' : currentProject.name;

  if (sessions === null) {
    return (
      <Box borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Text dimColor>Loading sessions…</Text>
      </Box>
    );
  }

  if (sessions.length === 0) {
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
        <Box justifyContent="space-between">
          <Text bold>Resume a session · {scopeLabel}</Text>
          <Text dimColor>esc</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>
            {showAll
              ? 'No past sessions yet. Send a message to start one.'
              : 'No sessions in this project yet. Press a to see all projects.'}
          </Text>
        </Box>
      </Box>
    );
  }

  const visible = sessions.slice(windowStart, windowStart + VISIBLE);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold>Resume a session · {scopeLabel}</Text>
        <Text dimColor>esc</Text>
      </Box>
      <Box marginY={1}>
        <Text dimColor>
          ↑/↓ navigate · enter to resume · a: {showAll ? 'this project' : 'all projects'} · {sessions.length}{' '}
          session{sessions.length === 1 ? '' : 's'}
        </Text>
      </Box>
      {windowStart > 0 && <Text dimColor> ↑ {windowStart} earlier</Text>}
      {visible.map((s, i) => {
        const idx = windowStart + i;
        const selected = idx === cursor;
        return (
          <Box key={s.id}>
            <Text color={selected ? 'cyan' : undefined} bold={selected} inverse={selected}>
              {' '}
              {s.title}{' '}
            </Text>
            <Text dimColor> · {fmtWhen(s.updatedAt)}</Text>
            {s.datasources.length > 0 && (
              <Text dimColor>
                {' '}
                · {s.datasources.length} datasource{s.datasources.length === 1 ? '' : 's'}
              </Text>
            )}
          </Box>
        );
      })}
      {windowStart + VISIBLE < sessions.length && (
        <Text dimColor> ↓ {sessions.length - windowStart - VISIBLE} more</Text>
      )}
    </Box>
  );
}
