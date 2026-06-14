"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Quote } from "lucide-react"

const TESTIMONIALS = [
  {
    name: "李明",
    role: "客服主管",
    company: "某电商公司",
    avatar: "🎧",
    text: "用了 WorkflowGuard 之后，客服团队的回复效率提升了 70%，而且再也不用担心 AI 胡说八道了。每次 AI 生成的回复都需要我们审核，质量反而比以前纯人工写的还高。",
    tags: ["客服", "效率提升"],
  },
  {
    name: "王芳",
    role: "内容编辑",
    company: "某新媒体工作室",
    avatar: "📝",
    text: "以前写公众号选题+初稿要花 3 小时，现在 AI 10 分钟出初稿，我们花 20 分钟修改审核就行。WorkflowGuard 的审批流程让我们团队的内容质量反而提高了。",
    tags: ["内容", "效率提升"],
  },
  {
    name: "张伟",
    role: "财务总监",
    company: "某贸易公司",
    avatar: "📊",
    text: "最打动我们的是审计日志。以前财务数据录入全靠人，出了差错查都查不到。现在每一笔都有记录，谁在什么时候录的、改了什么都清清楚楚。",
    tags: ["财务", "合规"],
  },
  {
    name: "陈静",
    role: "运营经理",
    company: "某 SaaS 创业公司",
    avatar: "🚀",
    text: "我们团队只有 5 个人，但每天要处理 200+ 客户咨询。WorkflowGuard 让我们的小团队有了大公司的效率，AI 处理 80% 的简单问题，剩下的复杂问题我们人工处理。",
    tags: ["运营", "小团队"],
  },
  {
    name: "刘洋",
    role: "CTO",
    company: "某金融科技公司",
    avatar: "💻",
    text: "我们试过直接用 Claude API 做客服，结果 AI 给客户承诺了一些我们根本没有的服务。WorkflowGuard 的审批机制正好解决了这个问题——AI 出方案，人来做决策。",
    tags: ["金融", "风控"],
  },
  {
    name: "赵雪",
    role: "人力资源总监",
    company: "某咨询公司",
    avatar: "👥",
    text: "我们用 WorkflowGuard 做简历初筛。AI 根据 JD 筛选候选人，HR 审核后再发面试邀请。效率提升了 3 倍，而且不会漏掉任何一个合适的候选人。",
    tags: ["HR", "招聘"],
  },
  {
    name: "孙磊",
    role: "产品经理",
    company: "某教育科技公司",
    avatar: "📱",
    text: "最欣赏的一点是 WorkflowGuard 的灵活度。不像其他产品只能套用固定模板，我们可以根据自己的业务流程自定义步骤，这对我们这种业务复杂的团队特别重要。",
    tags: ["产品", "灵活"],
  },
  {
    name: "周婷",
    role: "市场营销总监",
    company: "某消费品公司",
    avatar: "📣",
    text: "以前市场部写营销文案，写完还要经过法务审核。现在 WorkflowGuard 把法务审核加到流程里，AI 写完文案→市场部初审→法务终审→发布，一次搞定。",
    tags: ["市场", "合规"],
  },
  {
    name: "吴昊",
    role: "技术负责人",
    company: "某物流科技公司",
    avatar: "🚚",
    text: "我们的订单处理流程以前全靠人工，高峰期每天积压几百单。接入 WorkflowGuard 后，AI 自动处理标准化订单，人工只处理异常订单，处理速度提升了 5 倍。",
    tags: ["物流", "自动化"],
  },
  {
    name: "黄丽",
    role: "行政主管",
    company: "某连锁餐饮集团",
    avatar: "🏪",
    text: "我们用 WorkflowGuard 做采购审批。AI 根据历史数据推荐供应商和价格区间，采购员审核后执行。既避免了 AI 自作主张，又大幅减少了比价时间。",
    tags: ["行政", "采购"],
  },
]

export function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [isAutoPlaying])

  const goTo = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
  }

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length)
    setIsAutoPlaying(false)
  }

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)
    setIsAutoPlaying(false)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative">
        <Card className="border-2 border-primary/10 shadow-lg">
          <CardContent className="p-8">
            <Quote className="h-8 w-8 text-primary/20 mb-4" />
            <p className="text-lg text-foreground mb-6 leading-relaxed italic">
              "{TESTIMONIALS[currentIndex].text}"
            </p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
                {TESTIMONIALS[currentIndex].avatar}
              </div>
              <div>
                <div className="font-semibold">{TESTIMONIALS[currentIndex].name}</div>
                <div className="text-sm text-muted-foreground">
                  {TESTIMONIALS[currentIndex].role} · {TESTIMONIALS[currentIndex].company}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {TESTIMONIALS[currentIndex].tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={goPrev}
            className="p-2 rounded-full border hover:bg-muted transition-colors"
            aria-label="上一条"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? "bg-primary w-6" : "bg-muted-foreground/30"
                }`}
                aria-label={`跳转到 testimonial ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={goNext}
            className="p-2 rounded-full border hover:bg-muted transition-colors"
            aria-label="下一条"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
