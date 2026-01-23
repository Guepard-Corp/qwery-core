#!/usr/bin/env node
import { execSync } from "child_process";
import { compare, valid, gte, satisfies } from "semver";
import * as fs from "fs";
import * as path from "path";

const ENABLE_PNPM_AUDIT = process.env.ENABLE_PNPM_AUDIT === "true";

type Vulnerability = {
  cve: string;
  severity: "critical" | "high" | "medium";
  description: string;
};

type PackageCheck = {
  name: string;
  vulnerabilities: {
    cve: string;
    vulnerableRanges: string[];
    patchedVersions: string[];
  }[];
};

const CVES: Record<string, Vulnerability> = {
  "CVE-2025-55182": {
    cve: "CVE-2025-55182",
    severity: "critical",
    description: "React2Shell - Remote Code Execution (RCE) in React Server Components",
  },
  "CVE-2025-55184": {
    cve: "CVE-2025-55184",
    severity: "high",
    description: "Denial of Service (DoS) - Infinite loops causing server hangs",
  },
  "CVE-2025-67779": {
    cve: "CVE-2025-67779",
    severity: "high",
    description: "Denial of Service (DoS) - Server hangs",
  },
  "CVE-2025-55183": {
    cve: "CVE-2025-55183",
    severity: "medium",
    description: "Source Code Exposure - Leaks Server Function endpoint code",
  },
};

