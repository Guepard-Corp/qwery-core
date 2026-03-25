import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

type DevProfilerProps = {
  id: string;
  children: ReactNode;
  warnAboveMs?: number;
};

const onRender: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  _baseDuration,
  _startTime,
  _commitTime,
) => {
  // keep it simple: logs only, no metrics pipeline
  console.debug(`[profiler] ${id} ${phase} ${actualDuration.toFixed(1)}ms`);
};

export function DevProfiler({
  id,
  children,
  warnAboveMs = 32,
}: DevProfilerProps) {
  // No profiler overhead in prod builds.
  if (import.meta.env.PROD) return children;

  const callback: ProfilerOnRenderCallback = (...args) => {
    const [_id, _phase, actualDuration] = args;
    if (actualDuration >= warnAboveMs) onRender(...args);
  };

  return (
    <Profiler id={id} onRender={callback}>
      {children}
    </Profiler>
  );
}
