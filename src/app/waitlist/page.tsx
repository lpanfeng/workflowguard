"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, CheckCircle, Clock, Sparkles, Users, TrendingUp, ArrowRight, Zap, Gift } from "lucide-react";
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

export default function WaitlistPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [workflowPurpose, setWorkflowPurpose] = useState<string[]>([]);
  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/waitlist/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    // Check for referral code in URL
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          company: company.trim() || null,
          role: role.trim() || null,
          workflow_purpose: workflowPurpose.length > 0 ? workflowPurpose.join(",") : null,
          priority,
          source: referralCode ? `ref:${referralCode}` : "waitlist_page",
          referred_by: referralCode,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Redirect to success page with email
        router.push(`/waitlist/success?email=${encodeURIComponent(email.trim())}${data.referredBy ? `&ref=${data.referredBy}` : ''}`);
      } else {
        setStatus("error");
        setMessage(data.error || "提交失败，请稍后重试");
      }
    } catch (error) {
      setStatus("error");
      setMessage("网络错误，请稍后重试");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">返回首页</Link>
            <Link href="/pricing" className="hover:text-foreground">定价</Link>
            <Link href="/dashboard" className="hover:text-foreground">仪表盘</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <section className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-lg">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-4">
              <Sparkles className="inline h-3 w-3 mr-1" />
              抢先体验
            </Badge>
            <h1 className="text-3xl font-bold mb-3">加入等待名单</h1>
            <p className="text-muted-foreground">
              成为首批用户，获取内测资格和专属优惠
            </p>
          </div>

          {/* Referral Banner */}
          {referralCode && (
            <div className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
              <Gift className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-medium">您通过邀请码加入</p>
                <p className="text-xs text-muted-foreground">邀请码: {referralCode} | 双方将获得额外福利</p>
              </div>
            </div>
          )}

          {/* Stats */}
          {!statsLoading && stats && (
            <div className="flex items-center justify-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span><strong>{stats.total}</strong> 人已加入</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>今日 <strong>+{stats.todayCount}</strong></span>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="rounded-xl border bg-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">邮箱 *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">姓名（可选）</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="您的姓名"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Company & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">公司（可选）</Label>
                  <Input
                    id="company"
                    type="text"
                    placeholder="公司名称"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">角色（可选）</Label>
                  <Input
                    id="role"
                    type="text"
                    placeholder="您的职位"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </div>

              {/* Workflow Purpose */}
              <div className="space-y-3">
                <Label>最关注的工作流场景（可选，可多选）</Label>
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

              {/* Priority */}
              <div className="space-y-2">
                <Label>优先级</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v || "medium")}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择优先级" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        低 — 有兴趣，不急
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        中 — 比较关注，尽快试用
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        高 — 急需，愿意第一时间参与测试
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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

              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span>高优先级用户将优先获得内测资格</span>
              </div>
            </form>
          </div>

          {/* Referral Info */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-dashed">
            <div className="flex items-start gap-3">
              <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-sm">邀请好友，双方得利</p>
                <p className="text-xs text-muted-foreground mt-1">
                  已有邀请码？在URL中添加 ?ref=CODE 即可关联。
                  每成功邀请1人，双方各获得1个月免费使用。
                </p>
              </div>
            </div>
          </div>
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
