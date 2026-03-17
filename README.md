# CodePulse 🔍

> AI-powered code review and secret detection tool. Paste any GitHub repo URL, get instant security scanning, API leak detection, and streaming AI review — all inside a Monaco editor.

![CodePulse Banner](https://img.shields.io/badge/CodePulse-AI%20Code%20Review-00d9ff?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248?style=for-the-badge&logo=mongodb)

---

<!-- ## 🚀 Live Demo

> **[codepulse.vercel.app](https://codepulse.vercel.app)** ← replace with your deployed URL -->

---

## 📸 Screenshots

| Dashboard | Scan Results | Monaco with Annotations |
|-----------|-------------|--------------------------|
| ![alt text](image.png) | ![alt text](image-1.png) | ![alt text](image-2.png) |

---

## ✨ Features

- **Full Repo Secret Scanner** — Fetches scannable files from a GitHub repo and runs 25+ regex patterns to detect API keys, tokens, passwords, and credentials across the codebase
- **Inline Monaco Annotations** — Leaked lines get red squiggly underlines + inline fix comments directly in the editor (`🚨 AWS Key — move to process.env.AWS_ACCESS_KEY_ID`)
- **AI Code Review** — Streaming AI review powered by Gemini. Returns quality scores, line-by-line issues, severity levels, and specific fix suggestions
- **File Explorer** — Full repo tree with red markers on affected files. Click any file to view in Monaco with secrets highlighted automatically
- **Auth System** — Email + username signup/signin with JWT, protected routes

---

## 🗺️ How It Works

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           CODEPULSE FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

  User pastes GitHub URL
          │
          ▼
  ┌───────────────────┐
  │ POST /api/repo    │  parse owner/repo from URL
  │                   │  fetch default branch + git tree
  └────────┬──────────┘
           │
           ▼
  ┌───────────────────┐
  │ File Explorer UI  │  Nested sidebar tree
  │ Renders tree      │  Folders collapse/expand
  └────────┬──────────┘
           │
     ┌─────┴──────────────────────────────┐
     │                                    │
     ▼                                    ▼
┌─────────────────┐              ┌─────────────────────┐
│ Click a file    │              │ Click "Scan Entire  │
│                 │              │ Repo" button         │
└────────┬────────┘              └──────────┬──────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────────┐
│ GET /api/repo/  │              │ POST /api/repo/     │
│ file            │              │ scan-all            │
│ (base64 decode) │              │ (streams NDJSON)    │
└────────┬────────┘              └──────────┬──────────┘
         │                                  │
         ▼                                  ▼
┌─────────────────┐              ┌─────────────────────┐
│ Monaco Editor   │              │ Results Page        │
│ shows file      │              │   (fetching/scanning)│
│ content         │              │ - return files with │
│                 │              │   secrets + summary │
└────────┬────────┘              └──────────┬──────────┘
         │                                  │
         │                                  ▼
         │                        ┌─────────────────────┐
         │                        │ UI updates after    │
         │                        │ full-repo scan:     │
         │                        │ - file badges in    │
         │                        │   explorer          │
         │                        │ - summary strip     │
         │                        │ - auto-open first   │
         │                        │   secret file       │
         │                        └──────────┬──────────┘
         │                                   │
         ▼                                   │
┌─────────────────┐                          │
│ After scan, when│◄─────────────────────────┘
│ opening a file: │
│ local scanFile  │  apply Monaco secret decorations
│ runs client-side│  (squiggles + inline notes)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Right panel:    │
│ "Review <file>" │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ POST /api/review│
│                 │
│ Sends file with │
│ prompt to Gemini│
└────────┬────────┘
         │
         ▼  streaming text response
┌──────────────────┐
│ Review Panel     │
│ - streaming state│
│   + stop button  │
│ - Overall summary│
│ - Suggested      │
│   actions +      │
│   copyable fixes │
│ - clear / retry  │
└──────────────────┘
```

---

## 🔐 Secret Scanner — Patterns Detected

| Category | Patterns |
|----------|----------|
| **AWS** | Access Key ID, Secret Access Key |
| **Google** | API Key, OAuth Client Secret |
| **GitHub** | PAT, OAuth Token, App Token |
| **Stripe** | Live Secret Key, Publishable Key, Test Keys |
| **Database** | MongoDB URI, PostgreSQL URL, MySQL URI, Redis URI |
| **Auth** | JWT Secret (hardcoded), JWT Token values |
| **Private Keys** | RSA, EC, PGP, OpenSSH, DSA |
| **Services** | SendGrid, Twilio, Slack Bot Token, Slack Webhook |
| **Generic** | Hardcoded passwords, API secrets, NPM tokens |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + inline styles |
| Animation | Framer Motion |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Auth | Custom JWT (`jose`) |
| Database | MongoDB + Mongoose |
| GitHub API | Octokit (`@octokit/rest`) |
| AI Review | Gemini 2.5 Flash (`@google/genai`) |
| Deployment | Vercel |

---

## 📁 Project Structure

```
codepulse/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── signup/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   ├── repo/
│   │   │   │   ├── route.ts          # fetch repo tree
│   │   │   │   ├── file/route.ts     # fetch file content
│   │   │   │   └── scan-all/route.ts # full repo scan + NDJSON progress
│   │   │   ├── scan/route.ts         # single file/repo regex scanner
│   │   │   └── review/route.ts       # AI review streaming
│   │   ├── dashboard/page.tsx
│   │   ├── (auth)/login/page.tsx
│   │   └── (auth)/signup/page.tsx
│   ├── components/
│   │   ├── ReviewPanel.tsx
│   │   ├── SecretScanPanel.tsx
│   │   └── ScanResultsPage.tsx
│   ├── hooks/
│   │   └── useSecretDecorations.ts
│   ├── lib/
│   │   ├── secretScanner.ts
│   │   ├── dbConfig.ts
│   │   ├── hash.ts
│   │   ├── jwt.ts
│   │   └── session.ts
│   └── models/
│       └── user.models.js
└── src/proxy.ts
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (free tier works)
- GitHub account (for token)
- Google AI Studio account (for Gemini API key)

### 1. Clone the repo

```bash
git clone https://github.com/yourusername/codepulse.git
cd codepulse
npm install
```

### 2. Set up environment variables

Create a `.env.local` file in the root:

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/codepulse

# JWT
TOKEN_SECRET=your-super-secret-jwt-key-minimum-32-characters

# GitHub API (optional but strongly recommended — 5000 req/hr vs 60)
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# AI Review
GEMINI_API_KEY=AIza...                          # required by /api/review
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Test with a public repo

Try scanning:
- `https://github.com/vercel/next.js` — large repo, tests performance
- `https://github.com/expressjs/express` — medium size
- Your own repos — to see real results

---

## 🔑 Getting API Keys

| Key | Where to get it | Free tier |
|-----|-----------------|-----------|
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) | 1,500 req/day |
| `GITHUB_TOKEN` | [github.com/settings/tokens](https://github.com/settings/tokens) | 5,000 req/hr |
| `MONGODB_URI` | [cloud.mongodb.com](https://cloud.mongodb.com) | 512MB free |

---

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard:
# Settings → Environment Variables → add all from .env.local
```

Or connect your GitHub repo directly at [vercel.com/new](https://vercel.com/new) for automatic deployments on every push.

---

## 🛣️ Roadmap

- [x] GitHub repo file tree fetching
- [x] Secret scanner (25+ patterns)
- [x] Monaco Editor with inline annotations
- [x] AI code review with streaming
- [x] Full repo scan with results page
- [x] JWT authentication
- [ ] Scan history saved to MongoDB
- [ ] PDF report export
- [ ] Private repo support (GitHub OAuth)
- [ ] VS Code extension

---

## 🤝 Contributing

Pull requests welcome. For major changes please open an issue first.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## 📄 License

MIT © [Your Name](https://github.com/yourusername)

---

<div align="center">
  <p>Built with Next.js · Gemini AI · MongoDB · Monaco Editor</p>
  <p>If this helped you, give it a ⭐</p>
</div>