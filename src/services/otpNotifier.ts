import nodemailer from "nodemailer";

interface SendOtpOptions {
  target: string;
  type: "email" | "phone";
  code: string;
}

export interface SendOtpResult {
  success: boolean;
  message: string;
  provider: string;
  deliveredToRecipient: boolean;
}

/**
 * Configure Nodemailer transport if SMTP or Gmail credentials exist in environment.
 */
function createEmailTransporter() {
  // Option 1: Direct Gmail with App Password (Recommended, free, zero-config)
  const gmailUser = process.env.GMAIL_USER || process.env.EMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;

  if (gmailUser && gmailPass) {
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ""), // clean spaces in app password
        },
      }),
      from: `"GenAI Data Analyst" <${gmailUser}>`,
      provider: "Gmail SMTP",
    };
  }

  // Option 2: Generic SMTP (SendGrid, Mailgun, AWS SES, Postmark, custom SMTP)
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || (smtpUser ? `"GenAI Data Analyst" <${smtpUser}>` : undefined);

  if (smtpHost && smtpUser && smtpPass) {
    return {
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      }),
      from: smtpFrom || `"GenAI Data Analyst" <${smtpUser}>`,
      provider: `SMTP (${smtpHost})`,
    };
  }

  return null;
}

/**
 * Send an OTP code directly to user's email address.
 */
