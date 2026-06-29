import Link from "next/link";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Background gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full bg-[oklch(0.7_0.18_250/0.08)] blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-[oklch(0.65_0.2_30/0.06)] blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[oklch(0.75_0.15_160/0.05)] blur-[100px]" />
      </div>

      {/* Grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.985 0 0) 1px, transparent 1px), linear-gradient(90deg, oklch(0.985 0 0) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/50 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-[oklch(0.75_0.15_160)] animate-pulse" />
          Real-time API Analytics
        </div>

        {/* Heading */}
        <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
            Monitor Your
          </span>
          <br />
          <span className="bg-gradient-to-r from-[oklch(0.7_0.18_250)] via-[oklch(0.75_0.15_160)] to-[oklch(0.65_0.2_30)] bg-clip-text text-transparent">
            API Traffic
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Track endpoint usage, visualize traffic patterns on a global heatmap,
          and enforce dynamic IP-based rate limiting — all in one dashboard.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 hover:shadow-xl hover:shadow-primary/30"
          >
            Get Started
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-border/50 bg-card/50 px-8 text-sm font-medium text-foreground backdrop-blur-sm transition-all hover:bg-accent hover:border-border"
          >
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: "📊", text: "Recharts Analytics" },
            { icon: "🌍", text: "Geo Heatmap" },
            { icon: "🛡️", text: "Rate Limiting" },
            { icon: "⚡", text: "Redis Powered" },
          ].map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/30 px-3 py-1.5 text-sm text-muted-foreground backdrop-blur-sm"
            >
              <span>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
