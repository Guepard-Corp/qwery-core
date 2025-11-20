import { app, BrowserWindow, ipcMain, shell } from "electron";
import { spawn, ChildProcess } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";

const isServerProcess =
  process.env.ELECTRON_RUN_AS_SERVER === "true" ||
  process.argv.some(
    (arg) =>
      arg?.includes("server.js") ||
      (arg?.includes("/server/") && arg?.endsWith(".js")),
  );

const APP_USER_MODEL_ID = "run.qwery.desktop";

if (isServerProcess) {
  console.log("[main.ts] Detected server process, skipping Electron bootstrap");
  console.log("[main.ts] argv:", process.argv);
  console.log("[main.ts] ELECTRON_RUN_AS_SERVER:", process.env.ELECTRON_RUN_AS_SERVER);
  
  const serverScriptPath = process.argv.find(arg => arg?.includes("server.js"));
  if (serverScriptPath) {
    console.log("[main.ts] Importing and running server script:", serverScriptPath);
    import(serverScriptPath).catch((error) => {
      console.error("[main.ts] Failed to import server script:", error);
      process.exit(1);
    });
  } else {
    console.error("[main.ts] Server script path not found in argv");
    process.exit(1);
  }
}

if (!isServerProcess) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
  app.setName("Qwery Studio");

  if (process.platform === "win32") {
    app.setAppUserModelId(APP_USER_MODEL_ID);
  }

