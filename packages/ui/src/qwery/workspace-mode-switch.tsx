'use client';

import * as React from 'react';
import { Label } from '../shadcn/label';
import { Switch } from '../shadcn/switch';

export type WorkspaceMode = 'simple' | 'advanced';

type WorkspaceModeSwitchProps = {
  simpleLabel?: string;
  advancedLabel?: string;
  defaultMode?: WorkspaceMode | string;
  onChange?: (mode: WorkspaceMode) => void;
};

function normalizeMode(mode?: string): WorkspaceMode {
  return mode?.toLowerCase() === 'advanced' ? 'advanced' : 'simple';
}

export function WorkspaceModeSwitch({
  simpleLabel = 'Simple mode',
  advancedLabel = 'Advanced mode',
  defaultMode = 'simple',
  onChange,
}: WorkspaceModeSwitchProps = {}) {
  const [mode, setMode] = React.useState<WorkspaceMode>(
    normalizeMode(defaultMode),
  );

  React.useEffect(() => {
    setMode(normalizeMode(defaultMode));
  }, [defaultMode]);

  const handleCheckedChange = (checked: boolean) => {
    const newMode: WorkspaceMode = checked ? 'advanced' : 'simple';
    setMode(newMode);
    onChange?.(newMode);
  };

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="workspace-mode"
        checked={mode === 'advanced'}
        onCheckedChange={handleCheckedChange}
      />
      <Label htmlFor="workspace-mode" className="cursor-pointer">
        {mode === 'advanced' ? advancedLabel : simpleLabel}
      </Label>
    </div>
  );
}
