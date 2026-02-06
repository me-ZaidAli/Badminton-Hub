import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Lock, Users, AlertTriangle, Mail } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function PolicyPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8" data-testid="policy-page">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-policy-title">
            Platform Policies
          </h1>
        </div>
        <p className="text-muted-foreground">
          Your privacy and safety are important to us. Please review our policies below.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Privacy Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            Club Master is committed to protecting your personal information. We collect only the data necessary to provide our badminton club management services, including your name, email address, and club-related activity.
          </p>
          <h3 className="font-semibold text-foreground">Information We Collect</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information: name, email, and password (securely hashed)</li>
            <li>Club membership details: club affiliations, player profiles, and rankings</li>
            <li>Session and match data: attendance, scores, and performance statistics</li>
            <li>Coach seeker information: contact details and training preferences (when voluntarily provided)</li>
            <li>Contact messages: correspondence submitted through our contact form</li>
          </ul>
          <h3 className="font-semibold text-foreground">How We Use Your Data</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>To manage your club memberships and player profiles</li>
            <li>To calculate and display rankings and match statistics</li>
            <li>To facilitate session scheduling and match organisation</li>
            <li>To connect coach seekers with qualified coaches</li>
            <li>To send relevant notifications about your clubs and sessions</li>
          </ul>
          <h3 className="font-semibold text-foreground">Data Protection</h3>
          <p>
            Your data is stored securely using industry-standard encryption. We do not sell or share your personal information with third parties for marketing purposes. Public-facing pages display only non-sensitive information (no email addresses or passwords).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Terms of Use
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            By using Club Master, you agree to the following terms and conditions governing your use of the platform.
          </p>
          <h3 className="font-semibold text-foreground">Account Responsibilities</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You must provide accurate and truthful information when creating your profile</li>
            <li>You may not create multiple accounts or impersonate other users</li>
            <li>Club administrators are responsible for managing their club content appropriately</li>
          </ul>
          <h3 className="font-semibold text-foreground">Acceptable Use</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the platform only for legitimate badminton club management purposes</li>
            <li>Respect other users and maintain a positive community environment</li>
            <li>Do not submit false reviews or ratings</li>
            <li>Do not use the messaging system for spam or unsolicited communications</li>
          </ul>
          <h3 className="font-semibold text-foreground">Account Suspension</h3>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms. Suspended users will lose access to all platform features, including club memberships and coach profiles.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Coach Seeker Membership Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <h3 className="font-semibold text-foreground">Membership Details</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Coach Seeker membership costs GBP 10 per month</li>
            <li>Payment is arranged directly with an administrator after application approval</li>
            <li>Membership grants access to the full coach directory with contact details</li>
            <li>Members can search coaches by location, qualifications, and availability</li>
          </ul>
          <h3 className="font-semibold text-foreground">Cancellation</h3>
          <p>
            You may cancel your Coach Seeker membership at any time through your account settings. Cancellation takes effect immediately.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Review and Rating Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Reviews must be honest and based on genuine experience</li>
            <li>Each user may submit one review per coach or club</li>
            <li>Reviews may be edited or deleted by the reviewer at any time</li>
            <li>Administrators reserve the right to remove reviews that violate our policies</li>
            <li>Abusive, discriminatory, or fraudulent reviews are strictly prohibited</li>
          </ul>
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
          Last updated: February 2026
        </p>
      </div>
    </div>
  );
}
