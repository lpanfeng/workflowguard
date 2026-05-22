import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">WorkflowGuard</span>
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">
                登录
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm">免费注册</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <Badge className="mb-4" variant="outline">
          🚀 人机协作工作流平台
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
          想用 AI Agent 又怕失控？
          <br />
          <span className="text-primary">WorkflowGuard 给你可控的人机协同</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
          AI 自动执行任务，关键节点人工审批，全程操作可审计。
          <br />
          既要效率，又要安全。
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/auth/register">
            <Button size="lg" className="text-base">
              免费开始使用
            </Button>
          </Link>
          <Link href="#templates">
            <Button variant="outline" size="lg" className="text-base">
              查看工作流模板
            </Button>
          </Link>
        </div>
      </section>

      {/* Templates Section */}
      <section id="templates" className="border-t py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">预设工作流模板</h2>
          <p className="text-muted-foreground text-center mb-10">
            开箱即用，5 分钟上手
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>© 2026 WorkflowGuard. Built with ❤️ for teams that need safe AI.</p>
      </footer>
    </div>
  );
}
