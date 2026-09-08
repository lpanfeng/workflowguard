"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, MessageSquare, Users, Gift, TrendingUp, Award } from "lucide-react";
import Link from "next/link";

interface ReferralStats {
  totalWaitlist: number;
  activeWithReferral: number;
  totalReferrals: number;
  topReferrers: Array<{ email: string; name: string | null; referredCount: number }>;
}

const adminCards = [
  {
    title: "等待名单",
    description: "查看和管理用户订阅等待名单",
    icon: Users,
    href: "/admin/waitlist",
    color: "text-orange-500",
  },
  {
    title: "用户反馈",
    description: "查看和管理用户提交的反馈意见",
    icon: MessageSquare,
    href: "/admin/feedbacks",
    color: "text-blue-500",
  },
  {
    title: "工作流管理",
    description: "管理和监控所有工作流执行记录",
    icon: FileText,
    href: "/admin/workflows",
    color: "text-green-500",
  },
  {
    title: "系统设置",
    description: "配置平台参数和集成设置",
    icon: Settings,
    href: "/admin/settings",
    color: "text-purple-500",
  },
];

export default function AdminPage() {
  const [refStats, setRefStats] = useState<ReferralStats | null>(null);
  const [refLoading, setRefLoading] = useState(true);

  useEffect(() => {
    fetch("/api/referral/stats")
      .then((res) => res.json())
      .then((data) => setRefStats(data))
      .catch(() => {})
      .finally(() => setRefLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理后台</h1>
        <p className="text-muted-foreground">WorkflowGuard 平台管理</p>
      </div>

      {/* Referral Stats Overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          推荐邀请概览
        </h2>
        {refLoading ? (
          <div className="grid gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : refStats ? (
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{refStats.totalWaitlist}</p>
                  <p className="text-xs text-muted-foreground">等待名单总数</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Gift className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{refStats.totalReferrals}</p>
                  <p className="text-xs text-muted-foreground">成功邀请数</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{refStats.activeWithReferral}</p>
                  <p className="text-xs text-muted-foreground">活跃邀请码</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Award className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-500">
                    {refStats.topReferrers[0]?.referredCount || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">最高邀请数</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Top Referrers */}
        {refStats && refStats.topReferrers.length > 0 && (
          <Card className="mt-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-500" />
                邀请排行榜 Top 5
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {refStats.topReferrers.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="font-medium">{r.name || r.email}</span>
                      <span className="text-muted-foreground text-xs">{r.email}</span>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Gift className="h-3 w-3" />
                      {r.referredCount} 次邀请
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${card.color}`} />
                    <CardTitle className="text-base">{card.title}</CardTitle>
                  </div>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">点击进入管理 →</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
