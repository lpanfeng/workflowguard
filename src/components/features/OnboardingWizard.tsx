"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react"
import { WORKFLOW_TEMPLATES } from "@/lib/workflow-templates"

type OnboardingStep = "role" | "template" | "create"

interface OnboardingWizardProps {
  onClose?: () => void
}

const ROLES = [
  { id: "customer_service", label: "客服", icon: "🎧", desc: "处理客户咨询、工单" },
  { id: "content", label: "内容", icon: "📝", desc: "写文章、做内容、发社媒" },
  { id: "ops", label: "运营", icon: "📊", desc: "数据录入、流程审批" },
  { id: "finance", label: "财务", icon: "💰", desc: "发票处理、对账报销" },
  { id: "hr", label: "人事", icon: "👥", desc: "招聘、面试、考核" },
  { id: "other", label: "其他", icon: "💡", desc: "其他业务场景" },
]

export function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<OnboardingStep>("role")
  const [selectedRole, setSelectedRole] = useState<string>("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId)
    setStep("template")
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    setStep("create")
  }

  const handleCreate = () => {
    router.push(`/workflows/new?template=${selectedTemplate}&role=${selectedRole}`)
  }

  // Filter templates by role
  const getRecommendedTemplates = () => {
    if (selectedRole === "customer_service") {
      return WORKFLOW_TEMPLATES.filter((t) => t.id === "customer-service")
    }
    if (selectedRole === "content") {
      return WORKFLOW_TEMPLATES.filter((t) => t.id === "content-publish")
    }
    if (selectedRole === "ops" || selectedRole === "finance") {
      return WORKFLOW_TEMPLATES.filter((t) => t.id === "data-entry")
    }
    return WORKFLOW_TEMPLATES
  }

  const recommendedTemplates = getRecommendedTemplates()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">步骤 {step === "role" ? "1/3" : step === "template" ? "2/3" : "3/3"}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">✕</Button>
          </div>
          <CardTitle className="text-xl">
            {step === "role" ? "你是什么角色的？" : step === "template" ? "选一个工作流模板" : "创建你的第一个工作流"}
          </CardTitle>
          <CardDescription>
            {step === "role"
              ? "我们会根据你的角色推荐最合适的模板"
              : step === "template"
              ? recommendedTemplates.length > 1
                ? "选择适合你场景的工作流模板"
                : "我们为你推荐了这个模板，直接开始吧"
              : "给你的工作流取个名字，然后开始"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "role" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`p-4 rounded-lg border text-left transition-all hover:shadow-md hover:-translate-y-0.5 ${
                    selectedRole === role.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="text-2xl mb-2">{role.icon}</div>
                  <div className="font-medium text-sm">{role.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{role.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === "template" && (
            <div className="space-y-3 mt-4">
              {recommendedTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className="w-full p-4 rounded-lg border text-left transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-sm">{template.name}</div>
                        {template.id === recommendedTemplates[0].id && (
                          <Badge variant="secondary" className="text-xs">推荐</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === "create" && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">即将创建的流程</span>
                </div>
                <p className="text-sm">
                  <strong>{recommendedTemplates.find((t) => t.id === selectedTemplate)?.name || "我的工作流"}</strong>
                  <br />
                  <span className="text-muted-foreground">
                    {recommendedTemplates.find((t) => t.id === selectedTemplate)?.description}
                  </span>
                </p>
              </div>
              <Button onClick={handleCreate} className="w-full" size="lg">
                开始使用 →
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                免费版包含 2 个工作流，无需信用卡
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
