export type SecretSeverity = "critical" | "high" | "medium";

export type SecretMatch = {
  line: number;
  column: number;
  matchLength: number;
  pattern: string;
  match: string;
  severity: SecretSeverity;
  description: string;
  fix: string;
};

export const BLOCK_SEVERITIES: SecretSeverity[] = ["critical", "high"];

export function isBlockingMatch(m: SecretMatch): boolean {
  return BLOCK_SEVERITIES.includes(m.severity);
}

export function partitionMatches(matches: SecretMatch[]): {
  blocking: SecretMatch[];
  redactable: SecretMatch[];
} {
  const blocking: SecretMatch[] = [];
  const redactable: SecretMatch[] = [];
  for (const m of matches) {
    (isBlockingMatch(m) ? blocking : redactable).push(m);
  }
  return { blocking, redactable };
}

export function maskSecretsInContent(content: string, matches: SecretMatch[]): string {
  if (!matches.length) return content;
  const lines = content.split("\n");
  for (const m of matches) {
    const idx = m.line - 1;
    if (idx < 0 || idx >= lines.length) continue;
    const line = lines[idx];
    const start = m.column - 1;
    if (start < 0 || start >= line.length) continue;
    const end = Math.min(start + m.matchLength, line.length);
    lines[idx] = line.slice(0, start) + "*".repeat(end - start) + line.slice(end);
  }
  return lines.join("\n");
}

export type FileScanResult = {
  path: string;
  matches: SecretMatch[];
  scannedAt: number;
};

export type RepoScanResult = {
  totalFiles: number;
  scannedFiles: number;
  totalSecrets: number;
  critical: number;
  high: number;
  medium: number;
  files: FileScanResult[];
};

