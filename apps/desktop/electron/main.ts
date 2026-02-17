import { app, BrowserWindow, ipcMain, shell } from "electron";
import { spawn, ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

// Enable console logging in production for debugging
if (app.isPackaged) {
  // In packaged apps, console.log goes to system console
  // On macOS: Console.app or terminal
  // On Windows: Event Viewer or terminal
  // On Linux: journalctl or terminal
  console.log("Qwery Studio Desktop - Packaged version");
}

// Use bundled server if app is packaged OR if explicitly in production mode
const shouldUseBundledServer = app.isPackaged || process.env.NODE_ENV === "production";
const isDevelopment = !shouldUseBundledServer;
const devRendererUrl = process.env.ELECTRON_RENDERER_URL ?? "http://localhost:3000";
const productionServerPort = 3000;
const productionServerUrl = `http://localhost:${productionServerPort}`;

let serverProcess: ChildProcess | undefined;
let mainWindow: BrowserWindow | undefined;

const startProductionServer = async (): Promise<void> => {
  // In packaged app, server is in extraResources (outside asar)
  // In development build, it's in the dist folder
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, "server", "index.js")
    : path.join(__dirname, "..", "server", "index.js");
  
  console.log("Starting production server at:", serverPath);
  
  // Check if server file exists
  if (!existsSync(serverPath)) {
    throw new Error(`Server file not found at ${serverPath}`);
  }
  
  const serverDir = path.dirname(serverPath);
  console.log("Server directory:", serverDir);
  
  const serverEnv = {
    ...process.env,
    NODE_ENV: "production",
    PORT: String(productionServerPort),
  };
  
  console.log("Spawning server process");
  
  // Use Electron's Node.js runtime directly - it's already bundled and doesn't require external dependencies
  const execPath = process.execPath;
  const execArgs: string[] = [serverPath];
  
  console.log("Using Electron's Node.js runtime for server process");
  
  serverProcess = spawn(execPath, execArgs, {
    env: serverEnv,
    cwd: serverDir, // Set working directory to server dir so package.json is found
    stdio: ["ignore", "pipe", "pipe"], // Capture stdout and stderr
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

  // Collect server output for error messages
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
    
    // Handle early exit
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
      reject(new Error(`Server startup timeout - server at ${serverPath} did not respond on ${productionServerUrl}`));
    }, 30000);

    let attempts = 0;
    const maxAttempts = 300; // 30 seconds with 100ms intervals

    const checkServer = () => {
      attempts++;
      fetch(productionServerUrl)
        .then((response) => {
          if (response.ok) {
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
              reject(new Error(`Server responded but returned status ${response.status}`));
            } else {
              setTimeout(checkServer, 100);
            }
          }
        })
        .catch((error) => {
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
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: "#111827",
    title: "Qwery Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once("ready-to-show", () => {
    window.show();

    // Enable DevTools in production if DEBUG env var is set
    const shouldOpenDevTools = 
      (!app.isPackaged && isDevelopment && process.env.ELECTRON_OPEN_DEVTOOLS !== "false") ||
      (process.env.DEBUG === "true");

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

  const rendererUrl = resolveRendererUrl();
  console.log("Loading renderer URL:", rendererUrl);

  try {
    await window.loadURL(rendererUrl);
  } catch (error) {
    console.error("Failed to load renderer", error);
    if (!isDevelopment) {
      // In production, show error to user
      window.webContents.executeJavaScript(`
        document.body.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: system-ui; color: #fff; background: #111827;">
          <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to load application</h1>
          <p style="color: #9ca3af; margin-bottom: 8px;">Something went wrong while starting the app. Please restart and try again.</p>
          <p style="color: #9ca3af; font-size: 14px;">URL: ${rendererUrl}</p>
        </div>';
      `).catch(() => {});
      throw error;
    }
  }

  return window;
};

const bootstrap = async () => {
  await app.whenReady();
  
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
      // Show error to user with more details
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

void bootstrap();

