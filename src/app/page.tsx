import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">WorkflowGuard</span>
            <Badge variant="secondary" className="text-xs">Beta</Badge>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#pain-points" className="hover:text-foreground transition-colors">痛点</Link>
            <Link href="#templates" className="hover:text-foreground transition-colors">模板</Link>
            <Link href="#features" className="hover:text-foreground transition-colors">功能</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">定价</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">仪表盘</Link>
            <Link href="/workflows/new" className="hover:text-foreground transition-colors">创建工作流</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">登录</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">免费注册</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <Badge className="mb-6 px-4 py-1" variant="outline">
          🚀 人机协作工作流平台 · Beta 版发布
        </Badge>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl leading-tight">
          想让 AI 替你干活，<br />
          又怕它胡说八道？
        </h1>
        
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          <strong className="text-foreground">WorkflowGuard</strong> 让人工审批成为 AI 执行的安全阀门。
          <br />
          AI 自动处理任务，关键节点由你审批，全程操作可审计。
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/auth/register">
            <Button size="lg" className="text-base px-8">
              免费开始使用
            </Button>
          </Link>
          <Link href="#templates">
            <Button variant="outline" size="lg" className="text-base px-8">
              查看工作流模板
            </Button>
          </Link>
        </div>

        {/* 快速指标 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl w-full">
          <div className="flex flex-col items-center gap-1 p-4 bg-background/50 rounded-lg border">
            <span className="text-2xl font-bold text-primary">70%</span>
            <p className="text-xs text-muted-foreground">客服回复时间缩短</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-4 bg-background/50 rounded-lg border">
            <span className="text-2xl font-bold text-primary">5 分钟</span>
            <p className="text-xs text-muted-foreground">创建工作流</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-4 bg-background/50 rounded-lg border">
            <span className="text-2xl font-bold text-primary">3 种</span>
            <p className="text-xs text-muted-foreground">预设模板开箱即用</p>
          </div>
          <div className="flex flex-col items-center gap-1 p-4 bg-background/50 rounded-lg border">
            <span className="text-2xl font-bold text-primary">100%</span>
            <p className="text-xs text-muted-foreground">全流程可审计</p>
          </div>
        </div>
      </section>

      {/* 痛点 Section */}
      <section id="pain-points" className="border-t py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-4">你大概率也遇到过</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            在尝试用 AI Agent 提升团队效率的时候，这些坑是不是很眼熟？
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="text-2xl mb-3">😰</div>
              <h3 className="font-semibold mb-2">AI 幻觉，信不得</h3>
              <p className="text-sm text-muted-foreground">
                GPT 给出的答案经常需要二次验证，不敢让它完全自主执行。每次都要人肉核对，等于白干。
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="text-2xl mb-3">⚖️</div>
              <h3 className="font-semibold mb-2">效率与安全的两难</h3>
              <p className="text-sm text-muted-foreground">
                全自动化风险太高，全人工效率太低。你需要的不是二选一，而是一个折中方案。
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 border shadow-sm">
              <div className="text-2xl mb-3">📋</div>
              <h3 className="font-semibold mb-2">出了事查不到</h3>
              <p className="text-sm text-muted-foreground">
                AI 到底做了什么决定？谁批准的？什么时候改了内容？没有审计日志，出了问题根本没法追责。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 模板 Section */}
      <section id="templates" className="border-t py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-2">
            <Badge className="px-3 py-1 mb-3">开箱即用</Badge>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">预设工作流模板</h2>
          <p className="text-muted-foreground text-center mb-10">
            三步走：选择模板 → 命名工作流 → 开始执行任务。无需编程，5 分钟上手。
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="text-3xl mb-3">🎧</div>
              <h3 className="font-semibold text-lg mb-2">客服工单审批流</h3>
              <div className="text-xs text-muted-foreground mb-3 font-mono">customer-service</div>
              <p className="text-sm text-muted-foreground mb-4">
                客户咨询 → AI 自动生成回复草稿 → 人工审核/修改 → 发送给客户
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">AI 生成回复</Badge>
                <Badge variant="secondary">人工审核</Badge>
                <Badge variant="secondary">自动发送</Badge>
              </div>
            </div>
            <div className="border rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="font-semibold text-lg mb-2">内容发布审批流</h3>
              <div className="text-xs text-muted-foreground mb-3 font-mono">content-publish</div>
              <p className="text-sm text-muted-foreground mb-4">
                输入主题 → AI 生成文章草稿 → 编辑在线审批/修改 → 发布到平台
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">AI 写作</Badge>
                <Badge variant="secondary">编辑审批</Badge>
                <Badge variant="secondary">多平台发布</Badge>
              </div>
            </div>
            <div className="border rounded-xl p-6 hover:shadow-lg transition-all hover:-translate-y-1">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-lg mb-2">数据录入审批流</h3>
              <div className="text-xs text-muted-foreground mb-3 font-mono">data-entry</div>
              <p className="text-sm text-muted-foreground mb-4">
                上传文件/图片 → AI 提取结构化数据 → 人工确认 → 写入数据库
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">OCR 提取</Badge>
                <Badge variant="secondary">数据校验</Badge>
                <Badge variant="secondary">自动录入</Badge>
              </div>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link href="/auth/register">
              <Button size="lg" className="text-base px-8">
                免费创建你的第一个工作流
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 功能亮点 Section */}
      <section id="features" className="border-t py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-2">不止于审批</h2>
          <p className="text-muted-foreground text-center mb-12">
            WorkflowGuard 提供一套完整的 AI 工作流管理工具
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">🤖</div>
              <div>
                <h3 className="font-semibold mb-1">AI 执行引擎</h3>
                <p className="text-sm text-muted-foreground">支持 DeepSeek / OpenAI / Claude 多模型切换，针对不同模板智能构建 prompt，自动生成高质量结果。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">👤</div>
              <div>
                <h3 className="font-semibold mb-1">审批工作台</h3>
                <p className="text-sm text-muted-foreground">一站式审批中心，支持通过/驳回/修改后通过。飞书 Bot 实时通知，手机也能审批。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">📋</div>
              <div>
                <h3 className="font-semibold mb-1">审计日志系统</h3>
                <p className="text-sm text-muted-foreground">谁在什么时间做了什么操作，完整记录不可篡改。支持按操作类型和时间范围筛选。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">📊</div>
              <div>
                <h3 className="font-semibold mb-1">数据仪表盘</h3>
                <p className="text-sm text-muted-foreground">实时查看待审批任务、今日完成量、活跃工作流数。数据驱动你的工作流优化决策。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">💬</div>
              <div>
                <h3 className="font-semibold mb-1">飞书集成</h3>
                <p className="text-sm text-muted-foreground">飞书 Bot 实时推送审批通知，支持对话框直接通过/驳回。工作消息即审批入口。</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-xl shrink-0">🔒</div>
              <div>
                <h3 className="font-semibold mb-1">配额与权限</h3>
                <p className="text-sm text-muted-foreground">基于套餐的用量控制，月度自动重置。多角色权限管理，确保团队协作安全。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA 区块 */}
      <section className="border-t py-20 bg-gradient-to-r from-primary/5 to-blue-500/5">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">准备好让人机协作了吗？</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            免费开始，无需信用卡。<br />
            免费版包含 2 个工作流 + 100 次 AI 调用 + 20 次审批/月，完全够你体验。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-base px-8">
                免费注册 →
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg" className="text-base px-8">
                查看定价
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground">
            <span>🔒 安全加密</span>
            <span>🔄 随时取消</span>
            <span>💳 14 天无理由退款</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-3">WorkflowGuard</h3>
              <p className="text-sm text-muted-foreground">
                让 AI 做事，让人做决策。<br />
                面向中小企业的可控 AI 工作流平台。
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">产品</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/pricing" className="hover:text-foreground">定价</Link></li>
                <li><Link href="#features" className="hover:text-foreground">功能</Link></li>
                <li><Link href="#templates" className="hover:text-foreground">模板</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">资源</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-foreground">API 文档</Link></li>
                <li><Link href="#" className="hover:text-foreground">使用指南</Link></li>
                <li><Link href="#" className="hover:text-foreground">飞书 Bot 配置</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">联系</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>support@workflowguard.cn</li>
                <li><Link href="#" className="hover:text-foreground">GitHub</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-6 text-center text-xs text-muted-foreground">
            <p>© 2026 WorkflowGuard. Built with ❤️ for teams that need safe AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
