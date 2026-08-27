import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, MessageSquare, Users } from "lucide-react";
import Link from "next/link";

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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">管理后台</h1>
        <p className="text-muted-foreground">WorkflowGuard 平台管理</p>
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
