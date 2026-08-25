# 🔧 WorkflowGuard: 产品打磨 — 增强Dashboard数据统计 + 添加使用引导

> 2026-08-25 | Day 91

## 今日优化内容

### 1. Dashboard — 添加"今日关键指标"卡片
在仪表盘页面顶部添加一行关键指标卡片，帮助用户3秒内了解核心状态：
- 今日待审批任务数（带环比）
- 本周AI调用次数
- 平均审批时长
- 工作流成功率

### 2. Landing Page — 添加实时数据展示
在Landing Page的"快速指标"区域，从静态数据改为动态获取真实数据（如果API可用），增强可信度。

### 3. 新用户引导增强
在首次登录Dashboard时，添加一个轻量级的使用引导（Tooltip式），指向关键功能区域。

## 代码变更

### 修改文件列表
- `src/components/features/DashboardMetricsCards.tsx` — 增强指标卡片
- `src/app/dashboard/page.tsx` — 添加新指标
- `src/app/page.tsx` — 增强landing page数据展示
