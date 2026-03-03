import PublicLayout from "@/components/layout/PublicLayout";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Crown, Zap, Users, Trophy, BarChart3, Calendar,
  Shield, CreditCard, Star, ArrowRight, Sparkles
} from "lucide-react";
import { useUser } from "@/hooks/use-auth";

const FREE_FEATURES = [
  { text: "Unlimited sessions", included: true },
  { text: "Attendance tracking", included: true },
  { text: "Member directory", included: true },
  { text: "Basic club settings", included: true },
  { text: "Session sign-ups & waiting lists", included: true },
  { text: "Court & match management", included: true },
  { text: "Player profiles", included: true },
  { text: "Notifications & announcements", included: true },
  { text: "Contact & messaging", included: true },
  { text: "IT helpdesk & ticketing", included: true },
  { text: "Multi-sport support", included: true },
  { text: "PWA mobile app", included: true },
];

const PREMIUM_FEATURES = [
  { text: "Everything in Free, plus:", included: true, highlight: true },
  { text: "Dynamic player rankings", included: true },
  { text: "League management", included: true },
  { text: "Financial dashboard & tracking", included: true },
  { text: "Automated match generation", included: true },
  { text: "Performance analytics", included: true },
  { text: "AI-powered reports", included: true },
  { text: "Junior management & skill tracking", included: true },
  { text: "Coach analytics dashboard", included: true },
  { text: "Referral programs", included: true },
  { text: "Rewards & milestone system", included: true },
  { text: "Inventory & expense tracking", included: true },
  { text: "CSV import / export", included: true },
  { text: "Acquisition analytics", included: true },
  { text: "Attendance analytics", included: true },
  { text: "35 premium themes", included: true },
  { text: "Priority support", included: true },
];

const COMPARISON_ROWS = [
  { category: "Club Management", features: [
    { name: "Session creation & scheduling", free: true, premium: true },
    { name: "Attendance tracking", free: true, premium: true },
    { name: "Member directory", free: true, premium: true },
    { name: "Court & match management", free: true, premium: true },
    { name: "Multi-sport support", free: true, premium: true },
    { name: "Club settings & branding", free: true, premium: true },
    { name: "Membership management", free: true, premium: true },
  ]},
  { category: "Rankings & Competition", features: [
    { name: "Dynamic player rankings", free: false, premium: true },
    { name: "Session leaderboards", free: false, premium: true },
    { name: "League management", free: false, premium: true },
    { name: "Automated match generation", free: false, premium: true },
    { name: "Player grading system", free: false, premium: true },
  ]},
  { category: "Analytics & Reporting", features: [
    { name: "Performance analytics", free: false, premium: true },
    { name: "AI-powered reports", free: false, premium: true },
    { name: "Acquisition analytics", free: false, premium: true },
    { name: "Attendance analytics", free: false, premium: true },
    { name: "Financial dashboard", free: false, premium: true },
    { name: "CSV export", free: false, premium: true },
  ]},
  { category: "Junior & Coach", features: [
    { name: "Junior player management", free: false, premium: true },
    { name: "Skill development tracking", free: false, premium: true },
    { name: "Exercise challenges", free: false, premium: true },
    { name: "Coach analytics dashboard", free: false, premium: true },
    { name: "Parent progress reports", free: false, premium: true },
  ]},
  { category: "Engagement & Growth", features: [
    { name: "Referral programs", free: false, premium: true },
    { name: "Rewards & milestones", free: false, premium: true },
    { name: "35 premium themes", free: false, premium: true },
    { name: "Inventory tracking", free: false, premium: true },
    { name: "Expense management", free: false, premium: true },
  ]},
  { category: "Communication", features: [
    { name: "Notifications & announcements", free: true, premium: true },
    { name: "Internal messaging", free: true, premium: true },
    { name: "IT helpdesk & ticketing", free: true, premium: true },
    { name: "Payment reminders", free: true, premium: true },
    { name: "Priority support", free: false, premium: true },
  ]},
];

