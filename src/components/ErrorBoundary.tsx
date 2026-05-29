"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("ErrorBoundary caught:", error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center max-w-md px-4">
            <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-6" />
            <h1 className="text-2xl font-bold mb-2">出错了</h1>
            <p className="text-muted-foreground mb-2">
              页面遇到了一个意外错误。
            </p>
            <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted p-2 rounded">
              {this.state.error?.message ?? "未知错误"}
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined })
                  window.location.reload()
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新页面
              </Button>
              <Link href="/dashboard">
                <Button>
                  <Home className="h-4 w-4 mr-2" />
                  返回仪表盘
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
