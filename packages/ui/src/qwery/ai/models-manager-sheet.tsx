'use client';

import { useMemo, useState } from 'react';
import { ListFilterIcon, ListIcon } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../shadcn/sheet';
import { Switch } from '../../shadcn/switch';
import { highlightSearchMatch } from '../../lib/utils';

export type ModelOption = { name: string; shortName?: string; value: string };

export interface ModelsManagerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allModels: ModelOption[];
  enabledModelIds: Set<string>;
  onModelsChange: (enabledModelIds: Set<string>) => void;
}

type ProviderGroup = {
  id: string;
  label: string;
  models: ModelOption[];
};

function getProviderId(value: string): string {
  if (!value) return 'other';
  const idx = value.indexOf('/');
  const id = idx === -1 ? value : value.slice(0, idx);
  return id || 'other';
}

function getProviderLabel(id: string): string {
  switch (id) {
    case 'azure':
      return 'Azure';
    case 'anthropic':
      return 'Anthropic';
    case 'ollama-cloud':
      return 'Ollama Cloud';
    case 'webllm':
      return 'WebLLM';
    case 'transformer-browser':
      return 'Transformers.js';
    case 'browser':
      return 'Browser';
    case 'ollama':
      return 'Ollama';
    default:
      return 'Other';
  }
}

function groupByProvider(models: ModelOption[]): ProviderGroup[] {
  const buckets = new Map<string, ModelOption[]>();

  for (const model of models) {
    const id = getProviderId(model.value);
    const existing = buckets.get(id);
    if (existing) existing.push(model);
    else buckets.set(id, [model]);
  }

  return Array.from(buckets.entries()).map(([id, groupModels]) => ({
    id,
    label: getProviderLabel(id),
    models: groupModels,
  }));
}

export function ModelsManagerSheet({
  open,
  onOpenChange,
  allModels,
  enabledModelIds,
  onModelsChange,
}: ModelsManagerSheetProps) {
  const [search, setSearch] = useState('');
  const [groupByFamily, setGroupByFamily] = useState(true);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return allModels;
    const q = search.toLowerCase();
    return allModels.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.value.toLowerCase().includes(q),
    );
  }, [allModels, search]);

  const groupedModels = useMemo(
    () => groupByProvider(filteredModels),
    [filteredModels],
  );

  const toggleModel = (value: string, enabled: boolean) => {
    const next = new Set(enabledModelIds);
    if (enabled) next.add(value);
    else next.delete(value);
    onModelsChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="border-border/50 flex w-full flex-col border-l sm:max-w-md"
      >
        <SheetHeader className="border-border/50">
          <SheetTitle>
            <p className="text-lg">Models</p>
          </SheetTitle>
          <p className="text-muted-foreground text-xs">
            Enable the models you want available in this workspace.
          </p>
        </SheetHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-hidden pt-4">
          <div className="border-border/50 focus-within:border-border flex items-center rounded-lg border bg-transparent px-3 py-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Add or search model"
              className="placeholder:text-muted-foreground/60 flex-1 bg-transparent text-sm outline-none"
            />
            <div className="flex items-center gap-0.5 pl-1">
              <button
                type="button"
                onClick={() => setGroupByFamily(false)}
                className={`flex size-6 items-center justify-center rounded-md ${
                  groupByFamily
                    ? 'text-muted-foreground hover:bg-accent'
                    : 'bg-primary/10 text-primary'
                }`}
                aria-label="Flat list"
              >
                <ListIcon className="size-4 shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => setGroupByFamily(true)}
                className={`flex size-6 items-center justify-center rounded-md ${
                  groupByFamily
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
                aria-label="Group by provider"
              >
                <ListFilterIcon className="size-4 shrink-0" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredModels.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center text-sm">
                No models match your search
              </div>
            ) : (
              <div className="space-y-4">
                {groupByFamily ? (
                  groupedModels.map((group) => (
                    <div key={group.id} className="px-2 py-1.5">
                      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.models.map((model) => {
                          const enabled = enabledModelIds.has(model.value);
                          const displayName = groupByFamily
                            ? (model.shortName ?? model.name)
                            : model.name;
                          return (
                            <div
                              key={model.value}
                              className="focus-within:bg-accent hover:bg-accent/50 flex cursor-default items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
                            >
                              <span className="min-w-0 flex-1">
                                {highlightSearchMatch(displayName, search)}
                              </span>
                              <Switch
                                checked={enabled}
                                onCheckedChange={(checked) =>
                                  toggleModel(model.value, checked)
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-0.5 px-2 py-1.5">
                    {filteredModels.map((model) => {
                      const enabled = enabledModelIds.has(model.value);
                      const displayName = model.name;
                      return (
                        <div
                          key={model.value}
                          className="focus-within:bg-accent hover:bg-accent/50 flex cursor-default items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
                        >
                          <span className="min-w-0 flex-1">
                            {highlightSearchMatch(displayName, search)}
                          </span>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              toggleModel(model.value, checked)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
