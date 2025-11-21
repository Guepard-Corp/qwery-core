Qwery CLI
=========

Use the steps below to expose the `qwery` command globally on every OS we support. All commands assume you have already cloned the repository (`/home/guepard/work/qwery-core`) and installed pnpm.

Prerequisites
-------------
- Node.js >= 22
- pnpm >= 9 (`corepack enable pnpm` is recommended)

Build Once
----------
From the repo root:

```
pnpm --filter cli build
```

Rebuild after any source change so the global binary picks up the latest code:

```
pnpm --filter cli build
```

Global Install
--------------
After the build completes, change into the CLI package and link it globally. The command is the same on macOS, Linux, and Windows (PowerShell or Git Bash):

```
cd /home/guepard/work/qwery-core/apps/cli
pnpm link --global
```

pnpm will print the global directory (for example, `~/.local/share/pnpm/global/5` on Linux/macOS or `%LOCALAPPDATA%\pnpm\global\5` on Windows). Make sure that directory is on your `PATH`. If you used `corepack enable pnpm`, pnpm already exports the correct PATH entries.

Windows Notes
-------------
- Run the commands inside an elevated PowerShell or the “Developer PowerShell for VS Code” so the global bin directory can be added to PATH.
- If `qwery` is not recognized after linking, restart the shell or run `refreshenv` (if you use Scoop/Chocolatey) so the updated PATH is loaded.

macOS / Linux Notes
-------------------
- Ensure `~/.local/share/pnpm` (XDG default) or the directory shown in pnpm’s output is included in your shell’s PATH (`.zshrc`, `.bashrc`, etc.).
- If you hit `EACCES` errors during linking, rerun `pnpm link --global` after `pnpm setup` to let pnpm manage the global directory under your home folder.

Verify
------
After linking, any shell can invoke the CLI directly:

```
qwery --help
qwery workspace show
```

Angry Star Smoke Test
---------------------
End-to-end commands for the prod datasource `postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require`:

```
qwery workspace init
qwery datasource create angry-star --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" --description "Angry star prod"
qwery datasource list
qwery datasource test d7d411d0-8fbf-46a8-859d-7aca6abfad14
qwery notebook create angry-notes --description "Angry star smoke"
qwery notebook add-cell f4d184d5-1fc9-48a9-938e-fbe652c411a1 --datasources d7d411d0-8fbf-46a8-859d-7aca6abfad14 --query "select current_date"
qwery notebook run f4d184d5-1fc9-48a9-938e-fbe652c411a1
```

Update / Uninstall
------------------
- Rebuild & relink after code changes: `pnpm --filter cli build && (cd apps/cli && pnpm link --global)`
- Remove the global install: `pnpm unlink --global cli` (run inside `apps/cli` or pass the package path).

Troubleshooting
---------------
- If pnpm reports “Command `qwery` not found”, confirm the global bin directory is on PATH and rerun the link command.
- To inspect where pnpm linked the binary, run `pnpm bin -g`.


