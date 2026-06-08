export type UnusedStatus = "ghost" | "unused" | "unknown";

export type UnusedDep = {
  name: string;
  version: string;
  status: UnusedStatus;
};

export type DepScanResult = {
  score: number;
  total: number;
  usedCount: number;
  unused: UnusedDep[];
  implicitlyUsed: string[];
  packageJsonPath: string;
};

const NODE_BUILTINS = new Set([
  "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
  "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
  "events", "fs", "http", "http2", "https", "inspector", "module", "net",
  "os", "path", "perf_hooks", "process", "punycode", "querystring", "readline",
  "repl", "stream", "string_decoder", "sys", "timers", "tls", "trace_events",
  "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
  "fs/promises", "stream/promises", "timers/promises", "dns/promises",
]);

const IMPLICIT_USE = new Set([
  "react", "react-dom", "next", "vue", "svelte", "@angular/core",
  "tslib", "core-js", "regenerator-runtime", "@babel/runtime",
]);

const IMPORT_PATTERNS: RegExp[] = [
  // import x from 'y' | import {a,b} from 'y' | import * as x from 'y' | import 'y'
  /import\s+(?:[\w*{}\n\r\t ,$]+\s+from\s+)?["']([^"']+)["']/g,
  // export ... from 'y' | export * from 'y'
  /export\s+(?:[\w*{}\n\r\t ,$]+\s+)?from\s+["']([^"']+)["']/g,
  // require('y') — not preceded by a word char or dot (avoids foo.require())
  /(?:^|[^.\w$])require\(\s*["']([^"']+)["']\s*\)/g,
  // dynamic import('y')
  /import\(\s*["']([^"']+)["']\s*\)/g,
  // require.resolve('y')
  /require\.resolve\(\s*["']([^"']+)["']\s*\)/g,
];

export function normalizeSpecifier(spec: string): string | null {
  if (!spec) return null;
  // relative / absolute paths
  if (spec.startsWith(".") || spec.startsWith("/")) return null;
  // common path aliases (@/…, ~/…, #internal)
  if (spec.startsWith("@/") || spec.startsWith("~") || spec.startsWith("#")) return null;

  let s = spec.startsWith("node:") ? spec.slice(5) : spec;

  let name: string;
  if (s.startsWith("@")) {
    const parts = s.split("/");
    if (parts.length < 2) return null;
    name = `${parts[0]}/${parts[1]}`;
  } else {
    name = s.split("/")[0];
  }

  if (!name || NODE_BUILTINS.has(name)) return null;
  return name;
}

export function extractPackageNames(content: string): Set<string> {
  const names = new Set<string>();
  for (const re of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const name = normalizeSpecifier(m[1]);
      if (name) names.add(name);
    }
  }
  return names;
}

const RE_SPECIAL = /[.*+?^${}()|[\]\\]/g;
function escapeRegExp(s: string): string {
  return s.replace(RE_SPECIAL, "\\$&");
}

function usedInScripts(name: string, scripts: Record<string, string>): boolean {
  const joined = Object.values(scripts || {}).join(" \n ");
  if (!joined) return false;
  return new RegExp(`(^|[\\s"'./])${escapeRegExp(name)}([\\s"'@/]|$)`).test(joined);
}

export function analyzeDependencies(input: {
  packageJsonPath: string;
  dependencies: Record<string, string>;
  scripts: Record<string, string>;
  files: { path: string; content: string }[];
}): DepScanResult {
  const { packageJsonPath, dependencies, scripts, files } = input;

  const usedNames = new Set<string>();
  for (const f of files) {
    for (const n of extractPackageNames(f.content)) usedNames.add(n);
  }

  const depNames = Object.keys(dependencies || {});
  const unused: UnusedDep[] = [];
  const implicitlyUsed: string[] = [];
  let usedCount = 0;

  for (const name of depNames) {
    if (IMPLICIT_USE.has(name)) {
      implicitlyUsed.push(name);
      usedCount++;
      continue;
    }
    if (usedNames.has(name) || usedInScripts(name, scripts)) {
      usedCount++;
      continue;
    }
    unused.push({ name, version: dependencies[name], status: "unknown" });
  }

  const total = depNames.length;
  const score = total === 0 ? 100 : Math.round((usedCount / total) * 100);

  return { score, total, usedCount, unused, implicitlyUsed, packageJsonPath };
}
