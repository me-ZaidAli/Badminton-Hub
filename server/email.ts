import nodemailer from "nodemailer";

function getGmailTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendClaimAccountEmail(
  to: string,
  playerName: string,
  clubName: string,
  claimUrl: string
): Promise<void> {
  const subject = `You've been added to ${clubName} - Claim your account`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333;">Welcome to ${clubName}!</h2>
      <p>Hi ${playerName},</p>
      <p>You've been added as a player to <strong>${clubName}</strong> on Club Master. An account has been created for you.</p>
      <p>To set your password and start using your account, click the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${claimUrl}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Claim Your Account
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="color: #666; font-size: 14px; word-break: break-all;">${claimUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 30 days. If you didn't expect this email, you can safely ignore it.</p>
    </div>
  `;

  const transport = getGmailTransport();
  if (transport) {
    await transport.sendMail({
      from: `"Club Master" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`[EMAIL SENT] Claim account email sent to ${to} via Gmail`);
    return;
  }

  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (sendgridKey) {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${sendgridKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.SENDGRID_FROM_EMAIL || "noreply@clubmaster.app", name: "Club Master" },
        subject,
        content: [{ type: "text/html", value: htmlContent }],
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SendGrid error: ${response.status} ${text}`);
    }
    return;
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || "Club Master <noreply@clubmaster.app>",
        to: [to],
        subject,
        html: htmlContent,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Resend error: ${response.status} ${text}`);
    }
    return;
  }

  console.log(`[EMAIL NOT SENT - No email service configured] Claim account email for ${to}:`);
  console.log(`  Claim URL: ${claimUrl}`);
  throw new Error("No email service configured. Set GMAIL_USER/GMAIL_APP_PASSWORD, SENDGRID_API_KEY, or RESEND_API_KEY.");
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transport = getGmailTransport();
  if (transport) {
    await transport.sendMail({
      from: `"Club Master" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL SENT] Email sent to ${to} via Gmail`);
    return;
  }
  throw new Error("No email service configured.");
}
