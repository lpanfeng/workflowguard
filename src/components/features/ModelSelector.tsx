// WorkflowGuard — AI 模型选择器组件
// 用于工作流创建/编辑时选择AI模型

"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  AI_MODELS,
  type AIModel,
  getOrderedModels,
  SCENARIO_RECOMMENDATIONS,
} from "@/lib/models"
import { Check, Zap, Brain, Sparkles, Info, ChevronDown, ChevronUp } from "lucide-react"

interface ModelSelectorProps {
  value?: string
  onChange: (modelId: string) => void
  scenario?: string // 工作流场景，用于推荐高亮
  disabled?: boolean
}

/** 星级评分组件 */
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`text-xs ${i < value ? "text-amber-400" : "text-muted-foreground"}`}
        >
          ★
        </span>
      ))}
    </div>
  )
}

/** 模型卡片组件 */
function ModelCard({
  model,
  isSelected,
  isRecommended,
  onSelect,
}: {
  model: AIModel
  isSelected: boolean
  isRecommended: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      disabled={model.provider === "mock" && !isSelected}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
        isSelected
          ? "border-primary bg-primary/5"
          : isRecommended
          ? "border-accent/50 bg-accent/5 hover:border-accent"
          : "border-border bg-card hover:border-muted-foreground/50"
      } ${model.provider === "mock" && !isSelected ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{model.displayName}</span>
              {isRecommended && (
                <Badge variant="secondary" className="text-xs bg-accent/20 text-accent">
                  <Sparkles className="w-3 h-3 mr-0.5" />
                  推荐
                </Badge>
              )}
              {isSelected && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                  <Check className="w-3 h-3 mr-0.5" />
                  已选
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {model.description}
            </p>
          </div>
        </div>
      </div>

      {/* 价格信息 */}
      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
        {model.provider !== "mock" ? (
          <>
            <span>
              输入 ¥{model.inputPricePer1M}/M
            </span>
            <span>
              输出 ¥{model.outputPricePer1M}/M
            </span>
          </>
        ) : (
          <span className="text-green-500 font-medium">免费</span>
        )}
      </div>

      {/* 能力指标 */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <Zap className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-muted-foreground">速度</span>
          <StarRating value={model.speedRating} />
        </div>
        <div className="flex items-center gap-1">
          <Brain className="w-3 h-3 text-purple-400" />
          <span className="text-xs text-muted-foreground">质量</span>
          <StarRating value={model.qualityRating} />
        </div>
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-1 mt-2">
        {model.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 h-5">
            {tag}
          </Badge>
        ))}
        {model.supportsTools && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-blue-500/10 text-blue-400">
            工具调用
          </Badge>
        )}
        {model.supportsVision && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-green-500/10 text-green-400">
            多模态
          </Badge>
        )}
      </div>
    </button>
  )
}

export function ModelSelector({
  value,
  onChange,
  scenario,
  disabled = false,
}: ModelSelectorProps) {
  const [expanded, setExpanded] = useState(false)
  const orderedModels = getOrderedModels()

  // 获取场景推荐模型
  const recommendedIds = scenario
    ? (SCENARIO_RECOMMENDATIONS[scenario] ?? [])
    : []

  const selectedModel = value ? AI_MODELS.find((m) => m.id === value) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">AI 模型</Label>
        {selectedModel && (
          <span className="text-xs text-muted-foreground">
            当前: {selectedModel.displayName}
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs text-muted-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "收起" : "展开"}
        {expanded ? (
          <ChevronUp className="w-3 h-3 ml-1" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-1" />
        )}
      </Button>

      {expanded && (
        <div className="grid grid-cols-1 gap-2 mt-2">
          {orderedModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={value === model.id}
              isRecommended={recommendedIds.includes(model.id)}
              onSelect={() => !disabled && onChange(model.id)}
            />
          ))}
        </div>
      )}

      {!expanded && (
        <div className="mt-2 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="w-4 h-4" />
            <span>点击「展开」选择AI模型</span>
          </div>
          {scenario && (
            <p className="text-xs text-muted-foreground mt-1">
              推荐: {recommendedIds.map((id) => AI_MODELS.find((m) => m.id === id)?.displayName).filter(Boolean).join("、")}
            </p>
          )}
        </div>
      )}

      {/* 价格提示 */}
      <p className="text-xs text-muted-foreground">
        💡 不同模型价格和性能不同，Mock模式免费用于开发测试
      </p>
    </div>
  )
}

/** 模型选择器（内联版本，用于配置面板） */
export function ModelSelectorInline({
  value,
  onChange,
  scenario,
  disabled = false,
}: ModelSelectorProps) {
  const [expanded, setExpanded] = useState(false)
  const orderedModels = getOrderedModels()
  const recommendedIds = scenario
    ? SCENARIO_RECOMMENDATIONS[scenario] ?? []
    : []
  const selectedModel = value ? AI_MODELS.find((m) => m.id === value) : null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">AI 模型</Label>
        {selectedModel && (
          <Badge variant="outline" className="text-xs">
            {selectedModel.displayName}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {orderedModels.slice(0, expanded ? undefined : 4).map((model) => (
          <button
            key={model.id}
            onClick={() => !disabled && onChange(model.id)}
            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              value === model.id
                ? "border-primary bg-primary/10 text-primary"
                : recommendedIds.includes(model.id)
                ? "border-accent/50 bg-accent/5 text-accent hover:border-accent"
                : "border-border bg-card text-muted-foreground hover:border-muted-foreground/50"
            } ${model.provider === "mock" && value !== model.id ? "opacity-50" : ""}`}
            disabled={model.provider === "mock" && value !== model.id}
          >
            <div className="flex items-center gap-1">
              {value === model.id && <Check className="w-3 h-3" />}
              {recommendedIds.includes(model.id) && value !== model.id && (
                <Sparkles className="w-3 h-3" />
              )}
              <span className="truncate max-w-[120px]">{model.displayName}</span>
            </div>
            {model.provider !== "mock" && (
              <div className="text-[10px] text-muted-foreground mt-0.5">
                ¥{model.inputPricePer1M}/M input
              </div>
            )}
          </button>
        ))}
        {orderedModels.length > 4 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "收起" : `全部(${orderedModels.length})`}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {recommendedIds.length > 0 && `场景推荐: ${recommendedIds.map((id) => AI_MODELS.find((m) => m.id === id)?.displayName).filter(Boolean).join("、")}`}
      </p>
    </div>
  )
}
