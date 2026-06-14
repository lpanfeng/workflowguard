# WorkflowGuard — Go-to-Market 发布检查表

**生成日期**：2026-06-14
**产品名称**：WorkflowGuard（人机协作工作流平台）
**产品阶段**：Beta 版 → 准备正式发布

---

## 一、P0 检查项（发布前必须完成）

| # | 检查项 | 当前状态 | 说明 |
|---|--------|---------|------|
| 1 | Landing 页完整 | ✅ | 已包含 Hero、痛点、模板、功能、案例、FAQ、Social Proof |
| 2 | 注册/登录流程可用 | ✅ | NextAuth + Email 认证 |
| 3 | 至少 1 个完整工作流可执行 | ✅ | 3 个预设模板（客服/内容/数据） |
| 4 | 审批系统可工作 | ✅ | 多级审批链 |
| 5 | 审计日志可查询 | ✅ | 支持筛选和分页 |
| 6 | 数据导入（CSV）可用 | ✅ | 拖拽上传 + 预览 |
| 7 | 定价页面展示 | ✅ | 免费/专业/企业三档 |
| 8 | 移动端适配 | ✅ | Tailwind 响应式 |
| 9 | 单元测试通过率 | ✅ | 88/88 测试通过 |
| 10 | Docker 镜像构建 | ✅ | Dockerfile 已就绪 |
| 11 | Supabase 数据库 schema | ✅ | 所有表 + RLS 配置 |
| 12 | API 文档（README） | ✅ | README.md 完整 |
| 13 | 隐私政策/服务条款 | ❌ | **需要补充** |
| 14 | 错误页面（404/500） | ⚠️ | 需要创建 |

## 二、P1 检查项（发布后尽快完成）

| # | 检查项 | 当前状态 | 说明 |
|---|--------|---------|------|
| 1 | Google Analytics / Plausible | ❌ | 需要配置 |
| 2 | SEO meta tags | ⚠️ | robots.txt 和 sitemap 已存在，需补充 meta |
| 3 | Open Graph 图片 | ❌ | 社交分享时需要 |
| 4 | 邮件通知系统 | ✅ | Resend 已集成 |
| 5 | 飞书 Bot 配置指南 | ⚠️ | 文档中部分内容需完善 |
| 6 | 多语言支持（英文） | ❌ | 国际化基础框架 |
| 7 | 用户反馈表单 | ✅ | /feedback 页面已实现 |
| 8 | 社交媒体账号注册 | ❌ | Twitter/X、LinkedIn |

## 三、P2 检查项（持续迭代）

| # | 检查项 | 当前状态 | 说明 |
|---|--------|---------|------|
| 1 | 更多工作流模板 | ⚠️ | 已有 3 个，可增至 6+ |
| 2 | 支付系统集成 | ❌ | Stripe/PayPal |
| 3 | 团队管理功能 | ⚠️ | 多角色权限框架已存在 |
| 4 | API 开放平台 | ❌ | 对外 API 接口 |
| 5 | Webhook 系统 | ⚠️ | 已有基础 |

---

## 四、Go-to-Market 策略建议

### 4.1 目标用户画像

| 维度 | 描述 |
|------|------|
| **核心用户** | 中小企业（10-100人）的运营/客服/内容团队负责人 |
| **痛点** | AI 工具好用但不可控，人工审核效率低 |
| **使用场景** | 客服回复、内容发布、数据录入、采购审批 |
| **付费意愿** | 免费版够用 → 付费升级驱动力：更多审批额度、更多工作流 |
| **决策者** | CTO / 运营总监 / 客服主管 |
| **反对理由** | "我们已经有飞书/钉钉了"（需要用差异化回应） |

### 4.2 第一个营销渠道推荐

**推荐：Product Hunt（英文）+ 即刻/小红书（中文）**

理由：
1. **Product Hunt**：WorkflowGuard 的定位非常适合 PH 用户（AI + SaaS + 工具），2026 年 PH 的 AI 产品热度持续上升
2. **即刻/小红书**：中文 AI 圈子活跃，"AI + 工作流"话题有讨论度

**不建议首选**：
- HN：竞争过于激烈，需要非常独特的角度
- 微信公众号：流量分发效率低，不适合冷启动

### 4.3 发布文案模板

#### 英文版本（Product Hunt）

**Title**: WorkflowGuard — Let AI work, let humans decide

**Tagline**: AI execution → human approval → full audit trail. The human-AI collaboration platform for teams that need safe AI.

**Description**:
> AI agents are amazing—but what happens when they make mistakes? 
> 
> WorkflowGuard gives you the best of both worlds: AI executes tasks automatically, humans approve at critical checkpoints, and every action is logged and auditable.
> 
> **Why we built it:**
> We saw too many teams get burned by overpromising AI tools. One hallucination can undo weeks of brand building. So we built a system where AI does the heavy lifting—but humans stay in control.
> 
> **What you get:**
> - 🤖 AI Execution Engine (DeepSeek, OpenAI, Claude)
> - 👤 Human Approval Workflow (multi-level, parallel/sequential)
> - 📋 Full Audit Trail (who did what, when)
> - 📊 Real-time Dashboard
> - 💬 Feishu Integration (approve from your phone)
> - 3 Pre-built Templates (Customer Service, Content Publishing, Data Entry)
> 
> Free tier includes 2 workflows + 100 AI calls/month. No credit card required.
> 
> Built by a solo founder who believes teams deserve AI that works—and stays safe.

#### 中文版本（即刻/小红书）

**标题**：用 AI 干活，人做决策——WorkflowGuard 人机协作平台上线

**正文**：
> AI Agent 能帮你干活，但你敢完全交给它吗？
> 
> WorkflowGuard 解决的就是这个问题：AI 自动执行，关键节点人工审批，每一步都有记录可查。
> 
> 适合谁？
> - 客服团队：AI 生成回复草稿 → 审核 → 发送，效率提升 70%
> - 内容团队：AI 写初稿 → 编辑审批 → 发布
> - 运营团队：AI 提取数据 → 人工确认 → 写入系统
> 
> 3 个预设模板开箱即用，免费版就能用。不需要写代码，5 分钟上手。
> 
> 地址：https://workflowguard.cn

---

## 五、风险清单

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 竞品快速模仿 | 中 | 中 | 先发优势 + 社区建设 |
| 飞书/钉钉加入类似功能 | 中 | 高 | 强调独立部署 + AI 安全审计优势 |
| AI 模型服务中断 | 低 | 高 | 支持多模型切换 |
| 用户注册转化率低 | 中 | 高 | A/B 测试 Landing 页文案 |
| 服务器成本超支 | 低 | 中 | 配额控制 + 监控告警 |

---

## 六、时间表建议

| 阶段 | 时间 | 目标 |
|------|------|------|
| 完善 P0 | Week 1 (6/15-6/21) | 隐私政策、错误页面、SEO meta |
| 内容准备 | Week 2 (6/22-6/28) | 英文/中文发布文案定稿、社交媒体账号注册 |
| Product Hunt 发布 | Week 3 (6/29-7/5) | 准备 PH launch day，提前 1 周预热 |
| 中文社区同步 | Week 3-4 (7/1-7/12) | 即刻/小红书/知乎发布 |
| 数据收集 | Week 4-5 (7/1-7/14) | 分析注册转化率、使用留存、用户反馈 |
| 迭代优化 | Week 5-6 (7/15-7/28) | 基于数据优化产品 |

---

*本文档为 WorkflowGuard Go-to-Market 策略的初步规划，需根据实际情况持续调整。*
