# Qwery CLI Telemetry Control

This document explains how to allow users to explicitly enable or disable telemetry in Qwery CLI using command-line flags or environment variables.

---

## Goal

Allow users to disable telemetry explicitly:

```bash
qwery --no-telemetry
qwery project list --no-telemetry
```

Or enable it explicitly:

```bash
qwery --telemetry
```

The CLI should respect this setting when initializing the `TelemetryManager`.

---

## Step 1 — Define the CLI flag

If you are using **Commander.js**:

```ts
program
  .option("--telemetry", "Enable telemetry explicitly")
  .option("--no-telemetry", "Disable telemetry explicitly"); // commander auto-supports boolean negation
```

Commander automatically handles:

* `--telemetry` → `options.telemetry = true`
* `--no-telemetry` → `options.telemetry = false`
* Not provided → `options.telemetry = undefined` (fall back to default)

---

## Step 2 — Resolve telemetry configuration in CLI bootstrap

Where you currently do:

```ts
const app = new CliApplication();
await app.run(process.argv);
```

Change to:

```ts
const { program } = require("commander");

program
  .option("--telemetry", "Enable telemetry")
  .option("--no-telemetry", "Disable telemetry")
  .parse(process.argv);

const opts = program.opts();

const telemetryEnabled =
  opts.telemetry === true ? true :
  opts.telemetry === false ? false :
  process.env.QWERY_TELEMETRY_ENABLED !== "false"; // default

// Initialize TelemetryManager with resolved flag
TelemetryManager.init({
  enabled: telemetryEnabled,
});
```

---

## Step 3 — Update `TelemetryManager` to respect user override

Inside `telemetry-manager.ts`:

```ts
static init(config: { enabled: boolean }) {
  if (!config.enabled) {
    console.log("Telemetry disabled by user (--no-telemetry).");
    this.service = new NullTelemetryService();
    return;
  }

  try {
    this.service = new ClientTelemetryService();
    console.log("Telemetry enabled.");
  } catch (err) {
    console.error("Telemetry initialization failed, falling back to no-op mode.");
    this.service = new NullTelemetryService();
  }
}
```

---

## Step 4 — Add environment support (optional)

Some users prefer environment flags over CLI flags. Standard convention:

```bash
export QWERY_TELEMETRY_ENABLED=false
```

Final resolution logic (priority order):

1. Explicit CLI flag
2. Environment variable
3. Default enabled

```ts
function resolveTelemetryFlag(opts) {
  if (opts.telemetry === true) return true;
  if (opts.telemetry === false) return false;

  if (process.env.QWERY_TELEMETRY_ENABLED)
    return process.env.QWERY_TELEMETRY_ENABLED !== "false";

  return true; // default enabled
}
```

---

## Step 5 — Document it in CLI Help

Add flags to CLI help:

```
--telemetry           Enable telemetry explicitly
--no-telemetry        Disable telemetry explicitly
```

Example help message:

```
Telemetry is enabled by default.
You may disable telemetry with:
  qwery --no-telemetry
or via environment variable:
  export QWERY_TELEMETRY_ENABLED=false
```

---

## Final Result

Your CLI now supports:

* **Disable telemetry**

```bash
qwery --no-telemetry
qwery project list --no-telemetry
```

* **Enable telemetry**

```bash
qwery --telemetry
```

* **Use environment variable**

```bash
export QWERY_TELEMETRY_ENABLED=false
```

* **Default behavior**: Telemetry is enabled unless explicitly disabled.

---

