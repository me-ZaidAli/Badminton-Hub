import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Lock, Users, Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PolicyPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4" data-testid="policy-page">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-policy-title">
            Platform Policies
          </h1>
        </div>
        <p className="text-muted-foreground">
          Club Master is operated by Club Master &ndash; BPG Ltd.
          Please review our policies below.
        </p>
      </div>

      <Card className="hover-elevate">
        <Link href="/privacy-policy">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Privacy Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              Learn how we collect, use, and protect your personal data in compliance with UK GDPR.
              Covers data collection, your rights, data sharing, and how to request access or deletion.
            </p>
            <p className="text-primary mt-2 font-medium">Read full Privacy Policy &rarr;</p>
          </CardContent>
        </Link>
      </Card>

      <Card className="hover-elevate">
        <Link href="/terms-conditions">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Terms &amp; Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              Rules for using the app including session booking, payments, refund policy, code of conduct,
              health and liability disclaimer, and account suspension terms.
            </p>
            <p className="text-primary mt-2 font-medium">Read full Terms &amp; Conditions &rarr;</p>
          </CardContent>
        </Link>
      </Card>

      <Card className="hover-elevate">
        <Link href="/junior-consent-policy">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Junior &amp; Parental Consent Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground leading-relaxed">
            <p>
              Policy for junior players (under 18). Covers parental consent requirements, data handling for minors,
              communication restrictions, safeguarding responsibilities, and how consent is recorded.
            </p>
            <p className="text-primary mt-2 font-medium">Read full Junior &amp; Parental Consent Policy &rarr;</p>
          </CardContent>
        </Link>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>By using Club Master, you agree to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Provide accurate registration details</li>
            <li>Book and attend sessions responsibly</li>
            <li>Follow club rules and coach instructions</li>
            <li>Accept that sporting activities carry some risk</li>
          </ul>
          <p>
            Your personal data is used only to run the club, manage sessions, and communicate with you.
            We do not sell your data.
          </p>
        </CardContent>
      </Card>

      <div className="text-center space-y-4 pb-8">
        <p className="text-sm text-muted-foreground">
          If you have questions about our policies, please get in touch.
        </p>
        <Link href="/contact">
          <Button variant="outline" data-testid="button-contact-from-policy">
            <Mail className="h-4 w-4 mr-2" />
            Contact Us
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground">
          All policies Version 1.0 &mdash; Last updated February 2026
        </p>
      </div>
    </div>
  );
}
