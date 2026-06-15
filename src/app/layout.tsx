import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Provider from "@/components/Provider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "WorkflowGuard — AI Agent 人机协作工作流平台",
    template: "%s | WorkflowGuard",
  },
  description:
    "想用 AI Agent 又不敢完全交给 Agent？WorkflowGuard 给你可控的人机协同。AI 自动执行 + 人工审批 + 全程审计日志，面向中小企业的安全工作流平台。",
  keywords: [
    "AI Agent",
    "人机协作",
    "工作流",
    "审批系统",
    "AI 审批",
    "WorkflowGuard",
    "自动化工作流",
    "AI 安全",
  ],
  authors: [{ name: "WorkflowGuard" }],
  openGraph: {
    title: "WorkflowGuard — AI Agent 人机协作工作流平台",
    description:
      "AI 自动执行 + 人工审批 + 全程审计，面向中小企业的可控 AI 工作流平台。",
    type: "website",
    locale: "zh_CN",
    siteName: "WorkflowGuard",
  },
  twitter: {
    card: "summary_large_image",
    title: "WorkflowGuard — AI Agent 人机协作工作流平台",
    description:
      "AI 自动执行 + 人工审批 + 全程审计，面向中小企业的可控 AI 工作流平台。",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Provider>
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </Provider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
