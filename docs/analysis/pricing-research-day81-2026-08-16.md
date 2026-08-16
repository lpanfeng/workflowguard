# WorkflowGuard 定价策略研究 — Day 81

## 当前状态
- WorkflowGuard已部署到Vercel: https://workflowguard.vercel.app
- 定价页面已实现: free/basic/pro/team 四档
- 数据存储在Supabase plan_limits表

## 竞品定价调研

### 1. n8n (工作流自动化)
- **Cloud版**: 免费额度 + 按执行次数付费
- **Self-hosted**: 免费开源，企业版按需报价
- **核心定价逻辑**: 按workflow executions计费

### 2. Make (原Integromat)
- **Free**: 1000 ops/月
- **Core**: $9/月 (10k ops)
- **Pro**: $29/月 (25k ops)
- **Team**: $59/月 (100k ops)
- **Enterprise**: 定制

### 3. Zapier
- **Free**: 100 tasks/月
- **Start**: $19.99/月 (1000 tasks)
- **Professional**: $49/月 (2000 tasks)
- **Team**: $89/月 (2000 tasks + collaboration)
- **Enterprise**: 定制

### 4. SuperAGI (AI Agent框架)
- **Self-hosted**: 免费
- **Cloud**: $19/月起
- **Enterprise**: 定制

## WorkflowGuard定价建议

### 现有框架 (需填入具体价格)
```
Free:  基础功能, 有限审批数
Basic: $9/月  或  ¥49/月
Pro:   $29/月 或  ¥149/月  ← 推荐"最受欢迎"
Team:  $59/月 或  ¥299/月  企业方案
```

### 定价策略建议
1. **免费层要有真实价值** — 至少5个工作流+20次审批/月，让用户体验核心功能
2. **Pro档定为"最受欢迎"** — 定价在$29或¥149，包含 unlimited workflows + 1000 approvals/月
3. **Team档强调协作** — 多人管理、角色权限、审计日志导出
4. **考虑年付折扣** — 年付8折，锁定长期用户

### 关键差异化
- 不是"自动化"而是"人机协作"——审批是核心卖点
- 审计日志 = 合规价值（对中小企业有吸引力）
- 飞书集成 = 中国市场规模化入口

---
*研究时间: 2026-08-16 08:00 CST*
