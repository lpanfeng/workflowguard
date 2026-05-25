"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import Link from "next/link"

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // 使用 Supabase Auth REST API 发送密码重置邮件
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
        toast.success("密码重置链接已发送到您的邮箱")
      } else {
        const err = await res.json()
        toast.error(err.error || "发送失败，请稍后重试")
      }
    } catch {
      toast.error("出错了，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="text-xl font-bold mb-2 block">
            WorkflowGuard
          </Link>
          <CardTitle className="text-2xl">重置密码</CardTitle>
          <CardDescription>
            输入您注册时使用的邮箱，我们将发送重置链接
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <p className="text-sm text-muted-foreground">
                如果该邮箱已注册，您将收到一封包含密码重置链接的邮件。
                <br />
                请检查您的收件箱（及垃圾邮件）。
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  返回登录
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "发送中..." : "发送重置链接"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link href="/auth/login" className="text-primary hover:underline">
                  返回登录
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
