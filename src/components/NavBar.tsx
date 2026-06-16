"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useSession, signOut } from "next-auth/react"
import { Badge } from "@/components/ui/badge"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

export function NavBar() {
  const { data: session } = useSession()

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <Badge variant="secondary" className="text-xs">Beta</Badge>
        </div>
        <nav className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">仪表盘</Button>
          </Link>
          <Link href="/templates">
            <Button variant="ghost" size="sm">模板库</Button>
          </Link>
          <Link href="/workflows/list">
            <Button variant="ghost" size="sm">工作流</Button>
          </Link>
          <Link href="/workflows/new">
            <Button variant="ghost" size="sm">创建工作流</Button>
          </Link>
          <Link href="/tasks">
            <Button variant="ghost" size="sm">任务列表</Button>
          </Link>
          <Link href="/audit-logs">
            <Button variant="ghost" size="sm">审计日志</Button>
          </Link>
          <Link href="/metrics">
            <Button variant="ghost" size="sm">指标</Button>
          </Link>
          <Link href="/pricing">
            <Button variant="ghost" size="sm">定价</Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" size="sm">设置</Button>
          </Link>
          {session?.user && (
            <>
              <span className="text-sm text-muted-foreground hidden md:inline">
                {session.user.email}
              </span>
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback>
                  {session.user.name?.charAt(0) ?? "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                退出
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}
