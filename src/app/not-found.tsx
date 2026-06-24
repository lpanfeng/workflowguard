import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold mb-2">页面未找到</h1>
        <p className="text-muted-foreground mb-8">
          您访问的页面不存在，可能是链接过期或被移除了。
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            返回首页
          </Link>
          <Link href="/workflows" className="inline-flex items-center px-4 py-2 border rounded-lg hover:bg-accent transition-colors">
            浏览工作流
          </Link>
          <Link href="/templates" className="inline-flex items-center px-4 py-2 border rounded-lg hover:bg-accent transition-colors">
            模板库
          </Link>
        </div>
      </div>
    </div>
  );
}
