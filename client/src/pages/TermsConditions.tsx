import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft, ExternalLink } from "lucide-react";
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
            Terms &amp; Conditions of Use
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Club Master Platform &mdash; Version 2.1 &mdash; Effective 27 February 2026</p>
        <p className="text-sm text-muted-foreground">
          Operated by Club Master &ndash; BPG Ltd (Company No.{" "}
          <a href="https://find-and-update.company-information.service.gov.uk/company/16964545" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
            16964545 <ExternalLink className="h-3 w-3" />
          </a>
          )
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Definitions &amp; Interpretation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>In these Terms &amp; Conditions, the following definitions apply:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>&ldquo;The Company&rdquo;</strong> means Club Master &ndash; BPG Ltd, a company registered in England and Wales under company number 16964545.</li>
            <li><strong>&ldquo;The Platform&rdquo;</strong> or <strong>&ldquo;The App&rdquo;</strong> means the Club Master web application, including all pages, features, APIs, and associated services.</li>
            <li><strong>&ldquo;User&rdquo;</strong> means any individual who registers for, accesses, or uses the Platform in any capacity, including Players, Admins, and Owners.</li>
            <li><strong>&ldquo;Player&rdquo;</strong> means a registered member who uses the Platform to attend sessions, view rankings, and engage with club activities.</li>
            <li><strong>&ldquo;Admin&rdquo;</strong> means an authorised club administrator with elevated access to manage club operations.</li>
            <li><strong>&ldquo;Owner&rdquo;</strong> means a super administrator with platform-wide access and management capabilities.</li>
            <li><strong>&ldquo;Content&rdquo;</strong> means all text, images, data, messages, and other materials submitted to or displayed on the Platform.</li>
            <li><strong>&ldquo;Personal Data&rdquo;</strong> has the meaning given under UK GDPR and the Data Protection Act 2018.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Acceptance of Terms</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>By registering for an account, accessing, or using the Platform, you confirm that you have read, understood, and agree to be bound by these Terms &amp; Conditions in full.</li>
            <li>If you do not agree to any part of these Terms, you must not use the Platform and should immediately cease all access.</li>
            <li>These Terms constitute a legally binding agreement between you and the Company.</li>
            <li>The Company reserves the right to amend these Terms at any time. Continued use of the Platform after any amendment constitutes acceptance of the revised Terms.</li>
            <li>Users will be notified of material changes to these Terms via the Platform&apos;s notification system. It is the User&apos;s responsibility to review the current Terms periodically.</li>
            <li>Parents or guardians registering on behalf of a minor (under 18) accept these Terms on the minor&apos;s behalf and assume full responsibility for the minor&apos;s use of the Platform.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Eligibility &amp; Account Registration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>You must be at least 13 years of age to create an account. Users under 18 must have verifiable parental or guardian consent.</li>
            <li>All registration information must be accurate, complete, and kept up to date. Providing false, misleading, or fraudulent information is a material breach of these Terms and may result in immediate account termination.</li>
            <li>You are responsible for maintaining the confidentiality of your login credentials. You must not share your account with any other person.</li>
            <li>You are liable for all activity that occurs under your account, whether authorised by you or not.</li>
            <li>You must notify the Company immediately if you suspect any unauthorised access to your account.</li>
            <li>The Company reserves the right to refuse registration, suspend, or terminate any account at its sole discretion, without prior notice and without liability.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Platform Usage &amp; Acceptable Use Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">4.1 Permitted Use</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform is provided solely for the purpose of managing sports club activities, including session bookings, attendance tracking, match organisation, player rankings, communications, and financial management.</li>
            <li>You may only use the Platform for its intended purpose and in accordance with these Terms and all applicable laws.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">4.2 Prohibited Conduct</p>
          <p>You must not:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Use the Platform for any unlawful, fraudulent, or harmful purpose.</li>
            <li>Attempt to gain unauthorised access to any part of the Platform, other user accounts, or the underlying systems and infrastructure.</li>
            <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Platform.</li>
            <li>Introduce viruses, malware, or any harmful code to the Platform.</li>
            <li>Use automated tools, scripts, bots, or scrapers to access or interact with the Platform without prior written consent.</li>
            <li>Harvest, collect, or store personal data of other Users without their explicit consent and a lawful basis.</li>
            <li>Send spam, unsolicited communications, or use the messaging system for commercial advertising.</li>
            <li>Post, upload, or transmit any Content that is defamatory, obscene, offensive, discriminatory, threatening, harassing, or otherwise objectionable.</li>
            <li>Impersonate any person, create fake accounts, or misrepresent your identity or affiliation.</li>
            <li>Interfere with or disrupt the Platform&apos;s functionality, security, or availability.</li>
            <li>Circumvent or attempt to circumvent any access controls, security measures, or usage restrictions.</li>
            <li>Use the Platform in any way that could damage the Company&apos;s reputation or goodwill.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">4.3 Consequences of Breach</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Any breach of this Acceptable Use Policy may result in immediate suspension or permanent termination of your account without prior notice.</li>
            <li>The Company reserves the right to report any suspected illegal activity to the relevant law enforcement authorities and to cooperate fully with any investigation.</li>
            <li>You may be held liable for any losses, damages, or costs incurred by the Company or other Users as a result of your breach.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">5. Membership, Sessions &amp; Payment Obligations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>All session fees, membership fees, and other charges must be paid in full by the due date as displayed on the Platform.</li>
            <li>Payments must include the member&apos;s full name and session date as a reference. Unidentifiable payments may not be credited to your account.</li>
            <li>Non-payment or late payment may result in suspension of access, loss of booking privileges, and the commencement of debt recovery proceedings.</li>
            <li>The Company reserves the right to engage third-party debt collection agencies and to pursue legal action to recover outstanding debts, including all reasonable costs and expenses incurred.</li>
            <li>Membership plans, fees, and pricing may change at any time. Users will be notified of changes via the Platform. Continued use constitutes acceptance of revised pricing.</li>
            <li>Rewards earned through referrals, milestones, or other programmes are non-transferable, have no cash value, and may only be redeemed against Platform services at the Company&apos;s discretion.</li>
            <li>The Company is not liable for any errors in payment processing by third-party payment providers.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6. Behaviour, Conduct &amp; Safeguarding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">6.1 Code of Conduct</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All Users must treat fellow members, staff, coaches, and venue personnel with dignity and respect at all times, both on the Platform and at physical sessions.</li>
            <li>Harassment, bullying, discrimination, threatening behaviour, offensive language, sexual harassment, or any form of inappropriate conduct is strictly prohibited and will be treated as a serious breach.</li>
            <li>No intentional damage to club equipment, facilities, or venue property. Users will be held financially liable for any damage caused.</li>
            <li>Unsafe behaviour, running, horseplay, or any activity that endangers others is prohibited during sessions.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">6.2 Safeguarding</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Company follows <strong>Badminton England Safeguarding Guidelines</strong> and is committed to protecting children and vulnerable adults.</li>
            <li>No physical, emotional, or sexual abuse will be tolerated under any circumstances.</li>
            <li>No discrimination based on gender, race, ethnicity, religion, disability, sexual orientation, age, or any other protected characteristic.</li>
            <li>All safeguarding concerns are logged, investigated, and reported to the relevant authorities including local safeguarding boards and law enforcement where appropriate.</li>
            <li>Coaches, staff, and volunteers are trained in safeguarding and child protection procedures.</li>
            <li>Sensitive member data relating to safeguarding matters is accessible only to authorised personnel on a strict need-to-know basis.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">6.3 Enforcement</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Breaches of conduct rules may result in verbal or written warnings, temporary suspension, permanent ban, or referral to relevant authorities.</li>
            <li>The Company&apos;s decision on enforcement actions is final and not subject to appeal unless required by law.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">6A. Junior Players, Skill Development &amp; Training</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">6A.1 Junior Accounts &amp; Parental Responsibility</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Junior (under-18) accounts must be created by a parent or legal guardian, who assumes full responsibility for the child&apos;s use of the Platform and attendance at sessions.</li>
            <li>Parents must provide accurate emergency contact details and disclose any relevant medical conditions. This information is stored securely and shared only with authorised coaching staff.</li>
            <li>Junior accounts are linked to a parent account and cannot be accessed independently. Parents are responsible for keeping their child&apos;s profile information up to date.</li>
            <li>By registering a junior, the parent consents to the collection and processing of the child&apos;s data as described in these Terms and the Junior Consent Policy.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">6A.2 Skill Development &amp; Assessments</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform tracks junior players&apos; skill development across multiple categories (e.g. Footwork, Attack, Defense, Psychology) based on coach assessments during sessions.</li>
            <li>Skill assessments, ratings, and coach comments are provided for developmental and coaching purposes only. They do not constitute formal qualifications or certifications.</li>
            <li>Effort ratings, coach ratings, and skill progress data are visible to the child&apos;s parent/guardian and to club administrators.</li>
            <li>Skill rankings are calculated from a combination of coach assessments, attendance records, and match performance. Rankings are intended to encourage development, not to create competitive pressure.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">6A.3 Training Challenges &amp; Exercise Content</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform provides suggested exercise routines and training challenges for junior players to complete outside of sessions. These exercises are provided as guidance only.</li>
            <li>Parents are responsible for ensuring any exercises are performed safely and are appropriate for their child&apos;s age, fitness level, and any medical conditions.</li>
            <li>The Company is not liable for any injuries sustained while performing suggested exercises at home, in the gym, or at any location outside of official club sessions.</li>
            <li>Exercise tutorial videos are embedded from YouTube and other third-party sources. The Company does not control or endorse all content on these external platforms.</li>
            <li>Skill points earned through exercise completions are for motivational purposes only and have no monetary or redeemable value.</li>
          </ul>
          <p className="font-medium text-foreground mt-3">6A.4 Junior Sessions &amp; Attendance</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Junior-only sessions are supervised by DBS-checked coaches. Parents are responsible for ensuring their child arrives on time and is collected promptly after sessions.</li>
            <li>Attendance is recorded by coaching staff and contributes to the child&apos;s development profile. Consistent attendance is encouraged for optimal skill development.</li>
            <li>Match results and performance data from junior sessions are recorded and visible to parents via the Junior Hub.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">7. Data Protection &amp; UK GDPR Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground">7.1 Data Controller</p>
          <p>Club Master &ndash; BPG Ltd (Company No. 16964545) is the Data Controller for all Personal Data processed through the Platform, as defined under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.</p>

          <p className="font-medium text-foreground mt-3">7.2 Lawful Basis for Processing</p>
          <p>We process your Personal Data under the following lawful bases:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Contract:</strong> Processing necessary for the performance of our contract with you (account management, session bookings, payments).</li>
            <li><strong>Consent:</strong> Where you have given explicit consent (public name display, marketing communications, photography).</li>
            <li><strong>Legitimate Interest:</strong> Processing necessary for our legitimate interests (platform security, fraud prevention, service improvement, analytics) where those interests are not overridden by your rights.</li>
            <li><strong>Legal Obligation:</strong> Processing required to comply with a legal obligation (safeguarding, financial record keeping, law enforcement cooperation).</li>
          </ul>

          <p className="font-medium text-foreground mt-3">7.3 Data We Collect</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Identity data: full name, date of birth, gender, profile photo.</li>
            <li>Contact data: email address, phone number, emergency contact details.</li>
            <li>Account data: username, password (encrypted), account preferences, display settings.</li>
            <li>Activity data: session bookings, attendance records, match results, rankings, grades.</li>
            <li>Financial data: payment records, credit balances, membership status, transaction history.</li>
            <li>Communication data: messages sent within the Platform, support tickets, notification preferences.</li>
            <li>Technical data: IP address, browser type, device information, session cookies, login timestamps.</li>
            <li>Acquisition data: how you heard about the club, referral information.</li>
            <li>Junior-specific data: parent/guardian name, contact details, consent records, skill assessments, exercise completion records, training challenge progress, and coach comments.</li>
          </ul>

          <p className="font-medium text-foreground mt-3">7.4 Data Sharing</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>We do <strong>not</strong> sell, rent, or trade your Personal Data to any third party.</li>
            <li>We do <strong>not</strong> share your data for marketing purposes with external organisations.</li>
            <li>Your data may be shared with: club administrators (for operational purposes), authorised coaches, payment processors, and law enforcement or regulatory bodies where legally required.</li>
            <li>Other Players may see your display name and ranking on public leaderboards, subject to your privacy settings. Contact details are never publicly visible.</li>
          </ul>

          <p className="font-medium text-foreground mt-3">7.5 Data Retention</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Personal Data is retained only for as long as necessary to fulfil the purposes for which it was collected, or as required by law.</li>
            <li>Account data is retained for the duration of your membership. Upon account deletion, Personal Data will be erased within 30 days, except where retention is required for legal, regulatory, or safeguarding purposes.</li>
            <li>Financial records are retained for a minimum of 6 years in accordance with HMRC requirements.</li>
            <li>Safeguarding records are retained in accordance with statutory guidance and may be retained indefinitely where necessary for child protection purposes.</li>
            <li>Audit logs and security records are retained for 12 months for platform integrity and security purposes.</li>
          </ul>

          <p className="font-medium text-foreground mt-3">7.6 Your Rights Under UK GDPR</p>
          <p>You have the following rights in respect of your Personal Data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Right of Access (Article 15):</strong> Request a copy of the Personal Data we hold about you.</li>
            <li><strong>Right to Rectification (Article 16):</strong> Request correction of inaccurate or incomplete data.</li>
            <li><strong>Right to Erasure (Article 17):</strong> Request deletion of your data where there is no compelling reason for continued processing.</li>
            <li><strong>Right to Restrict Processing (Article 18):</strong> Request restriction of processing in certain circumstances.</li>
            <li><strong>Right to Data Portability (Article 20):</strong> Receive your data in a structured, commonly used, machine-readable format.</li>
            <li><strong>Right to Object (Article 21):</strong> Object to processing based on legitimate interests or direct marketing.</li>
            <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time where processing is based on consent, without affecting the lawfulness of processing carried out prior to withdrawal.</li>
          </ul>
          <p>To exercise any of these rights, contact us via the Contact page or email the Company directly. We will respond within one calendar month as required by law.</p>

          <p className="font-medium text-foreground mt-3">7.7 Data Security</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>All passwords are encrypted using industry-standard hashing algorithms and are never stored in plain text.</li>
            <li>Data is transmitted using HTTPS/TLS encryption.</li>
            <li>Access to Personal Data is restricted to authorised personnel on a need-to-know basis, enforced through role-based access controls.</li>
            <li>We maintain appropriate technical and organisational measures to protect against unauthorised access, accidental loss, destruction, or damage.</li>
          </ul>

          <p className="font-medium text-foreground mt-3">7.8 International Data Transfers</p>
          <p>Your data is stored and processed within the United Kingdom and European Economic Area. If any transfer to a third country is necessary, we will ensure appropriate safeguards are in place in accordance with UK GDPR requirements.</p>

          <p className="font-medium text-foreground mt-3">7.9 Data Breaches</p>
          <p>In the event of a personal data breach that poses a risk to your rights and freedoms, we will notify the Information Commissioner&apos;s Office (ICO) within 72 hours and will inform affected individuals without undue delay, in accordance with Articles 33 and 34 of UK GDPR.</p>

          <p className="font-medium text-foreground mt-3">7.10 Complaints</p>
          <p>If you believe your data protection rights have been breached, you have the right to lodge a complaint with the Information Commissioner&apos;s Office (ICO):</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Website: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary underline">ico.org.uk</a></li>
            <li>Telephone: 0303 123 1113</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">8. Cookies &amp; Tracking</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform uses essential cookies and session tokens to authenticate users, maintain login sessions, and store user preferences.</li>
            <li>We do <strong>not</strong> use advertising cookies, third-party tracking pixels, or behavioural profiling tools.</li>
            <li>By using the Platform, you consent to the use of strictly necessary cookies as described above.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">9. Social Media, Photography &amp; Video Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>By registering, Users consent to photography and video recording at club sessions and events for the purposes of promotion, coaching review, and social media content.</li>
            <li>Users may withdraw this consent in writing at any time. However, withdrawal of consent may limit participation in certain activities where recording is integral.</li>
            <li>Media featuring other members must not be shared publicly without their explicit consent.</li>
            <li>Offensive, illegal, or inappropriate content must not be uploaded, shared, or distributed via the Platform or any associated social media channels.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">10. Venue &amp; Fire Safety</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>Users must comply with all venue rules, fire safety procedures, and emergency evacuation instructions.</li>
            <li>Equipment must be used only as instructed. Any hazards, damage, or safety concerns must be reported immediately to a club administrator or venue staff.</li>
            <li>The Company is not liable for personal injuries sustained at venues unless caused by the Company&apos;s proven negligence.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">11. Insurance &amp; Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <div><span className="font-medium text-foreground">Insurer:</span> QBE Sport Shield Ltd</div>
            <div><span className="font-medium text-foreground">Policy Number:</span> 00037807TRA</div>
            <div><span className="font-medium text-foreground">Policy Wording Reference:</span> PTRA150525</div>
            <div><span className="font-medium text-foreground">Period of Insurance:</span> 19/02/2026 &ndash; 18/02/2027</div>
            <div><span className="font-medium text-foreground">Broker:</span> Exchequer Risk Management Ltd</div>
            <div><span className="font-medium text-foreground">Insured:</span> Club Master &ndash; BPG Ltd</div>
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
            <p className="text-sm font-medium text-foreground">Important Notice</p>
            <p>Players are <strong>NOT</strong> covered for personal injuries under the club&apos;s insurance policy. Members are strongly recommended to obtain relevant governing body membership (e.g. Badminton England) for individual personal injury insurance coverage. Participation in sessions is entirely at your own risk.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">12. Intellectual Property</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>All intellectual property rights in the Platform, including but not limited to the software, design, graphics, logos, text, and underlying code, are owned by or licensed to the Company.</li>
            <li>No part of the Platform may be reproduced, distributed, modified, reverse-engineered, or used for commercial purposes without the prior written consent of the Company.</li>
            <li>Content you submit to the Platform (such as messages or profile information) remains your property, but you grant the Company a non-exclusive, royalty-free, worldwide licence to use, display, and process that Content as necessary for the operation of the Platform.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">13. Disclaimers &amp; Limitation of Liability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. The Company makes no warranties, express or implied, regarding the Platform&apos;s availability, reliability, accuracy, or fitness for a particular purpose.</li>
            <li>The Company does not guarantee that the Platform will be uninterrupted, error-free, or free from security vulnerabilities.</li>
            <li>To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform.</li>
            <li>The Company&apos;s total aggregate liability to you for any claims arising from or related to these Terms or your use of the Platform shall not exceed the total fees you have paid to the Company in the 12 months preceding the claim.</li>
            <li>Nothing in these Terms excludes or limits the Company&apos;s liability for death or personal injury caused by negligence, fraud, or any other liability that cannot be excluded by law.</li>
            <li>The Company is not responsible for the accuracy of information provided by other Users, including but not limited to match results, rankings, or communications.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">14. Indemnification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>You agree to indemnify, defend, and hold harmless the Company, its directors, officers, employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable legal fees) arising from:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your breach of these Terms &amp; Conditions.</li>
            <li>Your violation of any law, regulation, or third-party rights.</li>
            <li>Your use of the Platform, including any Content you submit.</li>
            <li>Any dispute between you and another User of the Platform.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">15. Account Suspension &amp; Termination</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>The Company may suspend or terminate your account immediately and without notice if you breach these Terms, engage in prohibited conduct, fail to pay outstanding fees, or if required for safeguarding purposes.</li>
            <li>Upon termination, your right to access the Platform ceases immediately. Outstanding payment obligations survive termination.</li>
            <li>You may request account deletion at any time through your Profile settings. Account deletion is subject to a 3-day grace period, during which you may cancel the request.</li>
            <li>Following account deletion, your Personal Data will be processed in accordance with Section 7.5 (Data Retention).</li>
            <li>The Company reserves the right to retain anonymised or aggregated data for analytical purposes following account deletion.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">16. Third-Party Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>The Platform may integrate with or contain links to third-party services, websites, or APIs. These are provided for convenience only.</li>
            <li>The Company does not endorse, control, or assume responsibility for any third-party content, services, or privacy practices.</li>
            <li>Your use of third-party services is governed by their respective terms and privacy policies.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">17. Force Majeure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The Company shall not be liable for any failure or delay in performing its obligations where such failure or delay results from circumstances beyond its reasonable control, including but not limited to natural disasters, pandemic, war, terrorism, government actions, utility or telecommunications failures, or cyberattacks.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">18. Severability</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be severed from the remainder of the Terms, which shall continue in full force and effect.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">19. Governing Law &amp; Jurisdiction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <ul className="list-disc pl-6 space-y-1">
            <li>These Terms &amp; Conditions are governed by and construed in accordance with the laws of England and Wales.</li>
            <li>Any disputes arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.</li>
            <li>The Company encourages the resolution of disputes through informal communication before resorting to legal proceedings.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">20. Legal &amp; Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div><span className="font-medium text-foreground">Company Name:</span> Club Master &ndash; BPG Ltd</div>
            <div><span className="font-medium text-foreground">Company Number:</span> 16964545</div>
            <div className="sm:col-span-2">
              <span className="font-medium text-foreground">Companies House:</span>{" "}
              <a href="https://find-and-update.company-information.service.gov.uk/company/16964545" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1" data-testid="link-companies-house">
                View on Companies House <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div><span className="font-medium text-foreground">Jurisdiction:</span> England and Wales</div>
            <div><span className="font-medium text-foreground">Registered in:</span> United Kingdom</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">21. Recognition Cards &amp; Appreciation Benefits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>The Platform includes a Recognition Cards feature that allows club coordinators to issue digital tokens of appreciation to members. By using this feature, you acknowledge and agree to the following:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Not Wages or Compensation:</strong> Recognition Cards and any associated benefits (including session fee discounts) are voluntary, discretionary appreciation tokens. They do not constitute wages, salary, commission, guaranteed rewards, employee benefits, or any form of contractual compensation. No employment, worker, or contractor relationship is created or implied by receiving a Recognition Card.</li>
            <li><strong>No Cash Value:</strong> Recognition Cards and associated benefits have no monetary or cash-equivalent value. They cannot be exchanged for cash, redeemed for currency, or converted to any financial instrument.</li>
            <li><strong>Non-Transferable:</strong> Recognition Cards are personal to the individual to whom they are issued. They cannot be sold, traded, gifted, transferred, or assigned to any other person or account.</li>
            <li><strong>Discretionary &amp; Revocable:</strong> The issuance of Recognition Cards and any associated benefits is entirely at the discretion of club coordinators and platform administrators. Benefits may be modified, suspended, or withdrawn at any time without prior notice and without obligation to provide a reason.</li>
            <li><strong>No Accumulation or Entitlement:</strong> Receipt of a Recognition Card does not create any entitlement to future cards, benefits, or rewards. Past issuance does not establish a pattern, precedent, or expectation of continued benefits.</li>
            <li><strong>Expiration:</strong> Recognition Cards may be subject to expiration dates set at the time of issuance. Expired cards and their associated benefits are automatically deactivated and cannot be renewed or reinstated unless a new card is issued.</li>
            <li><strong>Administrator Discretion:</strong> All benefit issuance requires manual approval by an authorised club coordinator. There are no automated payouts. The decision to issue, withhold, or revoke benefits is final and not subject to appeal.</li>
            <li><strong>Tax Responsibility:</strong> In the unlikely event that any tax authority deems any benefit associated with a Recognition Card to be taxable, the recipient is solely responsible for any applicable tax obligations. The Company provides no tax advice and accepts no liability in respect of tax treatment of any benefits.</li>
            <li><strong>Terminology:</strong> Terms such as &ldquo;benefit,&rdquo; &ldquo;appreciation token,&rdquo; or &ldquo;recognition&rdquo; used in connection with this feature are descriptive only and shall not be interpreted as implying any financial, contractual, or employment-related meaning beyond their ordinary descriptive sense within the context of this Platform.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">22. Acknowledgment &amp; Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <p>By registering for an account and using the Platform, you acknowledge and confirm that:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>You have read and understood these Terms &amp; Conditions in their entirety.</li>
            <li>You agree to be bound by these Terms and all policies referenced herein, including the Privacy Policy and Safeguarding Policy.</li>
            <li>You consent to the collection and processing of your Personal Data as described in Section 7.</li>
            <li>You consent to photography and video as described in Section 9, unless you withdraw consent in writing.</li>
            <li>You understand that sessions are attended at your own risk and that the Company&apos;s insurance does not cover personal injuries to players.</li>
            <li>You agree that non-payment, unsafe behaviour, or breach of these Terms may result in suspension, termination, safeguarding escalation, or legal action.</li>
            <li>Parents or guardians accept these Terms on behalf of any minor they register, including consent to skill tracking, exercise challenges, and development data collection as described in Section 6A.</li>
            <li>You understand that training exercises and challenges provided on the Platform are suggestions only, and that the Company is not liable for injuries sustained while performing exercises outside of supervised club sessions.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="text-center space-y-3 pb-8">
        <p className="text-xs text-muted-foreground">
          These Terms &amp; Conditions were last updated on 27 February 2026.
        </p>
        <p className="text-xs text-muted-foreground">
          Club Master &ndash; BPG Ltd &mdash; Company No. 16964545
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/privacy-policy">
            <Button variant="outline" size="sm" data-testid="button-privacy-from-terms">
              Privacy Policy
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="sm" data-testid="button-contact-from-terms">
              Contact Us
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
