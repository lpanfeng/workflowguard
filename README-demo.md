# 🚀 WorkflowGuard — Demo Docs

## Product Overview

**WorkflowGuard** is a human-AI collaboration workflow platform designed for modern teams. It combines the power of LLMs with structured approval workflows, making it easy to build, run, and monitor business processes.

### Core Features

1. **Visual Workflow Builder** — Drag-and-drop interface to create multi-step approval flows
2. **AI-Enhanced Node** — Each workflow step can invoke DeepSeek AI for content generation/analysis
3. **Multi-Level Approval Chains** — Sequential and parallel approval routing with role-based permissions
4. **Feishu Integration** — Real-time approval notifications via Feishu bot
5. **Dashboard & Analytics** — Execution metrics, success rates, and trend visualization

## 3 Core Selling Points

### 1. Pain Point: Manual Approval is Slow & Error-Prone
Business teams spend hours chasing approvals through emails, chats, and paper forms. Decisions get lost, deadlines slip, and nobody has visibility.

### 2. Solution: AI-Powered Approval Workflows
WorkflowGuard turns any business process into an automated workflow. AI handles content generation and initial review; humans only step in for final approval. Result: 80% faster process completion.

### 3. Competitive Advantage: Human-in-the-Loop + Feishu Native
Unlike Zapier/n8n (pure automation) or existing approval tools (pure human), WorkflowGuard uniquely combines AI reasoning with human oversight. Native Feishu integration means your team never leaves the platform they already use.

## Screenshots

Screenshots taken from the live demo:

| Page | Description |
|------|-------------|
| `/` | Landing page — product value prop |
| `/dashboard` | Metrics dashboard with execution trends |
| `/workflows/list` | Workflow list with search & filters |
| `/workflows/new` | Workflow creation form |
| `/workflows/[id]` | Workflow detail & execution history |
| `/settings` | User settings & integrations |
| `/audit-logs` | Complete audit trail |
| `/pricing` | Pricing plans |
| `/tasks` | Pending approval tasks |

## Tech Stack

- **Frontend**: Next.js 15, TailwindCSS, Recharts
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **AI**: DeepSeek Chat API
- **Integration**: Feishu Bot API
- **Auth**: NextAuth v5
- **Deploy**: Docker / Vercel-ready

## Quick Start

```bash
git clone [repo-url]
cd workflowguard
cp .env.local.example .env.local
# Fill in: DEEPSEEK_API_KEY, SUPABASE_URL, SUPABASE_KEY, FEISHU_BOT_TOKEN
npm install
npm run dev
```

Visit `http://localhost:3000`

## Demo Video (Coming Soon)

A short walkthrough video recording will be added here.
