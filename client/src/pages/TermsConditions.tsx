import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function TermsConditions() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-8 px-4" data-testid="terms-conditions-page">
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
          <FileText className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-terms-title">
            Terms &amp; Conditions
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Badminton Master App &mdash; Version 1.0 &mdash; Last updated February 2026</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Using the App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Accounts are personal and must not be shared with others</li>
            <li>You must provide accurate and truthful information when creating your account</li>
            <li>You must only attend sessions you are booked into</li>
            <li>Trial sessions may be required before regular attendance is permitted</li>
            <li>The club may limit the number of sessions available to individual players</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Session Booking &amp; Attendance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Sessions must be booked through the app before attending</li>
            <li>You are expected to attend sessions you have booked</li>
            <li>If you cannot attend a booked session, please cancel as early as possible so others can take your place</li>
            <li>Repeated no-shows may result in restrictions on future bookings</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments &amp; Refunds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Some sessions or memberships require payment in advance</li>
            <li>Payments must be completed to confirm a booking</li>
            <li>Missed sessions are not refundable</li>
            <li>Sessions cancelled by the club may be refunded or credited at the club&apos;s discretion</li>
            <li>All fees are displayed in British Pounds (GBP)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Behaviour &amp; Code of Conduct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>All users must:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Respect coaches, other players, staff, and facilities at all times</li>
            <li>Follow club rules, venue policies, and coach instructions</li>
            <li>Avoid abusive, threatening, unsafe, or disruptive behaviour</li>
            <li>Treat all participants fairly regardless of age, gender, ability, or background</li>
          </ul>
          <p>
            The club reserves the right to refuse access to sessions or remove users who break these rules, without refund.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Health &amp; Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Badminton involves physical activity and carries some risk of injury</li>
            <li>You participate in all sessions at your own risk</li>
            <li>You are responsible for ensuring you are physically fit to play</li>
            <li>You should inform a coach or organiser of any medical conditions that may affect your ability to play safely</li>
            <li>Dragon Badminton Club &ndash; BPG Ltd is not liable for injuries sustained during sessions unless caused by negligence on the part of the club</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">App Availability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>The app may be updated, modified, or temporarily unavailable at any time</li>
            <li>We do not guarantee uninterrupted or error-free access to the app</li>
            <li>We are not responsible for issues caused by your device, internet connection, or third-party services</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Suspension &amp; Termination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>
            Dragon Badminton Club &ndash; BPG Ltd may suspend or permanently remove your account for any of the following reasons:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Misuse of the app or violation of these terms</li>
            <li>Breaches of the code of conduct</li>
            <li>Safeguarding concerns involving minors or vulnerable individuals</li>
            <li>Failure to pay required fees</li>
            <li>Providing false or misleading information</li>
          </ul>
          <p>
            If your account is suspended or terminated, you will lose access to all platform features including club memberships, bookings, and coach profiles.
          </p>
        </CardContent>
      </Card>

      <div className="text-center space-y-3 pb-8">
        <p className="text-xs text-muted-foreground">
          If you have questions about these Terms &amp; Conditions, please contact Dragon Badminton Club &ndash; BPG Ltd.
        </p>
        <Link href="/contact">
          <Button variant="outline" size="sm" data-testid="button-contact-from-terms">
            Contact Us
          </Button>
        </Link>
      </div>
    </div>
  );
}
