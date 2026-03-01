import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function JuniorConsentPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4" data-testid="junior-consent-page">
      <div className="flex items-center gap-2 mb-2">
        <Link href="/policy">
          <Button variant="ghost" size="sm" data-testid="button-back-to-policies">
            <ArrowLeft className="h-4 w-4 mr-1" />
            All Policies
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-junior-consent-title">
            Junior &amp; Parental Consent Policy
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Club Master App &mdash; Version 1.0 &mdash; Last updated February 2026</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Junior Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Club Master supports junior players (under 18 years of age). Junior accounts are managed by a parent or guardian
            and require explicit parental consent before the account can be created and used.
          </p>
          <p>
            We take the safeguarding of children and young people seriously. This policy explains how junior accounts work
            and what responsibilities parents, guardians, and the club have.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parental Consent Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Before a junior account can be activated, the following is required:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>A parent or guardian must complete the registration on behalf of the junior player</li>
            <li>The parent or guardian must confirm they have parental responsibility for the junior</li>
            <li>The parent or guardian&apos;s name and email address are recorded with the account</li>
            <li>A digital consent timestamp is stored for legal compliance, recording the exact date and time consent was given</li>
            <li>The parent or guardian must agree to the Privacy Policy and Terms &amp; Conditions on the junior&apos;s behalf</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Data We Collect for Juniors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>For junior accounts, we collect:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The junior player&apos;s name, date of birth, and gender</li>
            <li>Parent or guardian&apos;s full name and email address</li>
            <li>Session booking and attendance records</li>
            <li>Match results and ranking information</li>
            <li>Emergency contact details provided by the parent or guardian</li>
          </ul>
          <p>
            This data is used only for club management, session organisation, and safeguarding purposes.
            It is never sold or shared for marketing.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Restrictions on Junior Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>To protect young players, the following restrictions apply to junior accounts:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Junior players cannot send or receive direct messages through the app&apos;s contact system</li>
            <li>Communication with junior players is managed through the parent or guardian&apos;s contact details</li>
            <li>Junior players&apos; personal details are not shown on public pages beyond their name and skill category</li>
            <li>Only authorised coaches and club administrators can view junior player details</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Safeguarding Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The club is committed to safeguarding all children and young people who use this app or attend our sessions.</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All coaches and administrators working with juniors are vetted according to UK safeguarding standards</li>
            <li>The club follows national governing body safeguarding guidelines</li>
            <li>Any safeguarding concerns should be reported immediately to a club administrator</li>
            <li>The club may suspend or terminate any account if safeguarding concerns arise</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdrawing Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            A parent or guardian may withdraw consent for their child&apos;s account at any time by contacting the club.
          </p>
          <p>
            Upon withdrawal of consent, the junior account will be deactivated and personal data will be deleted within a reasonable period,
            unless retention is required for legal or safeguarding purposes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Digital Consent Record</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            When a junior account is created, we store a digital consent record that includes:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The date and time consent was given</li>
            <li>The version of the policies that were accepted</li>
            <li>The user ID associated with the consent</li>
            <li>The parent or guardian&apos;s name and email address</li>
          </ul>
          <p>
            This record is maintained for legal compliance and can be provided to the parent or guardian upon request.
          </p>
        </CardContent>
      </Card>

      <div className="text-center space-y-3 pb-8">
        <p className="text-xs text-muted-foreground">
          If you have questions about junior accounts or parental consent, please contact the club.
        </p>
        <Link href="/contact">
          <Button variant="outline" size="sm" data-testid="button-contact-from-junior">
            Contact Us
          </Button>
        </Link>
      </div>
    </div>
  );
}
