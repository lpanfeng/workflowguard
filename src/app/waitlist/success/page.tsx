"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Clock, Sparkles, Users, TrendingUp, ArrowRight, Zap, Copy, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const FEATURE_HIGHLIGHTS = [
  {
    icon: Shield,
    title: "审计追踪",
    desc: "AI执行每一步都有完整日志记录",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: CheckCircle,
    title: "人机协同审批",
    desc: "Agent执行→人工审批→全程可追溯",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Clock,
    title: "飞书原生集成",
    desc: "审批通知直达飞书，支持移动端审批",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
];

const SHARE_TEXTS = [
  {
    platform: "微信",
    icon: "💬",
    action: "复制链接分享",
  },
  {
    platform: "微博",
    icon: "📢",
    action: "转发到此",
  },
  {
    platform: "LinkedIn",
    icon: "💼",
    action: "分享",
  },
];

export default function WaitlistSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [countLoading, setCountLoading] = useState(true);

  useEffect(() => {
    // Get email from URL params if passed
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(decodeURIComponent(emailParam));

    // Fetch total count for social proof
    fetch("/api/waitlist/stats")
      .then((res) => res.json())
      .then((data) => setTotalCount(data.total))
      .catch(() => setTotalCount(0))
      .finally(() => setCountLoading(false));
  }, [searchParams]);

  const handleCopyLink = () => {
    const url = window.location.origin + "/waitlist";
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = (platform: string) => {
    const url = encodeURIComponent(window.location.origin + "/waitlist");
    const text = encodeURIComponent("我正在使用WorkflowGuard，一个AI人机协作工作流平台，快来加入等待名单吧！");
    
    switch (platform) {
      case "微信":
        // WeChat doesn't have a direct share URL, just copy
        handleCopyLink();
        break;
      case "微博":
        window.open(`https://weibo.com/share/share?url=${url}&title=${text}`, "_blank");
        break;
      case "LinkedIn":
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
        break;
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
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              返回首页
            </Link>
            <Link href="/dashboard">
              <Button size="sm" variant="outline">预览仪表盘</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Success Section */}
      <section className="flex-1 py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          {/* Success Card */}
          <div className="text-center mb-10">
            {/* Big Checkmark */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>

            <Badge variant="outline" className="mb-4 px-4 py-1 text-sm">
              <Sparkles className="inline h-3 w-3 mr-1" />
              加入成功
            </Badge>

            <h1 className="text-3xl font-bold mb-3">
              恭喜，您已加入等待名单！
            </h1>
            
            {email && (
              <p className="text-muted-foreground mb-2">
                确认邮件将发送至 <strong className="text-foreground">{email}</strong>
              </p>
            )}
            
            <p className="text-muted-foreground">
              我们已收到您的订阅，产品上线时会第一时间通知您。
            </p>

            {/* Social Proof */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {countLoading ? "..." : totalCount || 0}
                </span>
                <span className="text-sm text-muted-foreground">人已加入</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">
                  今日 +{countLoading ? "..." : "1"}
                </span>
              </div>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {FEATURE_HIGHLIGHTS.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl ${feature.bgColor} border border-border/50`}
                >
                  <Icon className={`h-6 w-6 ${feature.color}`} />
                  <span className="font-medium text-sm text-center">{feature.title}</span>
                  <span className="text-xs text-muted-foreground text-center leading-tight">
                    {feature.desc}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Invite Friends Section */}
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-2 text-center">
              🎉 邀请同事一起加入
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              分享给更多人，一起见证AI人机协作的未来
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {SHARE_TEXTS.map((share) => (
                <Button
                  key={share.platform}
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(share.platform)}
                  className="gap-2"
                >
                  <span>{share.icon}</span>
                  {share.platform}
                  <ExternalLink className="h-3 w-3" />
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2"
              >
                <Copy className={`h-3 w-3 ${copied ? "text-green-500" : ""}`} />
                {copied ? "已复制!" : "复制链接"}
              </Button>
            </div>
          </div>

          {/* Next Steps */}
          <div className="rounded-xl border bg-muted/30 p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">📋 接下来会发生什么？</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">发送确认邮件</p>
                  <p className="text-xs text-muted-foreground">我们将向您发送一封确认邮件，确认您的订阅。</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm">产品内测邀请</p>
                  <p className="text-xs text-muted-foreground">内测期间，我们将按优先级顺序邀请用户参与测试。</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm">正式产品上线</p>
                  <p className="text-xs text-muted-foreground">产品正式上线时，您将第一时间收到通知和访问链接。</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="flex-1">
              <Button variant="outline" size="lg" className="w-full">
                返回首页
              </Button>
            </Link>
            <Link href="/dashboard" className="flex-1">
              <Button size="lg" className="w-full gap-2">
                预览仪表盘
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Privacy note */}
          <p className="text-xs text-center text-muted-foreground mt-6">
            我们尊重您的隐私，不会发送垃圾邮件。只在产品有重要更新时联系您。
          </p>
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
