# WorkflowGuard Onboarding 增强 - 技术设计

## 改进目标
提升新用户首次体验，降低30秒内完成第一个工作流创建

## 待实现的增强

### 1. 进度持久化 (localStorage)
- 保存当前步骤到 localStorage
- 下次访问自动恢复进度
- 清除条件: 完成onboarding / 手动清除

### 2. Step 2 交互增强
- 在onboarding中集成模板选择卡片
- 添加"模拟演示"按钮: 展示一个demo工作流的执行过程
- 点击卡片直接跳转到 /workflows/new?template=X

### 3. 欢迎消息个性化
- 使用session中的用户名打招呼
- 显示上次访问时间

### 4. 社交证明
- 在Step 1添加"已有XX个团队在使用"数据
- 添加简短用户评价

### 5. 完成状态优化
- 添加confetti动画
- 跳转dashboard时传递更多上下文

## 文件路径
- /root/.openclaw/workspace/workflowguard/src/app/onboarding/page.tsx
- /root/.openclaw/workspace/workflowguard/src/components/features/OnboardingWizard.tsx