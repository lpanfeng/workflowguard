"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("缺少确认令牌");
      return;
    }

    fetch(`/api/waitlist/confirm?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setStatus("success");
          setMessage(data.message || "邮箱确认成功！");
          setEmail(data.email || "");
        } else {
          setStatus("error");
          setMessage(data.error || "确认失败");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("网络错误，请稍后重试");
      });
  }, [searchParams]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              返回首页
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 py-16 px-4">
        <div className="container mx-auto max-w-md">
          <div className="text-center">
            {status === "loading" && (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                </div>
                <h1 className="text-2xl font-bold mb-2">正在确认...</h1>
                <p className="text-muted-foreground">请稍候，正在验证您的邮箱</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <Badge variant="outline" className="mb-4 px-4 py-1 text-sm">
                  <CheckCircle className="inline h-3 w-3 mr-1" />
                  确认成功
                </Badge>
                <h1 className="text-2xl font-bold mb-2">邮箱已确认！</h1>
                {email && (
                  <p className="text-muted-foreground mb-1">
                    已确认邮箱: <strong className="text-foreground">{email}</strong>
                  </p>
                )}
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="flex flex-col gap-3">
                  <Link href="/waitlist" className="w-full">
                    <Button variant="outline" size="lg" className="w-full">
                      返回等待名单
                    </Button>
                  </Link>
                  <Link href="/dashboard" className="w-full">
                    <Button size="lg" className="w-full gap-2">
                      预览仪表盘
                      <Shield className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
                  <XCircle className="h-8 w-8 text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">确认失败</h1>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="flex flex-col gap-3">
                  <Link href="/waitlist" className="w-full">
                    <Button variant="outline" size="lg" className="w-full">
                      返回等待名单
                    </Button>
                  </Link>
                  <Link href="/" className="w-full">
                    <Button size="lg" variant="ghost" className="w-full">
                      返回首页
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          WorkflowGuard © 2026
        </Link>
      </footer>
    </div>
  );
}
