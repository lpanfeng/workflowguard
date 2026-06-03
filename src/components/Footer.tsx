// WorkflowGuard Footer 组件

import Link from "next/link"

const footerLinks = [
  {
    title: "产品",
    links: [
      { label: "工作流模板", href: "/workflows/new" },
      { label: "定价", href: "/pricing" },
      { label: "仪表盘", href: "/dashboard" },
    ],
  },
  {
    title: "资源",
    links: [
      { label: "帮助中心", href: "#" },
      { label: "API 文档", href: "/api/ai/execute" },
      { label: "状态页", href: "#" },
    ],
  },
  {
    title: "关于",
    links: [
      { label: "博客", href: "#" },
      { label: "隐私政策", href: "#" },
      { label: "服务条款", href: "#" },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-xl font-bold">
              WorkflowGuard
            </Link>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              让 AI 做事，让人做决策。
              <br />
              人机协作工作流平台。
            </p>
          </div>

          {/* Links */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold mb-3">{group.title}</h3>
              <ul className="space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WorkflowGuard. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Built with Next.js + Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
