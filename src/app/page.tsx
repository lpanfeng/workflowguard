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
        {/* 背景装饰 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <Badge className="mb-6 px-4 py-1" variant="outline">
          🚀 人机协作工作流平台 · 2026 Beta
        </Badge>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl leading-tight">
          想让 AI 替你干活，
          <br />
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

        {/* 核心卖点 */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="text-3xl">🤖</span>
            <h3 className="font-semibold">AI 自动执行</h3>
            <p className="text-sm text-muted-foreground text-center">
              任务创建后自动触发 AI 处理，无需手动干预
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="text-3xl">👤</span>
            <h3 className="font-semibold">人工审批把关</h3>
            <p className="text-sm text-muted-foreground text-center">
              AI 结果必须经过你确认，杜绝"黑盒输出"
            </p>
          </div>
          <div className="flex flex-col items-center gap-2 p-4">
            <span className="text-3xl">📋</span>
            <h3 className="font-semibold">全程审计追溯</h3>
            <p className="text-sm text-muted-foreground text-center">
              谁在什么时候做了什么，完整记录可追溯
            </p>
          </div>
        </div>
      </section>

      {/* 适用场景 */}
      <section className="border-t py-20 bg-muted/20">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl font-bold text-center mb-2">适用场景</h2>
          <p className="text-muted-foreground text-center mb-12">
            你在什么场景下需要 AI + 人工的双重保障？
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background rounded-xl p-8 border hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">🎧</div>
              <h3 className="font-semibold text-lg mb-2">客服工单处理</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI 自动生成回复草稿，人工审核后发送。既提升回复速度，又确保质量和品牌调性。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">减少 70% 回复时间</Badge>
                <Badge variant="secondary">保留人工控制权</Badge>
              </div>
            </div>
            <div className="bg-background rounded-xl p-8 border hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📝</div>
              <h3 className="font-semibold text-lg mb-2">内容创作发布</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                输入主题，AI 生成草稿，编辑在线审批修改。内容生产流水线化，质量不妥协。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">加速内容产出</Badge>
                <Badge variant="secondary">编辑终审把关</Badge>
              </div>
            </div>
            <div className="bg-background rounded-xl p-8 border hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-2">数据录入处理</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                AI 从文件或图片中提取结构化数据，人工确认后写入系统。告别手动录入，杜绝错误。
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">减少人工录入错误</Badge>
                <Badge variant="secondary">数据准确性验证</Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 模板 Section */}
      <section id="templates" className="border-t py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">预设工作流模板</h2>
          <p className="text-muted-foreground text-center mb-10">
            开箱即用，5 分钟上手。三步走：选择模板 → 命名工作流 → 开始执行任务
          </p>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">🎧</div>
              <h3 className="font-semibold text-lg mb-2">客服工单审批流</h3>
              <p className="text-sm text-muted-foreground">
                客户咨询 → AI 自动生成回复草稿 → 人工审核/修改 → 发送
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">AI 生成</Badge>
                <Badge variant="secondary">人工审核</Badge>
              </div>
            </div>
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">📝</div>
              <h3 className="font-semibold text-lg mb-2">内容发布审批流</h3>
              <p className="text-sm text-muted-foreground">
                输入主题 → AI 生成内容草稿 → 人工编辑/审批 → 发布
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">AI 写作</Badge>
                <Badge variant="secondary">内容管理</Badge>
              </div>
            </div>
            <div className="border rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="font-semibold text-lg mb-2">数据录入审批流</h3>
              <p className="text-sm text-muted-foreground">
                上传文件/图片 → AI 提取数据 → 人工确认 → 写入表格
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">OCR 提取</Badge>
                <Badge variant="secondary">数据录入</Badge>
              </div>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link href="/auth/register">
              <Button size="lg">免费创建你的第一个工作流</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA 区块 */}
      <section className="border-t py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-3xl font-bold mb-4">准备好让人机协作了吗？</h2>
          <p className="text-muted-foreground mb-8">
            免费开始，无需信用卡。2 个工作流 + 20 次审批/月，完全够你体验 AI + 人工的工作方式。
          </p>
          <div className="flex gap-4 justify-center">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 WorkflowGuard. Built with ❤️ for teams that need safe AI.</p>
        <p className="mt-1">
          WorkflowGuard · 人机协作工作流平台 · 让 AI 做事，让人做决策
        </p>
      </footer>
    </div>
  );
}
