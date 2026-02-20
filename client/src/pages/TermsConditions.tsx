import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, Download } from "lucide-react";
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
            Dragon Badminton Club &ndash; Terms &amp; Conditions
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Version 1 &ndash; 20/02/2026</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Membership Registration &amp; Payment Obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>All members must register via Spond or the club website (<a href="https://dragon-bpgbadminton.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://dragon-bpgbadminton.com</a>).</li>
            <li>Registration requires accurate personal info: full name, DOB, emergency contact.</li>
            <li>Members must pay all session fees in full <strong>prior to participation</strong>.</li>
            <li>Payments must include full name and session date as reference.</li>
            <li>Non-payment may result in suspension, debt recovery, or legal action.</li>
            <li>Providing false or misleading information breaches these terms.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Safeguarding Children &amp; Vulnerable Adults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p className="text-xs font-medium text-foreground">Aligned with Badminton England</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dragon Badminton Club follows <strong>Badminton England Safeguarding Guidelines</strong>.</li>
            <li>No physical, emotional, or sexual abuse will be tolerated.</li>
            <li>No discrimination based on gender, race, religion, disability, sexual orientation, or age.</li>
            <li>All concerns are logged and reported to the relevant authorities.</li>
            <li>Coaches, staff, and volunteers are trained in safeguarding.</li>
            <li>Payments and registrations are tracked to ensure only registered members attend.</li>
            <li>Sensitive member data is accessible only to authorised personnel.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Behaviour &amp; Conduct</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Members must treat all participants, staff, and coaches with respect.</li>
            <li>No harassment, bullying, offensive language, sexual harassment, or inappropriate contact.</li>
            <li>No intentional damage to club equipment or facilities; financial liability applies.</li>
            <li>Unsafe behaviour, running, or horseplay is prohibited.</li>
            <li>Failure to follow rules may result in suspension, removal, or referral to authorities.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Venue &amp; Fire Safety Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Comply with fire exits, evacuation, and emergency procedures.</li>
            <li>Use equipment only as instructed; report hazards immediately.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. App &amp; Website Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Dragon Badminton uses <strong>Spond</strong> and <strong>BadmintonHub.org</strong> for registration and tracking.</li>
            <li>Names, attendance, and performance may be displayed for administrative purposes.</li>
            <li>Fake accounts or false info are prohibited.</li>
            <li>Misuse of apps (harassment, threats, inappropriate messages) may result in suspension.</li>
            <li>Website (<a href="https://dragon-bpgbadminton.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">https://dragon-bpgbadminton.com</a>) must be used responsibly.</li>
            <li>Approved photos/videos may be displayed; offensive or illegal content is prohibited.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Social Media, Photography &amp; Video Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>By registering, members consent to photography and video for promotion, training review, and social media.</li>
            <li>Members may withdraw consent, but this may limit participation.</li>
            <li>Media of other members cannot be shared without consent.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. Insurance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="font-medium text-foreground">Insurer:</span> QBE Sport Shield Ltd</div>
            <div><span className="font-medium text-foreground">Policy Number:</span> 00037807TRA</div>
            <div><span className="font-medium text-foreground">Policy Wording Reference:</span> PTRA150525</div>
            <div><span className="font-medium text-foreground">Period of Insurance:</span> 19/02/2026 &ndash; 18/02/2027</div>
            <div><span className="font-medium text-foreground">Broker:</span> Exchequer Risk Management Ltd</div>
            <div><span className="font-medium text-foreground">Insured:</span> Dragon Badminton Club &ndash; BPG Ltd</div>
            <div><span className="font-medium text-foreground">Business Description:</span> Sports &amp; Personal Trainer</div>
          </div>
          <div className="mt-2 space-y-1">
            <p><span className="font-medium text-foreground">Coverage:</span></p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Public &amp; Products Liability (Operative)</li>
              <li>Employers Liability (Operative)</li>
              <li>Legal Expenses (Operative)</li>
            </ul>
            <p className="mt-2">Other sections (Contractors All Risks, Business Goods, Personal Accident, Business Interruption) &ndash; Not Operative</p>
          </div>
          <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-foreground">Important</p>
            <p>Players are NOT covered for personal injuries; members are strongly recommended to obtain <strong>Badminton England personal membership</strong> for personal injury insurance.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">8. Data Accuracy &amp; Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Members must provide accurate info; false info may lead to suspension/termination.</li>
            <li>Personal data is handled according to <strong>UK GDPR</strong>.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">9. Legal &amp; Financial Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Dragon Badminton &ndash; BOG Ltd. is a registered company.</li>
            <li>Members agree to pay for sessions, comply with club rules, safeguarding policies, and app/website/social media rules.</li>
            <li>Breaches may result in suspension, safeguarding escalation, or legal action.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">10. Acknowledgment &amp; Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>By registering and paying, members and guardians confirm they have read and understood all policies, including:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Consent to photography, video, and display on apps, website, and social media.</li>
            <li>Agree to comply with Badminton England safeguarding guidelines.</li>
            <li>Accept that non-payment, unsafe behaviour, or breaches may result in suspension, safeguarding report, or legal action.</li>
          </ul>
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
