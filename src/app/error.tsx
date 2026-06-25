'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="zh">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <div className="text-8xl font-bold text-destructive mb-4">500</div>
            <h1 className="text-2xl font-bold mb-2">服务器内部错误</h1>
            <p className="text-muted-foreground mb-8">
              抱歉，服务器遇到了意外错误。我们正在调查这个问题。
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={reset} className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                重试
              </button>
              <a href="/" className="inline-flex items-center px-4 py-2 border rounded-lg hover:bg-accent transition-colors">
                返回首页
              </a>
              <a href="/feedback" className="inline-flex items-center px-4 py-2 border rounded-lg hover:bg-accent transition-colors">
                联系支持
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
