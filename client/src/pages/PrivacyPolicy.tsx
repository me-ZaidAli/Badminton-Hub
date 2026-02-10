import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4" data-testid="privacy-policy-page">
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
          <Lock className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-privacy-title">
            Privacy Policy
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Badminton Master App &mdash; Version 1.0 &mdash; Last updated February 2026</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who We Are</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Badminton Master is operated by Dragon Badminton Club &ndash; BPG Ltd, a UK registered company.
            This app is used to book badminton sessions, manage attendance, process payments, and communicate club information.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What Data We Collect</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>We collect and process the following personal data when you use Badminton Master:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Name and contact details (email address, phone number)</li>
            <li>Date of birth (for age grouping and safeguarding purposes)</li>
            <li>Emergency contact details</li>
            <li>Gender (for session and match organisation)</li>
            <li>Session bookings, attendance records, and match results</li>
            <li>Payment and transaction records</li>
            <li>Player skill category and ranking data</li>
            <li>App usage information</li>
            <li>For junior accounts: parent or guardian name and email address</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How We Use Your Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>We use your personal data to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Book and manage badminton sessions</li>
            <li>Communicate updates, session changes, and club announcements</li>
            <li>Manage payments, fees, and attendance tracking</li>
            <li>Calculate player rankings and display match statistics</li>
            <li>Meet safeguarding and child protection requirements</li>
            <li>Improve how the app works and provide support</li>
            <li>Connect coach seekers with qualified coaches</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who Can See Your Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Your personal data may be accessed by:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Club administrators and authorised coaches who manage sessions you attend</li>
            <li>Trusted service providers such as payment processors</li>
            <li>Other players can see your name, skill category, and ranking on public leaderboards (but not your email, phone, or date of birth)</li>
          </ul>
          <p className="font-medium text-foreground">
            We do not sell your personal data to any third party. We do not share your data for marketing purposes.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Public Display of Player Names (GDPR Compliance)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Public-facing areas of the platform &mdash; including dashboards, session listings, leaderboards, match results,
            and event summaries &mdash; may display player names. By default, names are blurred on public views to protect
            your privacy. Players may opt in to display their name publicly by enabling the{" "}
            <span className="text-foreground font-medium">Show my name publicly</span> setting during registration or
            at any time within their account settings.
          </p>
          <p>
            This processing is carried out in accordance with UK GDPR and the Data Protection Act 2018, under the lawful
            basis of <span className="text-foreground font-medium">explicit consent</span> (opt-in via the public name
            visibility setting) and{" "}
            <span className="text-foreground font-medium">legitimate interest</span> for operating a transparent, social,
            and competitive sports platform.
          </p>

          <p className="text-foreground font-medium mt-4">User Control &amp; Privacy Options</p>
          <p>
            Players retain full control over how their name is displayed and may, at any time:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use a nickname or preferred display name</li>
            <li>Enable name blurring or anonymisation on public dashboards</li>
            <li>Update or change their display preferences within their account settings</li>
          </ul>
          <p>
            These choices do not affect internal administrative records, which may still retain real names for
            safeguarding, operational, and legal purposes.
          </p>

          <p className="text-foreground font-medium mt-4">Right to Withdraw Consent</p>
          <p>
            Players may withdraw consent for public name display at any time by adjusting their privacy settings.
            Changes will apply going forward and will not affect historical records required for compliance,
            safeguarding, or dispute resolution.
          </p>

          <p className="text-foreground font-medium mt-4">Data Visibility Limitation</p>
          <p>
            Only the selected display name (or anonymised version) will be visible publicly. No additional personal
            data (such as contact details) will be displayed publicly under any circumstances.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Long We Keep Your Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            We keep your data only for as long as it is needed for club management, legal, or safeguarding purposes.
            If you close your account, we will delete your personal data within a reasonable period, unless we are required by law to retain it.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Rights Under UK GDPR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>Under UK data protection law, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="text-foreground font-medium">Access</span> &ndash; Request a copy of the personal data we hold about you</li>
            <li><span className="text-foreground font-medium">Correction</span> &ndash; Ask us to correct any data that is inaccurate or incomplete</li>
            <li><span className="text-foreground font-medium">Deletion</span> &ndash; Ask us to delete your data where legally possible</li>
            <li><span className="text-foreground font-medium">Withdraw consent</span> &ndash; Opt out of non-essential communications at any time</li>
            <li><span className="text-foreground font-medium">Data portability</span> &ndash; Request your data in a commonly used format</li>
            <li><span className="text-foreground font-medium">Complaint</span> &ndash; Lodge a complaint with the Information Commissioner&apos;s Office (ICO) if you believe your data rights have been breached</li>
          </ul>
          <p>
            To exercise any of these rights, please contact Dragon Badminton Club &ndash; BPG Ltd through the Contact page or by emailing the club directly.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cookies and App Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Badminton Master uses essential cookies and session data to keep you logged in and manage your preferences.
            We do not use advertising cookies or third-party tracking.
          </p>
        </CardContent>
      </Card>

      <div className="text-center space-y-3 pb-8">
        <p className="text-xs text-muted-foreground">
          If you have questions about this Privacy Policy, please contact Dragon Badminton Club &ndash; BPG Ltd.
        </p>
        <Link href="/contact">
          <Button variant="outline" size="sm" data-testid="button-contact-from-privacy">
            Contact Us
          </Button>
        </Link>
      </div>
    </div>
  );
}