const hasSetuidChromeSandbox = (): boolean => {
  const execDir = path.dirname(process.execPath);
  const sandboxPath = path.join(execDir, "chrome-sandbox");

  try {
    const stats = statSync(sandboxPath);
    const hasSetuid = (stats.mode & 0o4000) === 0o4000;
    const ownedByRoot = stats.uid === 0;

    if (!hasSetuid || !ownedByRoot) {
      console.warn(
        `[sandbox] chrome-sandbox at ${sandboxPath} missing setuid bit or not owned by root (setuid=${hasSetuid}, uid=${stats.uid})`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[sandbox] Unable to inspect chrome-sandbox path`, error);
    return false;
  }
};

const userDisabledSandbox = process.argv.includes(" --no-sandbox");
const linuxSandboxEnabled =
  process.platform === "linux" ? !userDisabledSandbox && hasSetuidChromeSandbox() : true;

if (process.platform === "linux" && !linuxSandboxEnabled && !userDisabledSandbox) {
  app.commandLine.appendSwitch(" --no-sandbox");
}

const sandboxDisabled = process.platform === "linux" && !linuxSandboxEnabled;

if (app.isPackaged) {
  console.log("Qwery Studio Desktop - Packaged version");
}

const shouldUseBundledServer = app.isPackaged || process.env.NODE_ENV === "production";
const isDevelopment = !shouldUseBundledServer;
const devRendererUrl = process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000";
const productionServerPort = 3000;
const productionServerUrl = `http://localhost:${productionServerPort}`;

let serverProcess: ChildProcess | undefined;
let mainWindow: BrowserWindow | undefined;
let cachedAppIcon: string | undefined;

const resolveAppIcon = (): string | undefined => {
  if (app.isPackaged) {
    const packagedIcon = path.join(process.resourcesPath, "icons", "icon.png");
    if (existsSync(packagedIcon)) {
      return packagedIcon;
    }
  }

  const repoIcon = path.join(app.getAppPath(), "resources", "icons", "icon.png");
  if (existsSync(repoIcon)) {
    return repoIcon;
  }

  return undefined;
};

const prepareAppIcon = (): string | undefined => {
  const iconPath = resolveAppIcon();

  if (!iconPath) {
    console.warn(
      "[main.ts] Application icon not found. Falling back to Electron default icon.",
    );
    return undefined;
  }

  cachedAppIcon = iconPath;

  if (process.platform === "darwin" && app.dock) {
    try {
      app.dock.setIcon(iconPath);
    } catch (error) {
      console.warn("[main.ts] Failed to set macOS dock icon", error);
    }
  }

  return iconPath;
};

const startProductionServer = async (): Promise<void> => {
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "server", "server.js")
    : path.join(__dirname, "..", "server", "server.js");
  
  console.log("Starting production server at:", serverPath);
  
  if (!existsSync(serverPath)) {
    throw new Error(`Server file not found at ${serverPath}`);
  }
  
  const serverDir = path.dirname(serverPath);
  console.log("Server directory:", serverDir);
  
  const serverEnv = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(productionServerPort),
    ELECTRON_RUN_AS_SERVER: "true",
  };
  
  console.log("Spawning server process");
  
  const execPath = process.execPath;
  const execArgs: string[] = [];
  
  if (sandboxDisabled) {
    execArgs.push("--no-sandbox");
  }

  execArgs.push(serverPath);
  
  console.log("Using Electron's Node.js runtime for server process");
  console.log("Server script:", serverPath);
  console.log("Exec args:", execArgs.join(" "));
  
  serverProcess = spawn(execPath, execArgs, {
    env: serverEnv,
    cwd: serverDir, 
    stdio: ["ignore", "pipe", "pipe"],
  });


  serverProcess.on("error", (error) => {
    console.error("Failed to start production server", error);
  });

  serverProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`Production server exited with code ${code}`);
    }
    if (signal) {
      console.error(`Production server killed with signal ${signal}`);
    }
  });

  let serverOutput = "";
  let serverErrors = "";
  
  serverProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log(`[Server stdout]: ${output}`);
  });

  serverProcess.stderr?.on("data", (data) => {
    const output = data.toString();
    serverErrors += output;
    console.error(`[Server stderr]: ${output}`);
  });

  await new Promise<void>((resolve, reject) => {
    if (!serverProcess) {
      reject(new Error("Failed to spawn server process"));
      return;
    }
    
    const exitHandler = (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timeout);
      const errorDetails = serverErrors || serverOutput || "No output from server";
      if (code !== null && code !== 0) {
        reject(new Error(`Server process exited with code ${code} before startup completed.\n\nError output:\n${errorDetails}`));
      } else if (signal) {
        reject(new Error(`Server process was killed with signal ${signal} before startup completed.\n\nError output:\n${errorDetails}`));
      }
    };
    
    serverProcess.once("exit", exitHandler);
    
    const timeout = setTimeout(() => {
      if (serverProcess) {
        serverProcess.removeListener("exit", exitHandler);
      }
      const errorDetails = serverErrors || serverOutput || "No output from server";
      reject(new Error(`Server startup timeout - server at ${serverPath} did not respond on ${productionServerUrl}\n\nServer output:\n${errorDetails}`));
    }, 30000);

    let attempts = 0;
    const maxAttempts = 300; 

    const checkServer = () => {
      attempts++;
      const url = new URL(productionServerUrl);
      const request = http.get({
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        timeout: 2000,
      }, (response) => {
        request.destroy();
        if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
          clearTimeout(timeout);
          if (serverProcess) {
            serverProcess.removeListener("exit", exitHandler);
          }
          console.log(`Production server ready at ${productionServerUrl} after ${attempts} attempts`);
          resolve();
        } else {
          if (attempts >= maxAttempts) {
            clearTimeout(timeout);
            if (serverProcess) {
              serverProcess.removeListener("exit", exitHandler);
            }
            reject(new Error(`Server responded but returned status ${response.statusCode}`));
          } else {
            setTimeout(checkServer, 100);
          }
        }
      });
      
      request.on("error", (error) => {
        request.destroy();
        if (attempts >= maxAttempts) {
          clearTimeout(timeout);
          if (serverProcess) {
            serverProcess.removeListener("exit", exitHandler);
          }
          reject(new Error(`Server did not become available: ${error.message}`));
        } else {
          setTimeout(checkServer, 100);
        }
      });
      
      request.on("timeout", () => {
        request.destroy();
        if (attempts >= maxAttempts) {
          clearTimeout(timeout);
          if (serverProcess) {
            serverProcess.removeListener("exit", exitHandler);
          }
          reject(new Error(`Server did not respond within timeout`));
        } else {
          setTimeout(checkServer, 100);
        }
      });
    };

    setTimeout(checkServer, 500);
  }).catch((error) => {
    console.error("Server startup failed:", error);
    if (serverProcess) {
      serverProcess.kill();
      serverProcess = undefined;
    }
    throw error;
  });
};

const resolveRendererUrl = (): string => {
  if (isDevelopment) {
    return devRendererUrl;
  }

  return productionServerUrl;
};

