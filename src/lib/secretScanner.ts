export type SecretMatch = {
  line: number;
  column: number;
  pattern: string;
  match: string;
  severity: "critical" | "high" | "medium";
  description: string;
  fix: string;
};

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

  /* ── Stripe ── */
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

  /* ── Database ── */
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

  /* ── JWT / Secrets ── */
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

  /* ── Generic hardcoded secrets ── */
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

/* ─────────────────────────────────────────
   SCAN A SINGLE FILE
───────────────────────────────────────── */
export function scanFile(path: string, content: string): FileScanResult {
  const lines = content.split("\n");
  const matches: SecretMatch[] = [];

  // Skip files that produce false positives
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

      // Reset regex lastIndex
      pattern.regex.lastIndex = 0;

      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(line)) !== null) {
        const matchValue = match[0];

        // Skip if it looks like a placeholder
        const placeholders = ["your_", "your-", "their_", "_here", "xxx", "placeholder", "changeme", "replace", "example", "dummy", "<", ">", "..."];
        if (placeholders.some((p) => matchValue.toLowerCase().includes(p))) continue;

        // Skip comments (lines starting with // or #)
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("*")) continue;

        matches.push({
          line: lineIdx + 1,
          column: match.index + 1,
          pattern: pattern.name,
          match: matchValue.length > 60 ? matchValue.slice(0, 57) + "..." : matchValue,
          severity: pattern.severity,
          description: pattern.description,
          fix: pattern.fix,
        });

        // Avoid infinite loop on zero-length match
        if (match[0].length === 0) pattern.regex.lastIndex++;
      }
    }
  }

  // Deduplicate — same line + same pattern
  const seen = new Set<string>();
  const deduped = matches.filter((m) => {
    const key = `${m.line}:${m.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { path, matches: deduped, scannedAt: Date.now() };
}

/* ─────────────────────────────────────────
   SCAN MULTIPLE FILES
───────────────────────────────────────── */
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