"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Clock, Sparkles, Users, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";

interface WaitlistStats {
  total: number;
  todayCount: number;
  weekCount: number;
}

const WORKFLOW_PURPOSES = [
  { value: "customer_service", label: "客服工单审批", desc: "AI自动分类+人工审批" },
  { value: "content_publish", label: "内容发布流程", desc: "AI生成+人工审核发布" },
  { value: "data_entry", label: "数据录入校验", desc: "AI自动校验+异常处理" },
  { value: "expense_approval", label: "费用报销审批", desc: "AI初筛+多级审批" },
  { value: "code_review", label: "代码审查辅助", desc: "AI预审+人工确认" },
  { value: "other", label: "其他场景", desc: "自定义工作流需求" },
];

interface WaitlistStats {
  total: number;
  todayCount: number;
  weekCount: number;
}

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [workflowPurpose, setWorkflowPurpose] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/waitlist/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null, company: company.trim() || null, role: role.trim() || null, workflow_purpose: workflowPurpose.length > 0 ? workflowPurpose.join(",") : null, source: "waitlist_page" }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message);
        // Refresh stats after successful submission
        fetch("/api/waitlist/stats")
          .then((r) => r.json())
          .then((d) => setStats(d))
          .catch(() => {});
      } else {
        if (data.alreadyRegistered) {
          setAlreadyRegistered(true);
          setStatus("success");
          setMessage("您的邮箱已在等待名单中，我们会第一时间通知您！");
        } else {
          setStatus("error");
          setMessage(data.error || "提交失败，请稍后重试");
        }
      }
    } catch {
      setStatus("error");
      setMessage("网络错误，请稍后重试");
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              返回首页
            </Link>
            <Link href="/auth/register">
              <Button size="sm">登录</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative py-20 px-4">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-2xl text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1 text-sm">
            <Sparkles className="inline h-3 w-3 mr-1" />
            Beta 抢先体验
          </Badge>

          {/* Social Proof Stats */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{statsLoading ? "..." : stats?.total || 0}</span>
              <span className="text-sm text-muted-foreground">人加入等待</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">
                今日 +{stats?.todayCount || 0}
              </span>
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">
            加入 WorkflowGuard 等待名单
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            人机协作工作流平台即将上线。留下邮箱，第一时间获取访问权限。
          </p>

          {/* Features preview */}
          <div className="grid grid-cols-3 gap-4 mb-10 text-sm">
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-medium">审计追踪</span>
              <span className="text-muted-foreground text-xs">AI决策全记录</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <span className="font-medium">审批工作流</span>
              <span className="text-muted-foreground text-xs">人机协同审批</span>
            </div>
            <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Clock className="h-6 w-6 text-blue-500" />
              <span className="font-medium">飞书集成</span>
              <span className="text-muted-foreground text-xs">原生审批通知</span>
            </div>
          </div>

          {/* Form */}
          {status === "success" ? (
            <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-green-700 mb-2">
                {alreadyRegistered ? "您已在等待名单中！" : "恭喜，您已加入等待名单！"}
              </h2>
              <p className="text-green-600 mb-4">{message}</p>
              <Link href="/">
                <Button>返回首页</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名（可选）</Label>
                  <Input
                    id="name"
                    placeholder="您的姓名"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">公司（可选）</Label>
                  <Input
                    id="company"
                    placeholder="您的公司"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">角色（可选）</Label>
                  <Input
                    id="role"
                    placeholder="您的职位"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>

              {/* Workflow Purpose Selection */}
              <div className="space-y-3 pt-2">
                <Label>您最关注的工作流场景（可选，可多选）</Label>
                <div className="grid grid-cols-2 gap-3">
                  {WORKFLOW_PURPOSES.map((purpose) => (
                    <div
                      key={purpose.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        workflowPurpose.includes(purpose.value)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => {
                        setWorkflowPurpose(prev =>
                          prev.includes(purpose.value)
                            ? prev.filter(p => p !== purpose.value)
                            : [...prev, purpose.value]
                        );
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={workflowPurpose.includes(purpose.value)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-medium text-sm">{purpose.label}</p>
                          <p className="text-xs text-muted-foreground">{purpose.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {status === "error" && (
                <p className="text-sm text-red-500">{message}</p>
              )}
              <Button type="submit" className="w-full" size="lg" disabled={status === "loading"}>
                {status === "loading" ? "提交中..." : "加入等待名单"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                我们不会 spam，只在产品上线时通知您。
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          WorkflowGuard © 2026
        </Link>
      </footer>
    </div>
  );
}