export default function Pricing() {
  const { data: user } = useUser();

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16 space-y-16">
        <div className="text-center space-y-4">
          <Badge variant="secondary" className="text-sm px-4 py-1" data-testid="badge-pricing-header">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Simple, transparent pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" data-testid="text-pricing-title">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
            Start free and upgrade when you're ready. No hidden fees, no contracts. Cancel anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="relative border-2 border-border" data-testid="card-plan-free">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Zap className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-xl">Basic</CardTitle>
                  <CardDescription>For getting started</CardDescription>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold" data-testid="text-price-free">£0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Free forever. No credit card needed.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={user ? "/dashboard" : "/register"}>
                <Button variant="outline" className="w-full" size="lg" data-testid="button-get-started-free">
                  {user ? "Go to Dashboard" : "Get Started Free"}
                </Button>
              </Link>
              <ul className="space-y-3 pt-2">
                {FREE_FEATURES.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="relative border-2 border-primary shadow-lg shadow-primary/10" data-testid="card-plan-premium">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold shadow-md">
                <Star className="w-3.5 h-3.5 mr-1.5" />
                Most Popular
              </Badge>
            </div>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">Premium</CardTitle>
                  <CardDescription>For serious clubs</CardDescription>
                </div>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-4xl font-bold" data-testid="text-price-premium">£10</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">Per club. Paid via bank transfer.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href={user ? "/admin/billing" : "/register"}>
                <Button className="w-full" size="lg" data-testid="button-upgrade-premium">
                  {user ? "Upgrade Now" : "Get Started"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <ul className="space-y-3 pt-2">
                {PREMIUM_FEATURES.map((feature) => (
                  <li key={feature.text} className={`flex items-start gap-3 text-sm ${feature.highlight ? "font-semibold text-primary" : ""}`}>
                    <Check className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold" data-testid="text-comparison-title">Detailed Comparison</h2>
            <p className="text-muted-foreground">See exactly what's included in each plan.</p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[1fr_100px_100px] gap-x-4 px-4 py-3 rounded-t-lg bg-muted/50 border border-b-0 border-border font-semibold text-sm">
                <span>Feature</span>
                <span className="text-center">Basic</span>
                <span className="text-center text-primary">Premium</span>
              </div>

              {COMPARISON_ROWS.map((section) => (
                <div key={section.category}>
                  <div className="grid grid-cols-[1fr_100px_100px] gap-x-4 px-4 py-2.5 bg-muted/30 border-x border-border">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      {section.category === "Club Management" && <Calendar className="w-4 h-4" />}
                      {section.category === "Rankings & Competition" && <Trophy className="w-4 h-4" />}
                      {section.category === "Analytics & Reporting" && <BarChart3 className="w-4 h-4" />}
                      {section.category === "Junior & Coach" && <Users className="w-4 h-4" />}
                      {section.category === "Engagement & Growth" && <Sparkles className="w-4 h-4" />}
                      {section.category === "Communication" && <Shield className="w-4 h-4" />}
                      {section.category}
                    </span>
                    <span></span>
                    <span></span>
                  </div>
                  {section.features.map((feature, idx) => (
                    <div
                      key={feature.name}
                      className={`grid grid-cols-[1fr_100px_100px] gap-x-4 px-4 py-2.5 border-x border-border text-sm ${
                        idx === section.features.length - 1 ? "border-b" : ""
                      }`}
                      data-testid={`row-feature-${feature.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span className="text-muted-foreground">{feature.name}</span>
                      <span className="flex justify-center">
                        {feature.free ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/30" />
                        )}
                      </span>
                      <span className="flex justify-center">
                        <Check className="w-4 h-4 text-primary" />
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="text-center space-y-6 py-8">
          <Card className="max-w-2xl mx-auto border-2 border-muted" data-testid="card-payment-info">
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-semibold text-lg">How Payment Works</h3>
              </div>
              <div className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                <p>1. Sign up and create your club for free.</p>
                <p>2. When ready, request a Premium upgrade from your club billing page.</p>
                <p>3. Transfer £10/month via bank transfer to the platform account.</p>
                <p>4. Our team will activate your Premium plan within 24 hours.</p>
                <p>5. Your data is always preserved — downgrading just locks premium features.</p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-2xl font-bold" data-testid="text-cta-title">Ready to elevate your club?</h3>
            <p className="text-muted-foreground">Take your club to the next level with Club Master.</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href={user ? "/dashboard" : "/register"}>
                <Button size="lg" data-testid="button-cta-get-started">
                  {user ? "Go to Dashboard" : "Get Started Free"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
