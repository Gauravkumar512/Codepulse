import { useRef, useCallback } from "react";
import type { SecretMatch } from "../lib/secretScanner";

function getEnvVarName(patternName: string): string {
  const map: Record<string, string> = {
    "AWS Access Key ID":            "AWS_ACCESS_KEY_ID",
    "AWS Secret Access Key":        "AWS_SECRET_ACCESS_KEY",
    "Google API Key":               "GOOGLE_API_KEY",
    "Google OAuth Client Secret":   "GOOGLE_CLIENT_SECRET",
    "GitHub Personal Access Token": "GITHUB_TOKEN",
    "GitHub OAuth Token":           "GITHUB_OAUTH_TOKEN",
    "GitHub App Token":             "GITHUB_APP_TOKEN",
    "Stripe Secret Key":            "STRIPE_SECRET_KEY",
    "Stripe Publishable Key":       "STRIPE_PUBLISHABLE_KEY",
    "Stripe Test Key":              "STRIPE_TEST_KEY",
    "MongoDB URI":                  "MONGODB_URI",
    "PostgreSQL URI":               "DATABASE_URL",
    "MySQL URI":                    "DATABASE_URL",
    "Redis URI":                    "REDIS_URL",
    "JWT Secret (hardcoded)":       "JWT_SECRET",
    "JWT Token":                    "JWT_TOKEN",
    "RSA Private Key":              "PRIVATE_KEY",
    "Private Key (generic)":        "PRIVATE_KEY",
    "SendGrid API Key":             "SENDGRID_API_KEY",
    "Twilio Account SID":           "TWILIO_ACCOUNT_SID",
    "Twilio Auth Token":            "TWILIO_AUTH_TOKEN",
    "Slack Bot Token":              "SLACK_BOT_TOKEN",
    "Slack Webhook URL":            "SLACK_WEBHOOK_URL",
    "Hardcoded Password":           "DB_PASSWORD",
    "Hardcoded Secret":             "API_SECRET",
    "NPM Auth Token":               "NPM_TOKEN",
  };
  return map[patternName] ?? "SECRET_VALUE";
}

function getSeverityColor(severity: string): string {
  if (severity === "critical") return "#c4707e";
  if (severity === "high")     return "#ff8800";
  return "#b8976a";
}

function buildFixComment(match: SecretMatch): string {
  const envVar = getEnvVarName(match.pattern);
  const icon   = match.severity === "critical" ? "🚨" : match.severity === "high" ? "⚠️" : "⚡";
  return `  ${icon} ${match.pattern} — use process.env.${envVar}`;
}

