'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const CATEGORIES = [
  { value: 'bug', label: '🐛 功能异常', desc: '使用中遇到报错或异常行为' },
  { value: 'feature', label: '💡 新功能建议', desc: '希望WorkflowGuard增加的功能' },
  { value: 'ux', label: '🎨 体验优化', desc: '对界面或交互的建议' },
  { value: 'pricing', label: '💰 定价建议', desc: '对套餐定价的意见' },
  { value: 'other', label: '📝 其他意见', desc: '其他想说的话' },
];

export default function FeedbackPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('other');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          category,
          message,
          source: 'feedback-page',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setName('');
        setEmail('');
        setMessage('');
        setCategory('other');
      }
    } catch (err) {
      console.error('提交失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="text-5xl mb-4">🎉</div>
            <CardTitle>感谢你的反馈！</CardTitle>
            <CardDescription>
              你的意见对我们非常重要，我们会认真阅读并改进。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button>返回首页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">WorkflowGuard</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">首页</Link>
            <Link href="/pricing" className="text-muted-foreground hover:text-foreground">定价</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 px-3 py-1">用户反馈</Badge>
          <h1 className="text-3xl font-bold mb-2">帮助我们做得更好</h1>
          <p className="text-muted-foreground">
            你的每一条反馈都会帮助我们改进 WorkflowGuard。我们认真阅读每一条意见。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>告诉我们你是谁，怎么找到我们的</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input
                    id="name"
                    placeholder="你的称呼"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱 *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>反馈类型</CardTitle>
              <CardDescription>选择最接近你反馈内容的类别</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      category === cat.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{cat.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{cat.desc}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>反馈内容 *</CardTitle>
              <CardDescription>详细描述你的问题或建议，越具体越好</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="例如：在客服工单模板中，AI生成的回复草稿经常遗漏关键信息，希望改进..."
                className="min-h-[150px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          <Button type="submit" size="lg" className="w-full text-lg" disabled={submitting}>
            {submitting ? '提交中...' : '提交反馈'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            提交即表示你同意我们联系你了解更多信息。我们承诺保护你的隐私。
          </p>
        </form>
      </main>
    </div>
  );
}