async function sendEmailOtp(email: string, code: string): Promise<SendOtpResult> {
  const mailSetup = createEmailTransporter();

  const subject = `Your Verification Code: ${code} - GenAI Data Analyst`;
  const textBody = `Your 6-digit verification code is: ${code}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, you can safely ignore this email.`;
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #fdfbf7; border: 1px solid #e5dcce; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #1c1917; font-size: 20px; font-weight: 700; margin: 0 0 6px 0;">GenAI Data Analyst</h1>
        <p style="color: #736b5e; font-size: 13px; margin: 0;">Enterprise Intelligence & Analytics Platform</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #ebd7c1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #44403c; font-size: 14px; margin-top: 0; margin-bottom: 16px;">Use the verification code below to confirm your identity:</p>
        <div style="display: inline-block; background-color: #24211e; color: #f7f4ef; font-family: monospace, Courier; font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 12px 28px; border-radius: 10px; margin-bottom: 16px;">
          ${code}
        </div>
        <p style="color: #736b5e; font-size: 12px; margin: 0;">Code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
      </div>

      <div style="border-top: 1px solid #e5dcce; padding-top: 16px; font-size: 11px; color: #8c8273; text-align: center; line-height: 1.5;">
        <p style="margin: 0;">This email was sent to ${email} for account verification.</p>
        <p style="margin: 4px 0 0 0;">If you did not make this request, no further action is required.</p>
      </div>
    </div>
  `;

  // 1. Try Nodemailer (Gmail App Password or SMTP)
  if (mailSetup) {
    try {
      console.log(`[EMAIL DISPATCH] Sending real email to ${email} via ${mailSetup.provider}...`);
      await mailSetup.transporter.sendMail({
        from: mailSetup.from,
        to: email,
        subject,
        text: textBody,
        html: htmlBody,
      });
      console.log(`[EMAIL DISPATCH] Successfully dispatched email to ${email}`);
      return {
        success: true,
        message: `A 6-digit verification code has been dispatched to ${email} via ${mailSetup.provider}.`,
        provider: mailSetup.provider,
        deliveredToRecipient: true,
      };
    } catch (err: any) {
      console.error(`[EMAIL DISPATCH ERROR] Failed to send via ${mailSetup.provider}:`, err.message);
      return {
        success: true,
        message: `Email delivery via ${mailSetup.provider} failed (${err.message}).`,
        provider: "server-fallback",
        deliveredToRecipient: false,
      };
    }
  }

  // 2. Try Resend API if RESEND_API_KEY is configured
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      console.log(`[EMAIL DISPATCH] Sending real email to ${email} via Resend API...`);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "GenAI Data Analyst <onboarding@resend.dev>",
          to: [email],
          subject,
          html: htmlBody,
        }),
      });
      if (res.ok) {
        console.log(`[EMAIL DISPATCH] Successfully dispatched email to ${email} via Resend`);
        return {
          success: true,
          message: `A 6-digit verification code has been dispatched to ${email} via Resend.`,
          provider: "Resend",
          deliveredToRecipient: true,
        };
      } else {
        const errorText = await res.text();
        console.error(`[EMAIL DISPATCH ERROR] Resend error ${res.status}:`, errorText);
      }
    } catch (err: any) {
      console.error(`[EMAIL DISPATCH ERROR] Resend failed:`, err.message);
    }
  }

  // 3. Try Brevo (Sendinblue) API if BREVO_API_KEY is configured
  const brevoKey = process.env.BREVO_API_KEY;
  if (brevoKey) {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "GenAI Data Analyst", email: process.env.BREVO_FROM || "no-reply@genaidataanalyst.com" },
          to: [{ email }],
          subject,
          htmlContent: htmlBody,
        }),
      });
      if (res.ok) {
        return {
          success: true,
          message: `A 6-digit verification code has been dispatched to ${email} via Brevo.`,
          provider: "Brevo",
          deliveredToRecipient: true,
        };
      }
    } catch (err: any) {
      console.error(`[EMAIL DISPATCH ERROR] Brevo failed:`, err.message);
    }
  }

  // 4. No email gateway credentials found in environment
  console.log(`\n======================================================`);
  console.log(`[EMAIL OTP NOTICE] Recipient: ${email}`);
  console.log(`[EMAIL OTP NOTICE] Verification Code: ${code}`);
  console.log(`[EMAIL OTP NOTICE] No live email provider credentials found.`);
  console.log(`[EMAIL OTP NOTICE] To receive real emails in your inbox, set GMAIL_USER & GMAIL_APP_PASSWORD in environment variables.`);
  console.log(`======================================================\n`);

  return {
    success: true,
    message: `Verification code generated for ${email}. Note: No email provider configured on server.`,
    provider: "unconfigured",
    deliveredToRecipient: false,
  };
}

/**
 * Send an OTP code directly to user's phone number via SMS.
 */
async function sendPhoneOtp(phone: string, code: string): Promise<SendOtpResult> {
  // Option 1: Twilio SMS Gateway
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
    try {
      console.log(`[SMS DISPATCH] Sending real SMS to ${phone} via Twilio...`);
      const authHeader = "Basic " + Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
      const params = new URLSearchParams({
        To: phone,
        From: twilioFrom,
        Body: `Your GenAI Data Analyst verification code is: ${code}. Valid for 10 minutes.`,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twilio API responded with status ${response.status}: ${errorText}`);
      }

      console.log(`[SMS DISPATCH] Successfully dispatched SMS to ${phone}`);
      return {
        success: true,
        message: `A 6-digit SMS verification code has been dispatched to ${phone}.`,
        provider: "Twilio SMS",
        deliveredToRecipient: true,
      };
    } catch (err: any) {
      console.error(`[SMS DISPATCH ERROR] Failed to send SMS via Twilio:`, err.message);
      return {
        success: true,
        message: `Verification code generated for ${phone}. (Twilio delivery failed: ${err.message})`,
        provider: "server-fallback",
        deliveredToRecipient: false,
      };
    }
  }

  // Option 2: Fast2SMS (popular in India for instant OTP)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    try {
      const cleanPhone = phone.replace(/\D/g, "").slice(-10);
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${fast2smsKey}&route=otp&variables_values=${code}&numbers=${cleanPhone}`;
      const res = await fetch(url);
      const data: any = await res.json().catch(() => ({}));
      if (data.return) {
        return {
          success: true,
          message: `A 6-digit SMS verification code has been dispatched to ${phone} via Fast2SMS.`,
          provider: "Fast2SMS",
          deliveredToRecipient: true,
        };
      }
    } catch (err: any) {
      console.error(`[SMS DISPATCH ERROR] Fast2SMS:`, err.message);
    }
  }

  // Option 3: Custom SMS Webhook
  const smsWebhookUrl = process.env.SMS_WEBHOOK_URL;
  if (smsWebhookUrl) {
    try {
      const res = await fetch(smsWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phone,
          code,
          message: `Your GenAI Data Analyst verification code is: ${code}`,
        }),
      });
      if (res.ok) {
        return {
          success: true,
          message: `A 6-digit SMS verification code has been dispatched to ${phone}.`,
          provider: "SMS Webhook",
          deliveredToRecipient: true,
        };
      }
    } catch (err: any) {
      console.error(`[SMS DISPATCH ERROR] Webhook:`, err.message);
    }
  }

  // If no SMS gateway configured, log to server console
  console.log(`\n======================================================`);
  console.log(`[SMS OTP NOTICE] Recipient: ${phone}`);
  console.log(`[SMS OTP NOTICE] Verification Code: ${code}`);
  console.log(`[SMS OTP NOTICE] No live SMS gateway credentials found.`);
  console.log(`[SMS OTP NOTICE] To receive real SMS on your phone, set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.`);
  console.log(`======================================================\n`);

  return {
    success: true,
    message: `Verification code generated for ${phone}. Note: No SMS provider configured on server.`,
    provider: "unconfigured",
    deliveredToRecipient: false,
  };
}

/**
 * Universal dispatcher for OTP verification codes.
 */
export async function dispatchOtp(options: SendOtpOptions): Promise<SendOtpResult> {
  const { target, type, code } = options;
  if (type === "email") {
    return sendEmailOtp(target, code);
  } else {
    return sendPhoneOtp(target, code);
  }
}
