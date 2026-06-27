# 发布前最终检查清单 — WorkflowGuard

> 2026-06-27 ｜ Day 40

---

## P0 — 必须完成

| # | 检查项 | 状态 | 备注 |
|---|--------|------|------|
| 1 | 隐私政策页面 (/privacy) | ✅ 已完成 | Day 37 |
| 2 | 服务条款页面 (/terms) | ✅ 已完成 | Day 37 |
| 3 | Footer Privacy/Terms 链接 | ✅ 已完成 | Day 38 |
| 4 | 404/500 错误页面 | ✅ 已完成 | Day 37 |
| 5 | SEO Meta Tags (layout.tsx) | ✅ 已完成 | Day 37 |
| 6 | Sitemap + Robots.txt | ✅ 已完成 | Day 39 |
| 7 | Canonical URL | ✅ 已完成 | Day 39 |
| 8 | i18n 中英文支持 | ✅ 已完成 | Day 32 |
| 9 | 构建通过 (npm run build) | ✅ 待验证 | Day 40 |

## P1 — 强烈建议

| # | 检查项 | 状态 | 备注 |
|---|--------|------|------|
| 1 | console.log 清理 | ✅ 已完成 | 生产代码中无console.log |
| 2 | API error handling | ✅ 已完成 | 所有route有try-catch |
| 3 | TODO 注释清理 | ⚠️ 1处保留 | metrics/performance/route.ts:83（标注为后续优化） |
| 4 | OG Image | ❌ 待创建 | 暂时用纯色背景占位 |
| 5 | 移动端适配 | ✅ 已完成 | Day 29 MobileNav |
| 6 | Performance API | ✅ 已完成 | Day 39 |

## P2 — 锦上添花

| # | 检查项 | 状态 | 备注 |
|---|--------|------|------|
| 1 | Lighthouse CI | ❌ 未执行 | 需安装lighthouse-ci |
| 2 | 多语言SEO (hreflang) | ❌ 未实现 | 后续迭代 |
| 3 | Structured Data (JSON-LD) | ❌ 未实现 | 后续迭代 |
| 4 | 页面加载速度优化 | ⚠️ 部分完成 | FCP/LCP API已添加 |

---

## 总结

- **P0完成度**: 8/9 (89%) — 缺少构建验证
- **P1完成度**: 4/6 (67%) — 缺少OG Image和多语言SEO
- **P2完成度**: 0/4 (0%) — 均为后续优化项

**建议**: P0中唯一的未完成项是构建验证。其余P1/P2项可以在发布后迭代。