const packages: PackageCheck[] = [
  {
    name: "react-server-dom-webpack",
    vulnerabilities: [
      {
        cve: "CVE-2025-55182",
        vulnerableRanges: [
          "19.0.0",
          ">=19.1.0 <19.1.2",
          "19.2.0",
        ],
        patchedVersions: ["19.0.1", "19.1.2", "19.2.1"],
      },
      {
        cve: "CVE-2025-55184",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
      {
        cve: "CVE-2025-67779",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
      {
        cve: "CVE-2025-55183",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
    ],
  },
  {
    name: "react-server-dom-parcel",
    vulnerabilities: [
      {
        cve: "CVE-2025-55182",
        vulnerableRanges: [
          "19.0.0",
          ">=19.1.0 <19.1.2",
          "19.2.0",
        ],
        patchedVersions: ["19.0.1", "19.1.2", "19.2.1"],
      },
      {
        cve: "CVE-2025-55184",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
      {
        cve: "CVE-2025-67779",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
      {
        cve: "CVE-2025-55183",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
    ],
  },
  {
    name: "react-server-dom-turbopack",
    vulnerabilities: [
      {
        cve: "CVE-2025-55182",
        vulnerableRanges: [
          "19.0.0",
          ">=19.1.0 <19.1.2",
          "19.2.0",
        ],
        patchedVersions: ["19.0.1", "19.1.2", "19.2.1"],
      },
      {
        cve: "CVE-2025-55184",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
      {
        cve: "CVE-2025-67779",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
      {
        cve: "CVE-2025-55183",
        vulnerableRanges: [
          ">=19.0.0 <19.0.3",
          ">=19.1.0 <19.1.4",
          ">=19.2.0 <19.2.3",
        ],
        patchedVersions: ["19.0.3", "19.1.4", "19.2.3"],
      },
    ],
  },
  {
    name: "next",
    vulnerabilities: [
      {
        cve: "CVE-2025-55182",
        vulnerableRanges: [
          ">=15.0.0 <15.0.5",
          ">=15.1.0 <15.1.9",
          ">=15.2.0 <15.2.6",
          ">=15.3.0 <15.3.6",
          ">=15.4.0 <15.4.8",
          ">=15.5.0 <15.5.7",
          ">=16.0.0 <16.0.7",
        ],
        patchedVersions: ["15.0.5", "15.1.9", "15.2.6", "15.3.6", "15.4.8", "15.5.7", "16.0.7"],
      },
    ],
  },
];

function getInstalledVersion(pkg: string, preferDirect = false): string | null {
  if (preferDirect) {
    try {
      const workspaceRoot = process.cwd();
      const catalogPath = path.join(workspaceRoot, "pnpm-workspace.yaml");
      if (fs.existsSync(catalogPath)) {
        const catalogContent = fs.readFileSync(catalogPath, "utf-8");
        const catalogMatch = catalogContent.match(
          new RegExp(`['"]${pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]:\\s*['"]([^'"]+)['"]`),
        );
        if (catalogMatch && catalogMatch[1]) {
          const catalogVersion = catalogMatch[1].replace(/[\^~=]/, "");
          if (catalogVersion && catalogVersion !== "catalog:") {
            return catalogVersion;
          }
        }
      }
    } catch {
      // fall through
    }
  }

  try {
    const result = execSync(`pnpm why ${pkg} --json`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const parsed = JSON.parse(result);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const version = parsed[0].version;
      if (version && version !== "0.1.0") {
        return version;
      }
    }
  } catch {
    // fall through
  }

  try {
    const packagePath = path.join(process.cwd(), "node_modules", pkg, "package.json");
    if (fs.existsSync(packagePath)) {
      const pkgJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      const version = pkgJson.version;
      if (version && version !== "0.1.0") {
        return version;
      }
    }
  } catch {
    // fall through
  }

  return null;
}

function isVulnerable(
  version: string,
  vulnerableRanges: string[],
  patchedVersions: string[],
): { vulnerable: boolean; reason: string } {
  if (!valid(version)) {
    return { vulnerable: false, reason: "Invalid semver" };
  }

  for (const patched of patchedVersions) {
    if (gte(version, patched)) {
      return { vulnerable: false, reason: `Patched (>= ${patched})` };
    }
  }

  for (const range of vulnerableRanges) {
    if (satisfies(version, range)) {
      return { vulnerable: true, reason: `Vulnerable (${range})` };
    }
  }

  return { vulnerable: false, reason: "Not in known vulnerable range" };
}

function getMinPatchedVersion(patchedVersions: string[]): string {
  const sorted = patchedVersions.sort((a, b) => compare(a, b));
  return sorted[0] || "unknown";
}

type FrameworkInfo = {
  name: string;
  version: string | null;
  rscEnabled: boolean;
  description: string;
};

function detectFramework(): FrameworkInfo {
  const checkWorkspacePackage = (pkgName: string): string | null => {
    try {
      const workspaceRoot = process.cwd();
      const catalogPath = path.join(workspaceRoot, "pnpm-workspace.yaml");
      if (fs.existsSync(catalogPath)) {
        const catalogContent = fs.readFileSync(catalogPath, "utf-8");
        const catalogMatch = catalogContent.match(new RegExp(`['"]${pkgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"]:\\s*['"]([^'"]+)['"]`));
        if (catalogMatch && catalogMatch[1]) {
          return catalogMatch[1].replace(/[\^~]/, "");
        }
      }
      
      const appsDir = path.join(workspaceRoot, "apps");
      if (fs.existsSync(appsDir)) {
        const apps = fs.readdirSync(appsDir);
        for (const app of apps) {
          const appPkgJson = path.join(appsDir, app, "package.json");
          if (fs.existsSync(appPkgJson)) {
            const pkgJson = JSON.parse(fs.readFileSync(appPkgJson, "utf-8"));
            const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
            if (deps[pkgName]) {
              const version = deps[pkgName].replace(/[\^~=]/, "");
              if (version !== "catalog:") {
                return version;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  };

  const nextVersion = getInstalledVersion("next") || checkWorkspacePackage("next");
  const remixVersion = getInstalledVersion("@remix-run/react") || checkWorkspacePackage("@remix-run/react");
  const reactRouterVersion = getInstalledVersion("react-router") || getInstalledVersion("@react-router/dev") || checkWorkspacePackage("react-router");
  const viteVersion = getInstalledVersion("vite") || checkWorkspacePackage("vite");

  if (nextVersion) {
    return {
      name: "Next.js",
      version: nextVersion,
      rscEnabled: true,
      description: "Next.js App Router uses React Server Components",
    };
  }

  if (remixVersion) {
    return {
      name: "Remix",
      version: remixVersion,
      rscEnabled: false,
      description: "Remix does not use React Server Components",
    };
  }

  if (reactRouterVersion) {
    const version = reactRouterVersion;
    const major = parseInt(version.split(".")[0] || "0", 10);
    return {
      name: "React Router",
      version: reactRouterVersion,
      rscEnabled: false,
      description: `React Router ${major} (client-rendered, no RSC)`,
    };
  }

  if (viteVersion) {
    return {
      name: "Vite",
      version: viteVersion,
      rscEnabled: false,
      description: "Vite (client-rendered, no RSC)",
    };
  }

  return {
    name: "Unknown/Other",
    version: null,
    rscEnabled: false,
    description: "Framework not detected or custom setup",
  };
}

function hasRSCPackages(): boolean {
  return (
    getInstalledVersion("react-server-dom-webpack") !== null ||
    getInstalledVersion("react-server-dom-parcel") !== null ||
    getInstalledVersion("react-server-dom-turbopack") !== null
  );
}

function isExploitable(
  framework: FrameworkInfo,
  hasRSC: boolean,
  vulnerablePackages: string[],
): { exploitable: boolean; reason: string } {
  if (vulnerablePackages.length === 0) {
    return { exploitable: false, reason: "No vulnerable packages found" };
  }

  if (framework.rscEnabled && hasRSC) {
    return {
      exploitable: true,
      reason: `CRITICAL: ${framework.name} with RSC packages is exploitable`,
    };
  }

  if (hasRSC && vulnerablePackages.length > 0) {
    return {
      exploitable: true,
      reason: "RSC packages present and vulnerable (even without framework)",
    };
  }

  if (framework.rscEnabled && vulnerablePackages.length > 0) {
    return {
      exploitable: true,
      reason: `${framework.name} uses RSC and vulnerable packages detected`,
    };
  }

  return {
    exploitable: false,
    reason: "Vulnerable packages present but RSC not enabled/exploitable",
  };
}

function getPnpmAuditResults(): Array<{ name: string; severity: string; cve?: string }> | null {
  if (!ENABLE_PNPM_AUDIT) {
    return null;
  }

  try {
    const result = execSync("pnpm audit --json", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    const audit = JSON.parse(result);

    if (!audit.vulnerabilities) {
      return null;
    }

    const reactRelated: Array<{ name: string; severity: string; cve?: string }> = [];

    for (const [pkg, vuln] of Object.entries(audit.vulnerabilities as Record<string, any>)) {
      if (
        pkg.includes("react") ||
        pkg.includes("next") ||
        vuln.via?.some((v: any) => v.title?.toLowerCase().includes("react"))
      ) {
        reactRelated.push({
          name: pkg,
          severity: vuln.severity || "unknown",
          cve: vuln.via?.[0]?.url?.match(/CVE-\d{4}-\d+/)?.[0],
        });
      }
    }

    return reactRelated.length > 0 ? reactRelated : null;
  } catch {
    return null;
  }
}

console.log("🔍 Checking React/Next.js packages for Nov–Dec 2025 CVEs...\n");

const pnpmAuditResults = getPnpmAuditResults();
if (pnpmAuditResults && pnpmAuditResults.length > 0) {
  console.log("📊 pnpm audit correlation (React ecosystem only):");
  for (const audit of pnpmAuditResults) {
    console.log(`   ${audit.severity === "high" || audit.severity === "critical" ? "🔴" : "🟡"} ${audit.name} (${audit.severity})${audit.cve ? ` - ${audit.cve}` : ""}`);
  }
  console.log("");
}

const framework = detectFramework();
const reactVersion = getInstalledVersion("react", true);
const reactDomVersion = getInstalledVersion("react-dom", true);
const hasRSC = hasRSCPackages();

console.log("📋 Environment Detection:");
if (reactVersion) {
  console.log(`   React: ${reactVersion}`);
}
if (reactDomVersion) {
  console.log(`   react-dom: ${reactDomVersion}`);
}
console.log(`   Framework: ${framework.name}${framework.version ? ` v${framework.version}` : ""}`);
console.log(`   ${framework.description}`);
console.log(`   RSC Packages: ${hasRSC ? "✅ Detected" : "❌ Not found"}`);
if (!hasRSC && !framework.rscEnabled) {
  console.log(`   ℹ️  RSC not detected — React2Shell not exploitable`);
}
console.log("");

let hasVulnerabilities = false;
const results: Array<{
  package: string;
  version: string | null;
  vulnerabilities: Array<{ cve: string; severity: string; description: string }>;
}> = [];

const checkedPackages: string[] = [];

for (const pkg of packages) {
  const installed = getInstalledVersion(pkg.name, true);
  checkedPackages.push(`${pkg.name}: ${installed || "not found"}`);
  if (!installed) {
    continue;
  }

  const foundVulns: Array<{ cve: string; severity: string; description: string }> = [];

  for (const vuln of pkg.vulnerabilities) {
    const check = isVulnerable(installed, vuln.vulnerableRanges, vuln.patchedVersions);
    if (check.vulnerable) {
      const cveInfo = CVES[vuln.cve];
      foundVulns.push({
        cve: vuln.cve,
        severity: cveInfo?.severity || "unknown",
        description: cveInfo?.description || vuln.cve,
      });
      hasVulnerabilities = true;
    }
  }

  if (foundVulns.length > 0) {
    results.push({
      package: pkg.name,
      version: installed,
      vulnerabilities: foundVulns,
    });
  }
}

const vulnerablePackageNames = results.map((r) => r.package);
const exploitability = isExploitable(framework, hasRSC, vulnerablePackageNames);

if (results.length === 0) {
  console.log("✅ No vulnerable packages found!\n");
  console.log("📦 Packages checked:");
  for (const pkg of packages) {
    const installed = getInstalledVersion(pkg.name);
    if (installed) {
      console.log(`   ✅ ${pkg.name} v${installed} is safe`);
    }
  }
  console.log("");
  console.log("✅ Security Status: CLEAN");
  console.log(`   ${exploitability.reason}`);
} else {
  console.log("❌ VULNERABILITIES FOUND:\n");
  for (const result of results) {
    console.log(`\n📦 ${result.package} v${result.version}`);
    for (const vuln of result.vulnerabilities) {
      const icon = vuln.severity === "critical" ? "🔴" : vuln.severity === "high" ? "🟠" : "🟡";
      console.log(`   ${icon} ${vuln.cve} (${vuln.severity.toUpperCase()}): ${vuln.description}`);
    }

    const pkg = packages.find((p) => p.name === result.package);
    if (pkg) {
      const allPatchedVersions = new Set<string>();
      for (const vuln of pkg.vulnerabilities) {
        for (const patched of vuln.patchedVersions) {
          allPatchedVersions.add(patched);
        }
      }
      const minPatched = getMinPatchedVersion(Array.from(allPatchedVersions));
      console.log(`   💡 Update to: ${minPatched} or later`);
    }
  }
  console.log("\n");
  console.log("🔒 Exploitability Assessment:");
  if (exploitability.exploitable) {
    console.log(`   🔴 ${exploitability.reason}`);
    console.log("   ⚠️  CRITICAL: Immediate action required!");
  } else {
    console.log(`   🟡 ${exploitability.reason}`);
    console.log("   ℹ️  Vulnerable packages found but not exploitable in current setup");
  }
}

if (exploitability.exploitable) {
  console.log("\n⚠️  ACTION REQUIRED: Update vulnerable packages immediately!");
  process.exit(1);
} else if (hasVulnerabilities && !exploitability.exploitable) {
  console.log("\n⚠️  WARNING: Vulnerable packages detected but not exploitable.");
  console.log("   Consider updating anyway for defense-in-depth.");
  process.exit(0);
} else {
  process.exit(0);
}

