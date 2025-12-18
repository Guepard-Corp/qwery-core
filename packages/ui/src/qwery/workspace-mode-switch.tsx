'use client';

import * as React from 'react';
import { Zap, Code2, Check, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../shadcn/popover';
import { Button } from '../shadcn/button';
import { Card, CardContent } from '../shadcn/card';
import { Badge } from '../shadcn/badge';

export type WorkspaceMode = 'simple' | 'advanced';

type WorkspaceModeSwitchProps = {
  simpleLabel?: string;
  advancedLabel?: string;
  defaultMode?: WorkspaceMode | string;
  onChange?: (mode: WorkspaceMode) => void;
  className?: string;
};

function normalizeMode(mode?: string): WorkspaceMode {
  const m = mode?.toLowerCase();
  if (m === 'advanced') return 'advanced';
  return 'simple'; // Default fallback
}

export function WorkspaceModeSwitch({
  simpleLabel = 'Simple mode',
  advancedLabel = 'Advanced mode',
  defaultMode = 'simple',
  onChange,
  className,
}: WorkspaceModeSwitchProps = {}) {
  const [open, setOpen] = React.useState(false);
  const currentMode = normalizeMode(defaultMode);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleModeChange = (newMode: WorkspaceMode) => {
    if (currentMode === newMode) {
      setOpen(false);
      return;
    }
    onChange?.(newMode);
    setOpen(false);
  };

  const toggleMode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newMode = currentMode === 'simple' ? 'advanced' : 'simple';
    onChange?.(newMode);
    setOpen(false);
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={toggleMode}
          className={cn(
            'flex items-center gap-2 px-3 h-9 font-medium border-2 border-[#ffcb51] hover:bg-accent/50 transition-all cursor-pointer shadow-sm dark:border-[#ffcb51]/70',
            className,
          )}
        >
          {currentMode === 'simple' ? (
            <Zap className="h-4 w-4 text-[#ffcb51] fill-[#ffcb51]/20" />
          ) : currentMode === 'advanced' ? (
            <Code2 className="h-4 w-4 text-[#ffcb51]" />
          ) : (
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <span>
            {currentMode === 'simple'
              ? simpleLabel
              : currentMode === 'advanced'
                ? advancedLabel
                : 'Select mode'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="end" 
        sideOffset={8}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-[320px] p-2 space-y-2"
      >
        <div className="px-2 py-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Switch mode
          </p>
        </div>
        <div className="grid gap-2">
          <Card
            className={cn(
              'relative overflow-hidden transition-all hover:border-[#ffcb51]/50 cursor-pointer group border-2',
              currentMode === 'simple' ? 'border-[#ffcb51] bg-[#ffcb51]/5' : 'border-transparent bg-muted/30',
            )}
            onClick={() => handleModeChange('simple')}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <div className={cn(
                "mt-0.5 p-1.5 rounded-lg transition-colors",
                currentMode === 'simple' ? "bg-[#ffcb51]/20" : "bg-muted group-hover:bg-[#ffcb51]/10"
              )}>
                <Zap className={cn(
                  "h-4 w-4 transition-colors",
                  currentMode === 'simple' ? "text-[#ffcb51] fill-[#ffcb51]" : "text-muted-foreground group-hover:text-[#ffcb51]"
                )} />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{simpleLabel}</h4>
                  {currentMode === 'simple' && (
                    <Badge variant="default" className="h-4.5 gap-1 px-1 bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90 border-none font-bold text-[10px]">
                      <Check className="h-2.5 w-2.5" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  Automated analysis and AI insights.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className={cn(
              'relative overflow-hidden transition-all hover:border-[#ffcb51]/50 cursor-pointer group border-2',
              currentMode === 'advanced' ? 'border-[#ffcb51] bg-[#ffcb51]/5' : 'border-transparent bg-muted/30',
            )}
            onClick={() => handleModeChange('advanced')}
          >
            <CardContent className="p-3 flex items-start gap-3">
              <div className={cn(
                "mt-0.5 p-1.5 rounded-lg transition-colors",
                currentMode === 'advanced' ? "bg-[#ffcb51]/20" : "bg-muted group-hover:bg-[#ffcb51]/10"
              )}>
                <Code2 className={cn(
                  "h-4 w-4 transition-colors",
                  currentMode === 'advanced' ? "text-[#ffcb51]" : "text-muted-foreground group-hover:text-[#ffcb51]"
                )} />
              </div>
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">{advancedLabel}</h4>
                  {currentMode === 'advanced' && (
                    <Badge variant="default" className="h-4.5 gap-1 px-1 bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90 border-none font-bold text-[10px]">
                      <Check className="h-2.5 w-2.5" />
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  SQL notebooks and data exploration.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PopoverContent>
    </Popover>
  );
}
