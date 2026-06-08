"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export type IgnoredMap = Record<string, string[]>;

type Ctx = {
  ignored: IgnoredMap;
  getIgnored: (path: string) => string[];
  ignoreKeys: (path: string, keys: string[]) => void;
  clearIgnored: (path: string) => void;
};

const IgnoredSecretsContext = createContext<Ctx | null>(null);

export function IgnoredSecretsProvider({ children }: { children: React.ReactNode }) {
  const [ignored, setIgnored] = useState<IgnoredMap>({});

  const getIgnored = useCallback((path: string) => ignored[path] ?? [], [ignored]);

  const ignoreKeys = useCallback((path: string, keys: string[]) => {
    if (!path || keys.length === 0) return;
    setIgnored((prev) => {
      const merged = new Set(prev[path] ?? []);
      keys.forEach((k) => merged.add(k));
      return { ...prev, [path]: Array.from(merged) };
    });
  }, []);

  const clearIgnored = useCallback((path: string) => {
    setIgnored((prev) => {
      if (!(path in prev)) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ignored, getIgnored, ignoreKeys, clearIgnored }),
    [ignored, getIgnored, ignoreKeys, clearIgnored]
  );

  return <IgnoredSecretsContext.Provider value={value}>{children}</IgnoredSecretsContext.Provider>;
}

export function useIgnoredSecrets() {
  const ctx = useContext(IgnoredSecretsContext);
  if (!ctx) throw new Error("useIgnoredSecrets must be used within IgnoredSecretsProvider");
  return ctx;
}

export function secretKey(m: { line: number; column: number; pattern: string }): string {
  return `${m.line}:${m.column}:${m.pattern}`;
}
