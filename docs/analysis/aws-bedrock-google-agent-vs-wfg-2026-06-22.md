# 竞品分析：AWS Bedrock Agent + Google Agent Builder vs WorkflowGuard

> 日期：2026-06-22
> 作者：Agnes Flash
> 目的：WFG差异化策略再定位

---

## 1. AWS Bedrock Agent 分析

### 1.1 核心能力
- **Agent编排**：自动调用API、检索知识库、与用户自然对话
- **Action Groups**：定义Agent可执行的操作（API调用）
- **Knowledge Bases**：集成私有数据源
- **Memory**：会话上下文持久化
- **Traces**：逐步追踪Agent推理过程
- **Guardrails**：安全护栏（输入/输出过滤）
- **User Permissions**：IAM权限管理
- **Monitoring**：内置监控和加密

### 1.2 治理能力的空白
- ❌ **没有审批流**：Agent执行完直接返回结果，没有人机协同审批环节
- ❌ **没有审计日志**：虽然有Trace，但不是面向业务操作的审计日志
- ❌ **没有human-in-the-loop**：不支持"AI执行→人工审批→确认执行"的模式
- ❌ **没有暂停/恢复**：无法中途暂停Agent执行等待人工决策
- ❌ **没有置信度分级**：AI输出没有置信度评估和分流机制
- ⚠️ Guardrails只限于安全层面（注入防护），不是业务流程审批

### 1.3 定位
AWS Bedrock Agent = **Agent构建框架**（开发者工具）
- 目标用户：有开发能力的企业
- 核心价值：降低Agent开发门槛
- 商业模式：AWS生态绑定，按调用量付费

---

## 2. Google Agent Builder 分析

### 2.1 核心能力
- **Agent创建**：可视化构建AI Agent
- **工具集成**：连接Google Workspace、第三方API
- **上下文管理**：自动维护对话历史
- **安全控制**：Google Cloud IAM + 数据安全策略

### 2.2 治理能力的空白
- ❌ 没有审批工作流
- ❌ 没有审计日志
- ❌ 没有human-in-the-loop机制
- ❌ 没有执行置信度评估
- ⚠️ 安全控制偏向数据隐私，而非业务审批

### 2.3 定位
Google Agent Builder = **企业AI代理搭建工具**
- 目标用户：Google Cloud用户
- 核心价值：与企业生态无缝集成
- 商业模式：GCP绑定

---

## 3. 大厂方案 vs WorkflowGuard 对比矩阵

| 维度 | AWS Bedrock Agent | Google Agent Builder | WorkflowGuard |
|------|-------------------|---------------------|---------------|
| **核心定位** | Agent构建框架 | Agent搭建工具 | Agent治理平台 |
| **审批流** | ❌ | ❌ | ✅ 多级审批链 |
| **审计日志** | ⚠️ Trace（技术级） | ❌ | ✅ 业务级审计 |
| **Human-in-the-loop** | ❌ | ❌ | ✅ 核心功能 |
| **置信度分级** | ❌ | ❌ | ✅ AI输出自动评级 |
| **暂停/恢复** | ❌ | ❌ | ✅ 执行中暂停 |
| **独立部署** | ❌（必须AWS） | ❌（必须GCP） | ✅ 支持 |
| **技术门槛** | 高（需编程） | 中 | 低（可视化） |
| **成本** | 高（AWS生态绑定） | 高（GCP绑定） | 中（独立SaaS） |
| **学习曲线** | 陡峭 | 中等 | 平缓 |
| **目标用户** | 开发者/技术团队 | 企业IT部门 | 中小企业管理者 |

---

## 4. WFG 差异化策略

### 4.1 核心差异化：治理层 vs 构建层

**AWS/Google做的是"造Agent"，WFG做的是"管Agent"。**

这是一个完全不同的赛道：
- 大厂方案解决的是：如何快速搭建一个能用的AI Agent
- WFG解决的是：搭好的Agent敢不敢用、用了出问题怎么办

### 4.2 WFG的杀手锏

**"不绑定任何云厂商的Agent治理中间件"**

- 无论Agent跑在AWS/Google/OpenAI/DeepSeek上，WFG都可以接入
- 这是大厂方案做不到的——他们的治理工具只能治理自己的Agent
- WFG可以做**跨平台的Agent统一治理层**

### 4.3 市场定位

| 层级 | 解决的问题 | 代表产品 | WFG位置 |
|------|-----------|---------|--------|
| Agent构建层 | 如何搭建Agent | Bedrock Agent, Claude, GPT | ❌ 不竞争 |
| Agent编排层 | 如何让多个Agent协作 | LangGraph, CrewAI | ❌ 不竞争 |
| **Agent治理层** | **如何让Agent安全可信地执行** | **WFG** | ✅ **核心战场** |
| 可观测性层 | 如何监控Agent行为 | Arize, LangSmith | ⚠️ 部分竞争 |

### 4.4 目标用户再细化

**第一优先级**：使用多个AI工具但缺乏治理能力的中小企业
- 痛点：用了OpenAI/Claude/DeepSeek，但不知道Agent到底干了什么
- WFG价值：给已有的AI工具加一层"保险"

**第二优先级**：已有Agent但担心合规风险的企业
- 痛点：监管要求审计、追溯、审批
- WFG价值：合规引擎

### 4.5 竞争壁垒

1. **独立部署**：大厂方案无法做到（绑定自家云）
2. **多平台兼容**：不绑定特定LLM提供商
3. **审批审计专长**：专注于business governance而非technical observability
4. **中小企业友好**：低代码、可视化、开箱即用

---

## 5. 营销话术建议

### 面向管理者
> "你不需要重新搭建Agent，WorkflowGuard给你的Agent加一套'安全带'。"

### 面向技术负责人
> "不管你的Agent跑在AWS还是GCP还是自建，WFG提供统一的审批和审计层。"

### 面向合规团队
> "Agent做了什么、谁批准的、什么时候做的——全部可追溯，30秒定位问题根因。"

---

## 6. 信息来源

- [AWS Bedrock Agents Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html) — 浏览器抓取
- 竞品分析基于公开文档和功能描述，未进行深度功能测试
- 注意：Google Agent Builder的具体功能细节需进一步调研