function redactSecretValue(value: string): string {
  if (value.length <= 8) {
    return "[redacted]";
  }

  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

const SECRET_PATTERNS: {
  name: string;
  regex: RegExp;
  severity: SecretMatch["severity"];
  description: string;
  fix: string;
}[] = [
  /* ── AWS ── */
  {
    name: "AWS Access Key ID",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "critical",
    description: "AWS Access Key ID exposed — full AWS account access risk",
    fix: "Remove immediately, rotate key in AWS IAM, move to environment variable",
  },
  {
    name: "AWS Secret Access Key",
    regex: /\b[A-Za-z0-9/+=]{40}\b(?=.*aws|.*secret)/gi,
    severity: "critical",
    description: "Possible AWS Secret Access Key detected",
    fix: "Rotate key in AWS IAM console and move to .env",
  },

  /* ── Google ── */
  {
    name: "Google API Key",
    regex: /AIza[0-9A-Za-z\-_]{35}/g,
    severity: "critical",
    description: "Google API key exposed — can be used to make billed API calls",
    fix: "Restrict key in Google Cloud Console, move to environment variable",
  },
  {
    name: "Google OAuth Client Secret",
    regex: /GOCSPX-[0-9A-Za-z\-_]{28}/g,
    severity: "critical",
    description: "Google OAuth client secret exposed",
    fix: "Regenerate in Google Cloud Console, move to .env",
  },

  /* ── GitHub ── */
  {
    name: "GitHub Personal Access Token",
    regex: /ghp_[0-9A-Za-z]{36}/g,
    severity: "critical",
    description: "GitHub PAT exposed — grants repo and account access",
    fix: "Revoke at github.com/settings/tokens, generate new token, use env var",
  },
  {
    name: "GitHub OAuth Token",
    regex: /gho_[0-9A-Za-z]{36}/g,
    severity: "critical",
    description: "GitHub OAuth token exposed",
    fix: "Revoke token immediately, move to environment variable",
  },
  {
    name: "GitHub App Token",
    regex: /(?:ghu|ghs|ghr)_[0-9A-Za-z]{36}/g,
    severity: "critical",
    description: "GitHub App token exposed",
    fix: "Revoke and regenerate in GitHub App settings",
  },

  {
    name: "Stripe Secret Key",
    regex: /sk_live_[0-9A-Za-z]{24,}/g,
    severity: "critical",
    description: "Stripe live secret key — can make real financial transactions",
    fix: "Roll key in Stripe Dashboard immediately, use env var",
  },
  {
    name: "Stripe Publishable Key",
    regex: /pk_live_[0-9A-Za-z]{24,}/g,
    severity: "medium",
    description: "Stripe live publishable key exposed (lower risk but still bad practice)",
    fix: "Move to environment variable",
  },
  {
    name: "Stripe Test Key",
    regex: /(?:sk|pk)_test_[0-9A-Za-z]{24,}/g,
    severity: "medium",
    description: "Stripe test key hardcoded — develop habit of using env vars",
    fix: "Move to .env even for test keys",
  },

  {
    name: "MongoDB URI",
    regex: /mongodb(?:\+srv)?:\/\/[^\s"'`]+/gi,
    severity: "critical",
    description: "MongoDB connection string with credentials exposed",
    fix: "Move to MONGODB_URI env var, use process.env.MONGODB_URI",
  },
  {
    name: "PostgreSQL URI",
    regex: /postgres(?:ql)?:\/\/[^\s"'`]+/gi,
    severity: "critical",
    description: "PostgreSQL connection string with credentials exposed",
    fix: "Move to DATABASE_URL env var",
  },
  {
    name: "MySQL URI",
    regex: /mysql:\/\/[^\s"'`]+/gi,
    severity: "critical",
    description: "MySQL connection string with credentials exposed",
    fix: "Move to DATABASE_URL env var",
  },
  {
    name: "Redis URI",
    regex: /redis:\/\/[^\s"'`]+/gi,
    severity: "high",
    description: "Redis connection string possibly exposed",
    fix: "Move to REDIS_URL env var",
  },
  {
    name: "JWT Secret (hardcoded)",
    regex: /(?:jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*["'`]([^"'`]{8,})["'`]/gi,
    severity: "critical",
    description: "JWT secret hardcoded — tokens can be forged",
    fix: "Use a long random string in JWT_SECRET env var",
  },
  {
    name: "JWT Token",
    regex: /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
    severity: "high",
    description: "JWT token value hardcoded in source",
    fix: "Never hardcode JWT tokens — generate them at runtime",
  },

  /* ── Private Keys ── */
  {
    name: "RSA Private Key",
    regex: /-----BEGIN RSA PRIVATE KEY-----/g,
    severity: "critical",
    description: "RSA private key found in source code",
    fix: "Remove immediately, store in secrets manager or env var",
  },
  {
    name: "Private Key (generic)",
    regex: /-----BEGIN (?:EC|PGP|OPENSSH|DSA) PRIVATE KEY-----/g,
    severity: "critical",
    description: "Private key found in source code",
    fix: "Remove from source, use environment variable or secrets manager",
  },

  /* ── SendGrid / Twilio / Slack ── */
  {
    name: "SendGrid API Key",
    regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
    severity: "critical",
    description: "SendGrid API key exposed — can send emails from your account",
    fix: "Revoke at app.sendgrid.com, move to SENDGRID_API_KEY env var",
  },
  {
    name: "Twilio Account SID",
    regex: /AC[a-f0-9]{32}/g,
    severity: "high",
    description: "Twilio Account SID exposed",
    fix: "Move to TWILIO_ACCOUNT_SID env var",
  },
  {
    name: "Twilio Auth Token",
    regex: /SK[a-f0-9]{32}/g,
    severity: "critical",
    description: "Twilio auth token exposed — grants full account access",
    fix: "Rotate at console.twilio.com, move to env var",
  },
  {
    name: "Slack Bot Token",
    regex: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}/g,
    severity: "critical",
    description: "Slack bot token exposed",
    fix: "Revoke at api.slack.com/apps, move to SLACK_BOT_TOKEN env var",
  },
  {
    name: "Slack Webhook URL",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
    severity: "high",
    description: "Slack incoming webhook URL exposed",
    fix: "Regenerate webhook in Slack app settings",
  },

  {
    name: "Hardcoded Password",
    regex: /(?:password|passwd|pwd)\s*[:=]\s*["'`]([^"'`\s]{6,})["'`]/gi,
    severity: "high",
    description: "Hardcoded password detected in source",
    fix: "Move to environment variable, never hardcode passwords",
  },
  {
    name: "Hardcoded Secret",
    regex: /(?:secret|api_key|apikey|api-key|access_token|auth_token)\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/gi,
    severity: "high",
    description: "Hardcoded secret or API key detected",
    fix: "Move to environment variable",
  },
  {
    name: "NPM Auth Token",
    regex: /(?:NPM_TOKEN|npm_token|_authToken)\s*[:=]\s*["'`]?([A-Za-z0-9\-_]{36,})["'`]?/gi,
    severity: "critical",
    description: "NPM auth token exposed — can publish packages as you",
    fix: "Revoke at npmjs.com/settings, move to NPM_TOKEN env var",
  },
];

/* Substrings that mark a match as a placeholder, not a real secret.
   Shared between the regex pass and the entropy pass. */
const PLACEHOLDER_TOKENS = [
  "your_", "your-", "their_", "_here", "xxx", "placeholder",
  "changeme", "replace", "example", "dummy", "<", ">", "...",
  "user:password", "user:pass", "host:port",
];

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return PLACEHOLDER_TOKENS.some((p) => lower.includes(p));
}

const ENTROPY = {
  minLen: 20,
  maxLen: 200,
  base64Threshold: 4.5, // bits/char — random base64 sits ~5.0–6.0
  hexThreshold: 3.0,    // bits/char — random hex sits ~3.7–4.0
};

const CANDIDATE_RE = /[A-Za-z0-9+/_-]{16,}={0,2}/g;
const HEX_ONLY_RE = /^[a-fA-F0-9]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_TOKEN_PATTERNS: RegExp[] = [
  // URLs:  http://… https://… www.…  (allowing a leading quote/paren/bracket)
  /(?:^|["'`(\[])(?:https?:\/\/|www\.)/i,
  // markdown link target:  [text](url)
  /\]\([^)]*\)/,
  // path-ish start:  /…  ./…  ../…  (allowing a leading quote/paren/bracket)
  /(?:^|["'`(\[])(?:\.\.?\/|\/)/,
  // Nix store paths — /nix/store/<hash>-name  (hash naturally looks high-entropy)
  /\/nix\/store\//i,
  // any hashed store/cache directory:  …/store/<32+ char hash>-…
  /\/store\/[a-z0-9]{32,}-/i,
  // contains a recognised file extension (followed by end / quote / ? # /)
  /\.(?:json|jsonc|md|mdx|markdown|js|jsx|ts|tsx|mjs|cjs|nix|lock|txt|ya?ml|toml|cfg|conf|ini|css|scss|less|html?|svg|png|jpe?g|gif|webp|ico|woff2?|sh|bash|zsh|py|go|rs|java|rb|php|xml|csv|sql|graphql|prisma|vue|svelte|astro)(?:["'`)\]]|[?#/]|$)/i,
];

function isSafeToken(token: string): boolean {
  return SAFE_TOKEN_PATTERNS.some((re) => re.test(token));
}

const KNOWN_ALPHABETS = [
  "abcdefghijklmnopqrstuvwxyz",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "0123456789",
  "0123456789abcdef",
  "0123456789ABCDEF",
  "0123456789abcdefghijklmnopqrstuvwxyz",
  "abcdefghijklmnopqrstuvwxyz0123456789",
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
];

function isKnownAlphabet(candidate: string): boolean {
  const cleaned = candidate.replace(/^[\s"'`]+/, "").replace(/[\s"'`]+$/, "");
  return KNOWN_ALPHABETS.some((alphabet) => alphabet.includes(cleaned));
}

const DUMMY_VALUES = ["test", "dummy", "example", "explicit", "none", "null", "false", "true"];

function isDummyValue(value: string): boolean {
  const v = value.replace(/^[\s"'`]+/, "").replace(/[\s"'`]+$/, "");
  if (v.length < 10) return true;
  const lower = v.toLowerCase();
  return DUMMY_VALUES.some((d) => lower.includes(d));
}

const SECRET_CONTEXT_KEYWORDS = [
  "secret", "token", "apikey", "apisecret", "accesskey", "accesstoken",
  "authtoken", "auth", "password", "passwd", "pwd", "privatekey", "private",
  "credential", "clientsecret", "signingkey", "signing", "cipher", "salt",
];

function hasSecretContext(line: string): boolean {
  const normalized = line.toLowerCase().replace(/[_-]/g, "");
  return SECRET_CONTEXT_KEYWORDS.some((k) => normalized.includes(k));
}

function shannonEntropy(str: string): number {
  if (!str.length) return 0;
  const freq: Record<string, number> = {};
  for (const ch of str) freq[ch] = (freq[ch] ?? 0) + 1;
  let entropy = 0;
  for (const ch in freq) {
    const p = freq[ch] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isEnvFile(path: string): boolean {
  const lower = path.toLowerCase();
  return /(^|\/)\.env(\.[\w-]+)?$/.test(lower);
}

type Span = { line: number; start: number; end: number };

function scanEntropy(path: string, lines: string[], regexSpans: Span[]): SecretMatch[] {
  const found: SecretMatch[] = [];
  const envFile = isEnvFile(path);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;
    if (/data:[^;]+;base64,|integrity\s*[:=]|sha(?:256|384|512)-/i.test(line)) continue;

    const hasContext = envFile || hasSecretContext(line);

    const TOKEN_RE = /\S+/g;
    let t: RegExpExecArray | null;
    while ((t = TOKEN_RE.exec(line)) !== null) {
      const word = t[0];
      const wordStart = t.index;
      if (isSafeToken(word)) continue;

      CANDIDATE_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = CANDIDATE_RE.exec(word)) !== null) {
        const candidate = m[0];
        const col = wordStart + m.index + 1; // 1-based column within the line

        if (candidate.length < ENTROPY.minLen || candidate.length > ENTROPY.maxLen) continue;
        if (looksLikePlaceholder(candidate)) continue;
        if (UUID_RE.test(candidate)) continue;
        if (isKnownAlphabet(candidate)) continue; // sequential charset / dictionary string

        const start = col;
        const end = col + candidate.length;
        const overlapsRegex = regexSpans.some(
          (s) => s.line === lineIdx + 1 && start < s.end && end > s.start
        );
        if (overlapsRegex) continue;

        const isHex = HEX_ONLY_RE.test(candidate);
        const entropy = shannonEntropy(candidate);

        if (isHex) {
          if (!hasContext || entropy < ENTROPY.hexThreshold) continue;
        } else {
          if (entropy < ENTROPY.base64Threshold) continue;
        }

        const severity: SecretSeverity = hasContext ? "high" : "medium";

        found.push({
          line: lineIdx + 1,
          column: col,
          matchLength: candidate.length,
          pattern: "High-Entropy String",
          match: redactSecretValue(candidate.length > 60 ? `${candidate.slice(0, 57)}...` : candidate),
          severity,
          description: `High-entropy ${isHex ? "hex" : "base64"} string (${entropy.toFixed(
            2
          )} bits/char)${hasContext ? " assigned to a secret-like key" : ""} — likely a credential`,
          fix: "If this is a secret, move it to an environment variable and rotate it",
        });
      }
    }
  }

  return found;
}


export function scanFile(path: string, content: string): FileScanResult {
  const lines = content.split("\n");
  const matches: SecretMatch[] = [];

  if (/\.mdx?$/i.test(path)) {
    return { path, matches: [], scannedAt: Date.now() };
  }

  const skipPaths = [
    ".env.example", ".env.sample", ".env.template",
    "fixture", "mock", "test/data",
    "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "composer.json", "composer.lock", "gemfile.lock", "cargo.lock",
    "go.sum", "pipfile.lock", "poetry.lock",
    "node_modules",
  ];
  if (skipPaths.some((s) => path.toLowerCase().includes(s))) {
    return { path, matches: [], scannedAt: Date.now() };
  }

  for (const pattern of SECRET_PATTERNS) {
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      pattern.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        const matchValue = match[0];

        if (looksLikePlaceholder(matchValue)) continue;

        if (match[1] !== undefined && isDummyValue(match[1])) continue;

        if (matchValue.includes("BEGIN") && line.substring(match.index).includes("...")) continue;

        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;

        matches.push({
          line: lineIdx + 1,
          column: match.index + 1,
          matchLength: matchValue.length,
          pattern: pattern.name,
          match: redactSecretValue(
            matchValue.length > 60 ? `${matchValue.slice(0, 57)}...` : matchValue
          ),
          severity: pattern.severity,
          description: pattern.description,
          fix: pattern.fix,
        });

        // Avoid infinite loop on zero-length match
        if (match[0].length === 0) pattern.regex.lastIndex++;
      }
    }
  }

  const regexSpans: Span[] = matches.map((m) => ({
    line: m.line,
    start: m.column,
    end: m.column + m.matchLength,
  }));
  matches.push(...scanEntropy(path, lines, regexSpans));

  const seen = new Set<string>();
  const deduped = matches.filter((m) => {
    const key = `${m.line}:${m.column}:${m.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { path, matches: deduped, scannedAt: Date.now() };
}

export function scanRepo(files: { path: string; content: string }[]): RepoScanResult {
  const results: FileScanResult[] = [];
  let totalSecrets = 0;
  let critical = 0;
  let high = 0;
  let medium = 0;

  for (const file of files) {
    const result = scanFile(file.path, file.content);
    if (result.matches.length > 0) {
      results.push(result);
      totalSecrets += result.matches.length;
      critical += result.matches.filter((m) => m.severity === "critical").length;
      high     += result.matches.filter((m) => m.severity === "high").length;
      medium   += result.matches.filter((m) => m.severity === "medium").length;
    }
  }

  return {
    totalFiles: files.length,
    scannedFiles: files.length,
    totalSecrets,
    critical,
    high,
    medium,
    files: results,
  };
}