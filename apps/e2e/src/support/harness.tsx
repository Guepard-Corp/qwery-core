import { afterEach } from 'bun:test';
import { EventEmitter } from 'node:events';
import { App } from '@qwery/cli/app';
import { ServicesProvider } from '@qwery/cli/services';
import { matchCommands } from '@qwery/domain';
import { render } from 'ink';
import { type MockServicesOptions, makeMockServices } from './mock-services';
import { captureFrame } from './screenshot';

// Pin the app version so the rendered header is deterministic in snapshots,
// regardless of the machine's baked QWERY_VERSION or installed ~/.qwery/version.
process.env.QWERY_VERSION = '0.0.0-e2e';

const DOWN_ARROW = '\x1B[B';

class TestStdout extends EventEmitter {
  columns = 100;
  rows = 30;
  frames: string[] = [];
  private frame: string | undefined;

  write = (frame: string) => {
    this.frames.push(frame);
    this.frame = frame;
  };

  lastFrame = () => this.frame;
}

class TestStderr extends EventEmitter {
  frames: string[] = [];
  private frame: string | undefined;

  write = (frame: string) => {
    this.frames.push(frame);
    this.frame = frame;
  };

  lastFrame = () => this.frame;
}

class TestStdin extends EventEmitter {
  isTTY = true;
  private data: string | null = null;

  write = (data: string) => {
    this.data = data;
    this.emit('readable');
    this.emit('data', data);
  };

  setEncoding() {}
  setRawMode() {}
  resume() {}
  pause() {}
  ref() {}
  unref() {}

  read = () => {
    const data = this.data;
    this.data = null;
    return data;
  };
}

export const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Each e2e test mounts a fresh `<App/>`, whose async startup effects (session
 * create, history load, branching version probe, update check, datasource
 * attach) resolve a tick after mount. When a test ends and unmounts, those
 * in-flight effects can still resolve — and if the next test has already mounted
 * its own `<App/>`, they re-enter that fresh React root mid-render and crash its
 * reconciler ("Should not already be working").
 *
 * Call this at the top of every e2e file that mounts the App more than once: it
 * drains the event loop between tests so a finished test's effects settle before
 * the next mounts, keeping the two roots from overlapping (AGENTS.md §5 — no
 * flaky tests). bun scopes lifecycle hooks per file, so it must be invoked from
 * within each file rather than once from this shared module.
 */
export function settleEffectsBetweenTests(): void {
  afterEach(async () => {
    await delay(50);
  });
}

export interface WaitForFrameOptions {
  /** Used to name the screenshot written on timeout (`FAILED-<label>.html`). */
  label?: string;
  timeoutMs?: number;
}

/**
 * Poll the rendered frame until it matches, else fail after `timeoutMs`. On
 * timeout it writes a `FAILED-<label>.html` screenshot (Playwright-style
 * screenshot-on-failure) so you can see exactly what rendered instead.
 */
export async function waitForFrame(
  lastFrame: () => string | undefined,
  predicate: (frame: string) => boolean,
  { label = 'frame', timeoutMs = 3000 }: WaitForFrameOptions = {},
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  let frame = lastFrame() ?? '';
  while (Date.now() < deadline) {
    frame = lastFrame() ?? '';
    if (predicate(frame)) return frame;
    await delay(25);
  }
  captureFrame(`FAILED-${label}`, frame);
  throw new Error(
    `waitForFrame timed out after ${timeoutMs}ms (screenshot: apps/e2e/artifacts/FAILED-${label}.html). Last frame:\n${frame}`,
  );
}

/** Poll an arbitrary (non-frame) probe until it satisfies `ok`, else throw. */
export async function waitFor<T>(
  probe: () => Promise<T> | T,
  ok: (value: T) => boolean,
  timeoutMs = 4000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last = await probe();
  while (Date.now() < deadline) {
    last = await probe();
    if (ok(last)) return last;
    await delay(30);
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms. Last value: ${JSON.stringify(last)}`);
}

/** Render the real <App> with mocked services. Returns the ink harness + the services. */
export function renderApp(opts: MockServicesOptions = {}) {
  const services = makeMockServices(opts);
  const stdout = new TestStdout();
  const stderr = new TestStderr();
  const stdin = new TestStdin();
  const instance = render(
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>,
    {
      stdout: stdout as never,
      stderr: stderr as never,
      stdin: stdin as never,
      debug: true,
      exitOnCtrlC: false,
      patchConsole: false,
    },
  );
  return {
    rerender: instance.rerender,
    unmount: instance.unmount,
    cleanup: instance.cleanup,
    stdout,
    stderr,
    stdin,
    frames: stdout.frames,
    lastFrame: stdout.lastFrame,
    services,
  };
}

/**
 * Wait for boot, type a slash command, and submit it. In slash mode the input
 * bar submits the *highlighted* autocomplete suggestion (not the literal text),
 * so when several commands share a prefix (e.g. `/data` vs `/datasources`) we
 * arrow down to the exact match first — exactly the gesture a real user makes.
 */
export async function sendCommand(
  stdin: { write: (data: string) => void },
  lastFrame: () => string | undefined,
  command: string,
): Promise<void> {
  await waitForFrame(lastFrame, (f) => f.includes('qwery'));
  stdin.write(command);
  await delay(40);
  const suggestions = matchCommands(command);
  const index = suggestions.findIndex((s) => s.label === command);
  for (let i = 0; i < Math.max(0, index); i++) {
    stdin.write(DOWN_ARROW);
    await delay(15);
  }
  stdin.write('\r');
}
