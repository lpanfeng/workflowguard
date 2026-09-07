"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Copy, 
  Check, 
  Gift, 
  TrendingUp, 
  Share2,
  ArrowRight
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ReferralStats {
  totalWaitlist: number;
  activeWithReferral: number;
  totalReferrals: number;
  topReferrers: Array<{ email: string; name: string | null; referredCount: number }>;
}

export function ReferralCard({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // Load stats
    fetch("/api/referral/stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setStatsLoading(false));

    // Load user's referral code if email provided
    if (userEmail) {
      fetch(`/api/referral?email=${encodeURIComponent(userEmail)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.found && data.referralCode) {
            setCode(data.referralCode);
          }
        })
        .catch(() => {});
    }
  }, [userEmail]);

  const handleGenerate = async () => {
    if (!userEmail) return;
    setLoading(true);
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, action: "generate" }),
      });
      const data = await res.json();
      if (data.success && data.referralCode) {
        setCode(data.referralCode);
      }
    } catch (error) {
      console.error("Failed to generate referral code:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!code) return;
    const shareUrl = `${window.location.origin}/waitlist?ref=${code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = code ? `${window.location.origin}/waitlist?ref=${code}` : "";

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Gift className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">邀请好友，共赢未来</CardTitle>
            <p className="text-xs text-muted-foreground">每成功邀请1人，双方各获得1个月免费使用</p>
          </div>
          <Badge variant="secondary" className="ml-auto">Beta</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-primary">{stats.totalWaitlist}</p>
              <p className="text-xs text-muted-foreground">等待名单</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-green-500">{stats.totalReferrals}</p>
              <p className="text-xs text-muted-foreground">成功邀请</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold text-blue-500">{stats.activeWithReferral}</p>
              <p className="text-xs text-muted-foreground">活跃邀请码</p>
            </div>
          </div>
        )}

        {/* Referral Code Section */}
        {code ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-background border border-primary/30">
                <span className="font-mono text-lg font-bold text-primary">{code}</span>
                <Badge variant="outline" className="text-xs">您的邀请码</Badge>
              </div>
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className={copied ? "border-green-500 text-green-500" : ""}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            {shareUrl && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                <Share2 className="h-3 w-3" />
                <span className="truncate">{shareUrl}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`加入WorkflowGuard等待名单，使用我的邀请码${code}获得额外福利！${shareUrl}`)}`, '_blank')}
              >
                <span className="mr-1">💬</span> WhatsApp
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`我在WorkflowGuard等待名单中！使用我的邀请码${code}获得额外福利！${shareUrl}`)}`, '_blank')}
              >
                <span className="mr-1">🐦</span> Twitter
              </Button>
            </div>
          </div>
        ) : userEmail ? (
          <Button 
            className="w-full" 
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "生成中..." : <><Gift className="h-4 w-4 mr-2" />生成我的邀请码</>}
          </Button>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>订阅后生成您的专属邀请码</p>
            <Button 
              variant="link" 
              className="p-0 text-sm"
              onClick={() => router.push("/waitlist")}
            >
              立即订阅 <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {/* How it works */}
        <div className="pt-3 border-t">
          <p className="text-sm font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="h-4 w-4 text-primary" />
            如何运作
          </p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>生成您的专属邀请码</li>
            <li>分享给好友，好友通过链接注册</li>
            <li>好友注册成功后，双方各获得1个月免费使用</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
