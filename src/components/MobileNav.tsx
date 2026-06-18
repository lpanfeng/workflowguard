"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Workflow, FolderOpen, User } from "lucide-react"

const tabs = [
  {
    label: "首页",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "工作流",
    href: "/workflows/list",
    icon: Workflow,
  },
  {
    label: "模板库",
    href: "/templates",
    icon: FolderOpen,
  },
  {
    label: "我的",
    href: "/settings",
    icon: User,
  },
] as const

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mobile:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-around py-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/")
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 text-xs transition-colors ${
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
