# WorkflowGuard — 人机协作工作流平台

> 想用 AI Agent 但又不敢完全交给 Agent？WorkflowGuard 给你可控的人机协同。
> Agent 执行 → 人工审批 → 全程审计，三位一体的工作流闭环。

## 一句话定位
面向中小企业的 AI Agent 人机协作工作流平台——Agent 执行、人工审批、全程可审计。

## 核心价值
- **人机协同**：Agent 自动执行 + 关键节点人工审批
- **安全可控**：完整的操作审计日志，一键暂停/回滚
- **开箱即用**：预设工作流模板（客服工单、内容发布、数据录入），5 分钟上手

## 技术栈
- **前端**：Next.js 16 + Tailwind CSS + shadcn/ui
- **数据库**：Supabase (PostgreSQL + RLS)
- **认证**：NextAuth.js (Email + GitHub OAuth)
- **AI**：DeepSeek / OpenAI API
- **通知**：飞书 Webhook / 飞书 Bot
- **部署**：Vercel

## 快速开始

### 前置条件
- Node.js 18+
- npm
- Supabase 项目（免费 tier 即可）
- LLM API Key（推荐 DeepSeek，性价比高）

### 本地开发

```bash
# 1. 克隆项目
git clone <repo-url> workflowguard
cd workflowguard

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入实际值

# 4. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 数据库设置

1. 在 [Supabase](https://supabase.com) 创建项目
2. 在项目 SQL Editor 中执行 `supabase/migrations/202605220001_workflowguard_init.sql`
3. 执行 `supabase/migrations/002_approval_rpc.sql`
4. 从项目 Settings → API 获取 URL 和 keys，填入 `.env.local`

### 部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/workflowguard)

1. Fork 或推送到 GitHub
2. 在 Vercel 中导入项目
3. 在 Vercel 项目设置中添加所有环境变量
4. 部署 🚀

## 项目结构

```
src/
├── app/
│   ├── auth/          # 登录/注册页面
│   ├── dashboard/     # 仪表盘
│   ├── tasks/         # 任务列表与审批
│   ├── workflows/     # 工作流创建
│   ├── audit-logs/    # 审计日志
│   ├── settings/      # 系统设置
│   ├── pricing/       # 定价页面
│   └── api/           # API 路由
├── components/        # UI 组件
├── lib/               # 工具函数、模板、类型定义
└── middleware.ts      # 认证中间件
```

## 定价

| 套餐 | 月费 | 工作流 | 审批次数/月 | 适合 |
|------|------|--------|-------------|------|
| Free | ¥0 | 2 个 | 20 次 | 个人试用 |
| Basic | ¥29 | 5 个 | 100 次 | 小团队 |
| Pro | ¥69 | 20 个 | 500 次 | 成长型团队 |
| Team | ¥199 | 无限 | 无限 | 企业 |

## 项目状态

- ✅ PRD 编写完成
- ✅ 项目初始化 + 数据库
- ✅ 认证系统
- ✅ 3 个工作流模板
- ✅ AI 执行引擎 (DeepSeek/Mock)
- ✅ 审批系统
- ✅ 仪表盘 + 审计日志
- ✅ 飞书集成框架
- ✅ 定价页面
- 🚧 支付系统集成
- 🚧 部署上线
- 🚧 发布准备 (Product Hunt / 社交媒体)

## 路线图

- **第 1 周**（已完成）：✅ 基础设施、模板 1（客服工单）、AI Agent 集成、审批系统
- **第 2 周**（进行中）：🚧 飞书集成、模板 2/3、仪表盘、定价、部署
- **第 3 周**：打磨、测试、发布上线、Product Hunt
- **第 4 周**：用户反馈收集、迭代、社区建设