const createMainWindow = async (): Promise<BrowserWindow> => {
  const icon = cachedAppIcon ?? resolveAppIcon();
  const isMac = process.platform === "darwin";
  const isWindows = process.platform === "win32";

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: "#0a0a0a",
    title: "Qwery Studio",
    frame: false, 
    icon,
    titleBarStyle: isMac ? "hidden" : undefined,
    titleBarOverlay: isMac
      ? {
          color: "#0f172a",
          symbolColor: "#ffffff",
          height: 40,
        }
      : undefined,
    transparent: false,
    roundedCorners: false,
    vibrancy: process.platform === "darwin" ? "under-window" : undefined,
    visualEffectState: process.platform === "darwin" ? "active" : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();
    const shouldOpenDevTools = 
      (!app.isPackaged && isDevelopment && process.env.ELECTRON_OPEN_DEVTOOLS !== "false") ||
      (process.env.DEBUG === "true") ||
      (app.isPackaged && process.env.ELECTRON_OPEN_DEVTOOLS === "true");

    if (shouldOpenDevTools) {
      window.webContents.openDevTools({ mode: "detach" });
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });

  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://") && !url.startsWith(devRendererUrl)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  window.on("closed", () => {
    mainWindow = undefined;
  });

  window.on("maximize", () => {
    window.webContents.send("window:maximize-changed", true);
  });
  window.on("unmaximize", () => {
    window.webContents.send("window:maximize-changed", false);
  });

  const rendererUrl = resolveRendererUrl();
  console.log("Loading renderer URL:", rendererUrl);

  window.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error("Failed to load URL:", {
      errorCode,
      errorDescription,
      validatedURL,
      rendererUrl,
    });
    if (app.isPackaged) {
      window.webContents.openDevTools({ mode: "detach" });
      window.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui; color: #fff; background: #111827; padding: 40px;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to load application</h1>
          <p style="color: #9ca3af; margin-bottom: 8px;">Error Code: ${errorCode}</p>
          <p style="color: #9ca3af; margin-bottom: 8px;">${errorDescription}</p>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">URL: ${validatedURL || rendererUrl}</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Check DevTools console for more details</p>
        </div>';
      `).catch(() => {});
    }
  });

  window.webContents.on("console-message", (event, level, message) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  window.webContents.on("before-input-event", (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === "i") || input.key === "F12") {
      window.webContents.openDevTools({ mode: "detach" });
    }
  });

  try {
    console.log("Attempting to load URL:", rendererUrl);
    await window.loadURL(rendererUrl);
    
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const pageContent = await window.webContents.executeJavaScript(`
      document.body ? document.body.innerHTML.trim() : 'NO_BODY'
    `).catch(() => 'ERROR_READING_BODY');
    
    console.log("Page content check:", pageContent === '' ? 'EMPTY_BODY' : pageContent.substring(0, 100));
    
    if (pageContent === '' || pageContent === 'NO_BODY' || pageContent === 'ERROR_READING_BODY') {
      console.warn("Page loaded but body is empty or error reading - opening DevTools for debugging");
      if (app.isPackaged) {
        window.webContents.openDevTools({ mode: "detach" });
      }
      const errors = await window.webContents.executeJavaScript(`
        ({
          scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(Boolean),
          title: document.title,
          readyState: document.readyState,
          location: window.location.href
        })
      `).catch(() => ({}));
      console.log("Page debug info:", errors);
      
      if (pageContent === '' || pageContent === 'NO_BODY') {
        window.webContents.executeJavaScript(`
          if (!document.body || document.body.innerHTML.trim() === '') {
            document.body = document.createElement('body');
            document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui; color: #fff; background: #111827; padding: 40px;">
              <h1 style="font-size: 24px; margin-bottom: 16px;">Application Loading...</h1>
              <p style="color: #9ca3af; margin-bottom: 8px;">The page appears to be empty.</p>
              <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">URL: ${rendererUrl}</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Check DevTools console for errors</p>
            </div>';
          }
        `).catch(() => {});
      }
    }
  } catch (error) {
    console.error("Failed to load renderer", error);
    if (app.isPackaged) {
      window.webContents.openDevTools({ mode: "detach" });
      window.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui; color: #fff; background: #111827; padding: 40px;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to load application</h1>
          <p style="color: #9ca3af; margin-bottom: 8px;">Error: ${error instanceof Error ? error.message : String(error)}</p>
          <p style="color: #9ca3af; font-size: 14px; margin-bottom: 16px;">URL: ${rendererUrl}</p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Check DevTools console for more details</p>
        </div>';
      `).catch(() => {});
    }
    throw error;
  }

  return window;
};

const bootstrap = async () => {
  await app.whenReady();

  prepareAppIcon();
  
  if (shouldUseBundledServer) {
    console.log("Using bundled server (packaged:", app.isPackaged, ", NODE_ENV:", process.env.NODE_ENV, ")");
    try {
      await startProductionServer();
    } catch (error) {
      console.error("Failed to start production server:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      const serverPath = app.isPackaged
        ? path.join(process.resourcesPath, "server", "index.js")
        : path.join(__dirname, "..", "server", "index.js");
      const errorWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });
      const escapedMessage = errorMessage
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\n/g, "<br>");
      errorWindow.loadURL(`data:text/html,<html><body style="font-family: system-ui; padding: 40px; max-width: 800px; margin: 0 auto;">
        <h1 style="color: #ef4444; margin-bottom: 20px;">Server Startup Failed</h1>
        <div style="background: #1f2937; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <pre style="color: #f3f4f6; white-space: pre-wrap; word-wrap: break-word; font-size: 12px; margin: 0;">${escapedMessage}</pre>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Please check the console for more details.</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">Server path: ${serverPath}</p>
      </body></html>`);
      return;
    }
  } else {
    console.log("Using external dev server at", devRendererUrl);
  }
  
  mainWindow = await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = await createMainWindow();
    }
  });
};

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.handle("window:minimize", () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle("window:close", () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

ipcMain.handle("window:is-maximized", () => {
  return mainWindow?.isMaximized() ?? false;
});

void bootstrap();
}

