"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, RefreshCw, Zap } from "lucide-react";

export default function DeveloperSettings({ onKeyUpdate }) {
  const [apiKey, setApiKey] = useState(null);
  const [plan, setPlan] = useState("free");
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetch("/api/auth/api-keys")
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) setApiKey(data.apiKey);
        if (data.plan) setPlan(data.plan);
        if (data.apiKey && onKeyUpdate) onKeyUpdate(data.apiKey);
      })
      .finally(() => setLoading(false));
  }, [onKeyUpdate]);

  const generateKey = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/api-keys", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setApiKey(data.apiKey);
        setPlan(data.plan);
        if (onKeyUpdate) onKeyUpdate(data.apiKey);
        toast.success(apiKey ? "API Key Regenerated!" : "API Key Generated!");
      } else {
        toast.error(data.error || "Failed to generate key");
      }
    } catch (e) {
      toast.error("Error generating key");
    }
    setLoading(false);
  };

  const upgradePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/api-keys", { method: "PUT" });
      const data = await res.json();
      if (res.ok) {
        setPlan(data.plan);
        toast.success(data.message);
      } else {
        toast.error(data.error || "Failed to upgrade");
      }
    } catch (e) {
      toast.error("Error upgrading plan");
    }
    setLoading(false);
  };

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    toast.success("API Key copied to clipboard");
  };

  if (loading && !apiKey) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 flex justify-center items-center h-[200px]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
      {/* Decorative background glow based on plan */}
      <div className={`absolute -top-24 -right-24 h-48 w-48 rounded-full blur-[80px] opacity-20 pointer-events-none transition-colors duration-1000 ${plan === 'pro' ? 'bg-amber-500' : 'bg-primary'}`} />
      
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Developer Settings</CardTitle>
            <CardDescription>Manage your API Key and billing tier.</CardDescription>
          </div>
          <Badge variant={plan === 'pro' ? "default" : "secondary"} className={plan === 'pro' ? 'bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border-amber-500/30' : ''}>
            {plan === 'pro' ? 'PRO PLAN (10,000 reqs/min)' : 'FREE PLAN (50 reqs/min)'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {!apiKey ? (
          <div className="rounded-lg border border-border/50 bg-background/50 p-6 text-center space-y-3">
            <h3 className="font-medium text-sm">No API Key Generated</h3>
            <p className="text-xs text-muted-foreground">You need an API Key to authenticate requests to the API Gateway.</p>
            <Button onClick={generateKey} disabled={loading} size="sm">
              Generate API Key
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Your Secret API Key</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 font-mono text-sm bg-background/80 border border-border/50 rounded-md p-2 px-3 overflow-hidden text-ellipsis whitespace-nowrap">
                {showKey ? apiKey : "api_live_" + "•".repeat(32)}
              </div>
              <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-border/50 bg-muted/20 py-3">
        <Button variant="ghost" size="sm" onClick={generateKey} disabled={loading || !apiKey} className="text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className="mr-2 h-3 w-3" />
          Roll Key
        </Button>

        {plan === 'free' && (
          <Button size="sm" onClick={upgradePlan} disabled={loading || !apiKey} className="bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 shadow-none">
            <Zap className="mr-2 h-3.5 w-3.5 fill-amber-500" />
            Upgrade to Pro
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
