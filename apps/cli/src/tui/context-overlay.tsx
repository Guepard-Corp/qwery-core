import {
  type AgentSpec,
  type AttachedDatasourceSummary,
  type LocalAppSummary,
  type SkillSummary,
  type SubagentInfo,
  SYSTEM_PROMPT,
  systemPromptSegments,
} from '@qwery/agent-factory-sdk';
import type { ModelMessage } from 'ai';
import { Box, Text, useInput } from 'ink';
import { useEffect, useMemo, useState } from 'react';

interface ContextOverlayProps {
  agent: AgentSpec;
  modelLabel: string | null;
  contextLimit: number | null;
  lastTurnInputTokens: number;
  messages: ModelMessage[];
  datasources: AttachedDatasourceSummary[];
  apps: LocalAppSummary[];
  skills: SkillSummary[];
  subagents: SubagentInfo[];
  loadedTools: string[];
  onClose: () => void;
}

/** A labelled token line inside the System-prompt breakdown. */
interface PromptPart {
  label: string;
  tokens: number;
}

interface Category {
  key: string;
  label: string;
  color: string;
  tokens: number;
}

/** Rough token estimate — 1 token ≈ 4 characters of text on average. */
function tokensOf(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Per-tool JSON-schema token cost. Hand-measured from the actual `tool()`
 * definitions; values are approximate but stable enough for a /context overlay.
 */
const TOOL_TOKENS: Record<string, number> = {
  schema: 180,
  runQuery: 250,
  describeQuery: 180,
  present: 380,
  bash: 240,
  read: 200,
  write: 220,
  edit: 380,
  listTools: 90,
  searchTools: 110,
  loadTool: 100,
  // Deferred CRUDs — only counted when loaded.
  datasourceList: 130,
  datasourceTest: 130,
  datasourceAttach: 110,
  datasourceDetach: 110,
  skillList: 110,
  skillRead: 110,
  usageList: 200,
};

function estimateMessageTokens(messages: ModelMessage[]): number {
  let total = 0;
  for (const m of messages) {
    if (typeof m.content === 'string') total += tokensOf(m.content);
    else if (Array.isArray(m.content)) {
      for (const part of m.content) {
        if (typeof part === 'object' && part && 'text' in part && typeof part.text === 'string') {
          total += tokensOf(part.text);
        }
      }
    }
  }
  return total;
}

const GRID_COLS = 20;
const GRID_ROWS = 8;
const GRID_CELLS = GRID_COLS * GRID_ROWS;

export function ContextOverlay({
  agent,
  modelLabel,
  contextLimit,
  lastTurnInputTokens,
  messages,
  datasources,
  apps,
  skills,
  subagents,
  loadedTools,
  onClose,
}: ContextOverlayProps) {
  useInput((_input, key) => {
    if (key.escape || key.return) onClose();
  });

  const limit = contextLimit ?? 200_000;

  const scopedSkills = useMemo(
    () => skills.filter((s) => !s.agent || s.agent === 'all' || s.agent === agent.id),
    [skills, agent],
  );

  const { categories, promptParts } = useMemo(() => {
    // Same dynamic blocks runAgent injects, but attributed per segment so the
    // System-prompt total breaks down into base + skills + subagents + …
    const segments = systemPromptSegments({
      datasources,
      apps,
      skills: scopedSkills,
      subagents,
      agentPreamble: agent.promptPreamble,
    });
    const baseTokens = tokensOf(SYSTEM_PROMPT);
    const parts: PromptPart[] = [{ label: 'base prompt', tokens: baseTokens }];
    for (const seg of segments) {
      const suffix = seg.key === 'preamble' ? '' : ` (${seg.count})`;
      parts.push({ label: `${seg.label.toLowerCase()}${suffix}`, tokens: tokensOf(seg.text) });
    }
    const promptTokens = parts.reduce((acc, p) => acc + p.tokens, 0);

    // Active tool roster = agent's core tools + 3 navigators + already-loaded.
    const activeTools = new Set<string>([
      ...agent.tools,
      'listTools',
      'searchTools',
      'loadTool',
      ...loadedTools,
    ]);
    let toolTokens = 0;
    for (const name of activeTools) toolTokens += TOOL_TOKENS[name] ?? 150;

    const messageTokens = estimateMessageTokens(messages);

    const cats: Category[] = [
      { key: 'prompt', label: 'System prompt', color: 'cyan', tokens: promptTokens },
      { key: 'tools', label: 'Active tools', color: 'magenta', tokens: toolTokens },
      { key: 'messages', label: 'Messages', color: 'green', tokens: messageTokens },
    ];
    return { categories: cats, promptParts: parts };
  }, [agent, datasources, apps, scopedSkills, subagents, loadedTools, messages]);

  const used = categories.reduce((acc, c) => acc + c.tokens, 0);
  const free = Math.max(0, limit - used);
  const allCategories: Category[] = [
    ...categories,
    { key: 'free', label: 'Free', color: 'gray', tokens: free },
  ];

  // Compute number of cells per category (proportional to tokens / limit).
  const cellAssignments = allCategories.map((c) => ({
    cat: c,
    cells: Math.round((c.tokens / limit) * GRID_CELLS),
  }));
  const totalAssigned = cellAssignments.reduce((acc, a) => acc + a.cells, 0);
  // Compensate rounding by adjusting `free` last.
  cellAssignments[cellAssignments.length - 1]!.cells += GRID_CELLS - totalAssigned;

  // Flatten into a per-cell color array.
  const cells: string[] = [];
  for (const a of cellAssignments) {
    for (let i = 0; i < a.cells && cells.length < GRID_CELLS; i++) {
      cells.push(a.cat.color);
    }
  }
  while (cells.length < GRID_CELLS) cells.push('gray');

  const rows: string[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    rows.push(cells.slice(r * GRID_COLS, (r + 1) * GRID_COLS));
  }

  const pct = (n: number): string => `${((n / limit) * 100).toFixed(1)}%`;
  const fmt = (n: number): string => {
    if (n < 1000) return String(n);
    if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`;
    return `${(n / 1_000_000).toFixed(1)}M`;
  };

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} paddingY={1}>
      <Box justifyContent="space-between">
        <Text bold>Context Usage</Text>
        <Text dimColor>esc close</Text>
      </Box>

      <Box marginTop={1}>
        <Text>
          <Text bold>{modelLabel ?? 'no provider'}</Text>
          {contextLimit ? (
            <>
              <Text dimColor> · </Text>
              <Text>
                {fmt(used)} / {fmt(limit)} tokens used
              </Text>
              <Text dimColor> ({pct(used)})</Text>
            </>
          ) : (
            <Text dimColor> · context limit unknown</Text>
          )}
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="row">
        {/* Grid */}
        <Box flexDirection="column" marginRight={2}>
          {rows.map((row, r) => (
            <Box key={r}>
              {row.map((color, c) => (
                <Text key={c} color={color}>
                  {color === 'gray' ? '·' : '■'}
                  {c < GRID_COLS - 1 ? ' ' : ''}
                </Text>
              ))}
            </Box>
          ))}
        </Box>

        {/* Legend */}
        <Box flexDirection="column">
          {allCategories.map((c) => (
            <Box key={c.key}>
              <Text color={c.color}>■ </Text>
              <Text bold>{c.label.padEnd(15)}</Text>
              <Text dimColor>
                {fmt(c.tokens).padStart(6)} ({pct(c.tokens)})
              </Text>
            </Box>
          ))}
        </Box>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>System prompt breakdown</Text>
        {promptParts.map((p) => (
          <Box key={p.label}>
            <Text dimColor>{`  ${p.label}`.padEnd(22)}</Text>
            <Text dimColor>
              {fmt(p.tokens).padStart(6)} ({pct(p.tokens)})
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text dimColor>Active agent: {agent.label}</Text>
        <Text dimColor>
          Last turn input: {fmt(lastTurnInputTokens)} tokens
          {contextLimit ? ` (${pct(lastTurnInputTokens)})` : ''}
        </Text>
        <Text dimColor>
          Skills ({scopedSkills.length}):{' '}
          {scopedSkills.length > 0 ? scopedSkills.map((s) => s.name).join(', ') : 'none'}
        </Text>
        <Text dimColor>
          Subagents ({subagents.length}):{' '}
          {subagents.length > 0 ? subagents.map((s) => s.name).join(', ') : 'none'}
        </Text>
        {loadedTools.length > 0 && <Text dimColor>Loaded lazy tools: {loadedTools.join(', ')}</Text>}
      </Box>
    </Box>
  );
}

interface OpenContextOverlayHelpers {
  loadApps: () => Promise<LocalAppSummary[]>;
  loadSkills: () => Promise<SkillSummary[]>;
}

export function useContextOverlayData(helpers: OpenContextOverlayHelpers): {
  apps: LocalAppSummary[];
  skills: SkillSummary[];
  refresh: () => Promise<void>;
} {
  const [apps, setApps] = useState<LocalAppSummary[]>([]);
  const [skills, setSkills] = useState<SkillSummary[]>([]);

  const refresh = async () => {
    const [a, s] = await Promise.all([helpers.loadApps(), helpers.loadSkills()]);
    setApps(a);
    setSkills(s);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: load apps/skills once on mount
  useEffect(() => {
    void refresh();
  }, []);

  return { apps, skills, refresh };
}