export function useSecretDecorations() {
  const decorationCollection = useRef<any>(null);

  const applyDecorations = useCallback(
    (editor: any, monaco: any, matches: SecretMatch[]) => {
      if (!editor || !monaco) return;

      const model = editor.getModel();
      if (!model) return;

      // clear old decorations
      if (decorationCollection.current) {
        decorationCollection.current.clear();
      }

      if (!matches || matches.length === 0) return;

      const newDecorations: any[] = [];

      for (const match of matches) {
        if (!match.line || match.line > model.getLineCount()) continue;

        const lineContent = model.getLineContent(match.line);
        const lineLength  = lineContent.length;
        const color       = getSeverityColor(match.severity);
        const fixComment  = buildFixComment(match);

        // 1. Main decoration — squiggly underline on text + line bg + gutter dot
        newDecorations.push({
          range: new monaco.Range(match.line, 1, match.line, lineLength + 1),
          options: {
            // inlineClassName applies CSS directly to the text <span>s
            inlineClassName: `secret-text-${match.severity}`,

            // subtle red/orange background on the whole line
            className: `secret-line-bg-${match.severity}`,

            // full line highlighting (more visible)
            isWholeLine: true,

            // hover tooltip with detailed info
            hoverMessage: {
              value: [
                `**🔐 ${match.pattern}** \`[${match.severity.toUpperCase()}]\``,
                ``,
                `${match.description}`,
                ``,
                `**Fix:** Move to \`.env\` file:`,
                `\`\`\``,
                `${getEnvVarName(match.pattern)}=${match.match}`,
                `\`\`\``,
                `Then use \`process.env.${getEnvVarName(match.pattern)}\` in your code.`,
              ].join("\n"),
            },

            // red dot in gutter (requires glyphMargin:true on editor)
            glyphMarginClassName: `secret-glyph-${match.severity}`,
            glyphMarginHoverMessage: {
              value: `**${match.severity.toUpperCase()}** — ${match.pattern}`,
            },

            // overview ruler marker (right scrollbar)
            overviewRuler: {
              color,
              position: monaco.editor.OverviewRulerLane.Full,
            },

            // minimap red marker
            minimap: {
              color,
              position: monaco.editor.MinimapPosition.Inline,
            },

            // injected text AFTER the line — the fix comment
            after: {
              content: fixComment,
              inlineClassName: `secret-after-${match.severity}`,
            },
          },
        });
      }

      // use createDecorationsCollection (newer, more reliable API)
      decorationCollection.current = editor.createDecorationsCollection(newDecorations);
    },
    []
  );

  const clearDecorations = useCallback((editor: any) => {
    if (!editor) return;
    if (decorationCollection.current) {
      decorationCollection.current.clear();
      decorationCollection.current = null;
    }
  }, []);

  return { applyDecorations, clearDecorations };
}

export const SECRET_DECORATION_CSS = `
/* ── Text decorations (applied via inlineClassName to actual text spans) ── */
.secret-text-critical {
  text-decoration: underline wavy #c4707e !important;
  text-decoration-skip-ink: none !important;
  text-underline-offset: 3px !important;
  color: #ff8899 !important;
}
.secret-text-high {
  text-decoration: underline wavy #ff8800 !important;
  text-decoration-skip-ink: none !important;
  text-underline-offset: 3px !important;
  color: #ffaa55 !important;
}
.secret-text-medium {
  text-decoration: underline wavy #b8976a !important;
  text-decoration-skip-ink: none !important;
  text-underline-offset: 3px !important;
  color: #ffdd55 !important;
}

/* ── Subtle line background (applied via className to line overlay div) ── */
.secret-line-bg-critical { background: rgba(196,112,126,0.06) !important; }
.secret-line-bg-high     { background: rgba(255,136,0,0.06)  !important; }
.secret-line-bg-medium   { background: rgba(184,151,106,0.06)  !important; }

/* ── Gutter dots ── */
.secret-glyph-critical,
.secret-glyph-high,
.secret-glyph-medium {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.secret-glyph-critical::before,
.secret-glyph-high::before,
.secret-glyph-medium::before {
  content: '●';
  font-size: 12px;
}
.secret-glyph-critical::before { color: #c4707e; }
.secret-glyph-high::before     { color: #ff8800; }
.secret-glyph-medium::before   { color: #b8976a; }

/* ── Inline after-comment (the fix annotation injected after the line) ── */
.secret-after-critical,
.secret-after-high,
.secret-after-medium {
  font-style: italic !important;
  opacity: 0.8 !important;
  font-size: 12px !important;
  pointer-events: none !important;
  user-select: none !important;
  white-space: pre !important;
}
.secret-after-critical { color: #ff6680 !important; }
.secret-after-high     { color: #ffaa44 !important; }
.secret-after-medium   { color: #ffdd44 !important; }
`;

export function injectSecretStyles() {
  if (typeof document === "undefined") return;
  const old = document.getElementById("secret-decoration-styles");
  if (old) old.remove();
  const style = document.createElement("style");
  style.id = "secret-decoration-styles";
  style.textContent = SECRET_DECORATION_CSS;
  document.head.appendChild(style);
}