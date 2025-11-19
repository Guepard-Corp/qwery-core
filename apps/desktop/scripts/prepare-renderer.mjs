import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(import.meta.dirname, "../../");
const webBuildClientDir = path.join(rootDir, "web/build/client");
const webBuildServerDir = path.join(rootDir, "web/build/server");
const targetRendererDir = path.resolve(import.meta.dirname, "../dist/renderer");
const targetServerDir = path.resolve(import.meta.dirname, "../dist/server");


const ensureWebBuildExists = async () => {
  try {
    const stats = await stat(webBuildClientDir);

    if (!stats.isDirectory()) {
      throw new Error();
    }
  } catch (error) {
    throw new Error(
      `Renderer assets missing at ${webBuildClientDir}. Run \"pnpm --filter web build\" before packaging the desktop app.`,
      { cause: error },
    );
  }
};

const copyRenderer = async () => {
  await ensureWebBuildExists();
  await rm(targetRendererDir, { recursive: true, force: true });
  await mkdir(targetRendererDir, { recursive: true });
  await cp(webBuildClientDir, targetRendererDir, { recursive: true, dereference: true });
  
  // Copy server build for production SSR
  try {
    await stat(webBuildServerDir);
    await rm(targetServerDir, { recursive: true, force: true });
    await mkdir(targetServerDir, { recursive: true });
    await cp(webBuildServerDir, targetServerDir, { recursive: true, dereference: true });

    const serverStaticDir = path.join(targetServerDir, "public");
    await rm(serverStaticDir, { recursive: true, force: true });
    await mkdir(serverStaticDir, { recursive: true });
    await cp(webBuildClientDir, serverStaticDir, { recursive: true, dereference: true });
    
    // Add package.json with "type": "module" so Node.js treats server files as ES modules
    const { writeFile } = await import("node:fs/promises");
    const serverPackageJson = JSON.stringify({ 
      type: "module"
    }, null, 2);
    await writeFile(
      path.join(targetServerDir, "package.json"),
      serverPackageJson,
      "utf-8"
    );
    
    // Create server entry point that can be run directly
    const serverEntryCode = `import { createRequestListener } from "@react-router/node";
import * as serverBuild from "./index.js";
import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Note: Vite environment variables (VITE_*) are embedded at BUILD time
// They must be set during the build process, not at runtime
// Set NODE_ENV for runtime
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "production";
}

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "localhost";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const staticRootCandidates = [
  path.resolve(currentDir, "public"),
  path.resolve(currentDir, "../renderer"),
  path.resolve(currentDir, "../../renderer"),
];
const staticRoots = Array.from(
  new Set(staticRootCandidates.filter((dir) => existsSync(dir))),
);

const mimeTypes = new Map([
  [".css", "text/css"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".ico", "image/x-icon"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json"],
  [".webp", "image/webp"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".woff2", "font/woff2"],
  [".woff", "font/woff"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".map", "application/json"],
  [".wasm", "application/wasm"],
  [".data", "application/octet-stream"],
]);

const getMimeFromPath = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return mimeTypes.get(extension);
};

const shouldAttemptStatic = (pathname) => {
  if (pathname === "/favicon.ico") {
    return true;
  }
  return (
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/public/")
  );
};

const tryServeStaticAsset = async (req, res) => {
  if (staticRoots.length === 0) {
    return false;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const authority = req.headers.host || host || "localhost";
  let requestUrl;

  try {
    requestUrl = new URL(req.url, \`http://\${authority}\`);
  } catch {
    return false;
  }

  const pathname = decodeURIComponent(requestUrl.pathname);

  if (!shouldAttemptStatic(pathname)) {
    return false;
  }

  const relativePath =
    pathname === "/favicon.ico" ? "images/favicon/favicon.ico" : pathname.slice(1);

  for (const root of staticRoots) {
    const candidatePath = path.normalize(path.join(root, relativePath));
    if (!candidatePath.startsWith(root)) {
      continue;
    }

    try {
      const fileStats = await stat(candidatePath);
      if (!fileStats.isFile()) {
        continue;
      }

      const mimeType = getMimeFromPath(candidatePath);
      if (mimeType) {
        res.setHeader("Content-Type", mimeType);
      }

      res.setHeader("Content-Length", fileStats.size);

      if (req.method === "HEAD") {
        res.end();
      } else {
        createReadStream(candidatePath).pipe(res);
      }

      return true;
    } catch {
      continue;
    }
  }

  return false;
};

const requestListener = createRequestListener({
  build: serverBuild,
  mode: process.env.NODE_ENV || "production",
});

const server = http.createServer((req, res) => {
  const handleRequest = async () => {
    if (await tryServeStaticAsset(req, res)) {
      return;
    }

    await requestListener(req, res);
  };

  handleRequest().catch((error) => {
    console.error("Server error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });
});

server.listen(port, host, () => {
  console.log(\`Server running at http://\${host}:\${port}\`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  server.close(() => {
    process.exit(0);
  });
});
`;
    await writeFile(
      path.join(targetServerDir, "server.js"),
      serverEntryCode,
      "utf-8"
    );

    // Bundle server runtime dependencies that aren't part of the compiled build output
    const { createRequire } = await import("node:module");
    const { readFile } = await import("node:fs/promises");
    const webPackageJsonPath = path.join(rootDir, "web/package.json");
    const require = createRequire(webPackageJsonPath);

    const seenDependencies = new Set();
    /**
     * Resolve the root directory for a module even if package.json is not exported.
     * @param {string} moduleName
     * @returns {Promise<{ packageJsonPath: string, moduleDir: string } | undefined>}
     */
    const resolveModuleRoot = async (moduleName) => {
      try {
        let packageJsonPath;
          try {
            // Try resolving relative to web/
            packageJsonPath = require.resolve(`${moduleName}/package.json`);
          } catch {
            // Fallback: look in the root of the monorepo
            const { createRequire } = await import("node:module");
            const rootRequire = createRequire(path.join(rootDir, "package.json"));
            try {
              packageJsonPath = rootRequire.resolve(`${moduleName}/package.json`);
            } catch (rootErr) {
              console.warn(`Skipping ${moduleName}: not found in web/ or root node_modules`);
              return undefined;
            }
          }
        return { packageJsonPath, moduleDir: path.dirname(packageJsonPath) };
      } catch {
        try {
          const entryPath = require.resolve(moduleName);
          let currentDir = path.dirname(entryPath);
          const root = path.parse(currentDir).root;
          while (currentDir !== root) {
            const candidate = path.join(currentDir, "package.json");
            try {
              await stat(candidate);
              return { packageJsonPath: candidate, moduleDir: path.dirname(candidate) };
            } catch {
              currentDir = path.dirname(currentDir);
            }
          }
        } catch (entryError) {
          console.warn(`Skipping server dependency "${moduleName}" (unable to resolve entry):`, entryError);
          return undefined;
        }
        console.warn(`Skipping server dependency "${moduleName}" (package root not found)`);
        return undefined;
      }
    };
    /**
     * @param {string} moduleName
     */
    const ensureServerDependency = async (moduleName) => {
      if (seenDependencies.has(moduleName)) {
        return;
      }
      if (!moduleName || moduleName.startsWith("node:")) {
        return;
      }
      seenDependencies.add(moduleName);

      const resolved = await resolveModuleRoot(moduleName);
      if (!resolved) {
        return;
      }

      const { packageJsonPath, moduleDir } = resolved;
      const dependencyTargetDir = path.join(targetServerDir, "node_modules", moduleName);
      try {
        await rm(dependencyTargetDir, { recursive: true, force: true });
        await mkdir(path.dirname(dependencyTargetDir), { recursive: true });
        await cp(moduleDir, dependencyTargetDir, { recursive: true, dereference: true });
      } catch (copyError) {
        console.warn(`Failed to copy server dependency "${moduleName}":`, copyError);
      }

      try {
        const packageJson = JSON.parse(await readFile(packageJsonPath, "utf-8"));
        const childDeps = new Set([
          ...Object.keys(packageJson.dependencies ?? {}),
          ...Object.keys(packageJson.peerDependencies ?? {}),
          ...Object.keys(packageJson.optionalDependencies ?? {}),
        ]);
        for (const child of childDeps) {
          await ensureServerDependency(child);
        }
      } catch (childError) {
        console.warn(`Failed to process dependencies for "${moduleName}":`, childError);
      }
    };

    const dependencyNames = new Set(["@react-router/node"]);
    try {
      const webPackageJson = JSON.parse(await readFile(webPackageJsonPath, "utf-8"));
      for (const name of Object.keys(webPackageJson.dependencies ?? {})) {
        dependencyNames.add(name);
      }
      for (const name of Object.keys(webPackageJson.peerDependencies ?? {})) {
        dependencyNames.add(name);
      }
    } catch (dependenciesError) {
      console.warn("Failed to read web package dependencies:", dependenciesError);
    }

    for (const moduleName of dependencyNames) {
      await ensureServerDependency(moduleName);
    }
  } catch (error) {
    console.warn("Failed to prepare packaged server assets:", error);
  }
};

copyRenderer().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

