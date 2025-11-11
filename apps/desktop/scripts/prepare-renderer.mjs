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
  await cp(webBuildClientDir, targetRendererDir, { recursive: true });
  
  // Copy server build for production SSR
  try {
    await stat(webBuildServerDir);
    await rm(targetServerDir, { recursive: true, force: true });
    await mkdir(targetServerDir, { recursive: true });
    await cp(webBuildServerDir, targetServerDir, { recursive: true });
    
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
  } catch (error) {
    console.warn("Server build not found, skipping server copy:", error);
  }
};

copyRenderer().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

