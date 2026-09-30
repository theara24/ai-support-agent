import { NextRequest, NextResponse } from 'next/server';
import { provisionTenantAdmin } from '@/lib/tenant-accounts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, request, tempPassword } = body;

    if (!request || !request.email || !request.orgName) {
      return NextResponse.json(
        { error: 'Missing required request details (email, orgName)' },
        { status: 400 }
      );
    }

    const { email, contactName, orgName } = request;
    const origin = req.headers.get('origin') || 'https://theara-ai-support-agent.vercel.app';
    const loginUrl = `${origin}/login`;
    const kbUrl = `${origin}/knowledge-base`;
    const widgetConfigUrl = `${origin}/widget-config`;

    let subject = '';
    let textContent = '';
    let htmlContent = '';

    if (action === 'APPROVE') {
      const password = tempPassword || `Support@${Math.floor(1000 + Math.random() * 9000)}!`;

      // Automatically provision the Organization and Admin account in database & auth store
      try {
        await provisionTenantAdmin({
          email,
          password,
          orgName,
          contactName: contactName || 'Admin User',
        });
      } catch (provErr) {
        console.warn('Auto account provisioning warning:', provErr);
      }

      subject = `🎉 Your AI Assistant Workspace is Approved - ${orgName}`;

      textContent = `Hello ${contactName || 'there'},

Congratulations! Your application for an AI Assistant Workspace for "${orgName}" has been APPROVED by the Super Admin.

--------------------------------------------------
YOUR WORKSPACE LOGIN CREDENTIALS
--------------------------------------------------
Login URL: ${loginUrl}
Email: ${email}
Temporary Password: ${password}
--------------------------------------------------

NEXT STEPS TO LAUNCH YOUR AI ASSISTANT:
1. Log In: Visit ${loginUrl} and log in with your credentials above.
2. Add Knowledge (RAG): Go to ${kbUrl} and upload your FAQs, service catalogs, or company policies so your AI answers accurately.
3. Configure & Embed: Visit ${widgetConfigUrl} to customize your bot persona, colors, and grab your 1-line website widget script.

If you have any questions or require custom setup assistance, feel free to reply to this email or contact Theara Chim directly (+855 68 427 420).

Best regards,
Theara AI Support Platform
Chim Theara (ជឺម ធារ៉ា)`;

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px 16px; margin: 0; }
    .card { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.4); }
    .header { background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0 0; color: #e0f2fe; font-size: 14px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 16px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
    .cred-box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; margin: 20px 0; }
    .cred-item { margin: 8px 0; font-size: 14px; color: #cbd5e1; }
    .cred-item strong { color: #38bdf8; display: inline-block; width: 140px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #4f46e5 100%); color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; margin: 16px 0; }
    .steps { margin: 24px 0 8px 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.6; }
    .footer { border-top: 1px solid #1e293b; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; background: #0b0f19; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Theara AI Support Platform</h1>
      <p>Workspace Approved • គម្រោង AI ត្រូវបានអនុម័ត</p>
    </div>
    <div class="content">
      <div class="greeting">Hello ${contactName || 'there'},</div>
      <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
        Congratulations! Your application for an Autonomous AI Assistant workspace for <strong style="color:#ffffff;">${orgName}</strong> has been reviewed and <strong style="color: #34d399;">APPROVED</strong> by the platform administrator.
      </p>

      <div class="cred-box">
        <div style="font-weight: 700; color: #f8fafc; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">
          🔐 Your Workspace Admin Credentials
        </div>
        <div class="cred-item"><strong>Login Portal:</strong> <a href="${loginUrl}" style="color: #38bdf8;">${loginUrl}</a></div>
        <div class="cred-item"><strong>Email:</strong> ${email}</div>
        <div class="cred-item"><strong>Temporary Pass:</strong> <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px; color: #f472b6;">${password}</code></div>
      </div>

      <div style="text-align: center;">
        <a href="${loginUrl}" class="btn" target="_blank">Access Your Workspace &rarr;</a>
      </div>

      <div style="margin-top: 24px;">
        <strong style="color: #ffffff; font-size: 14px;">Next Steps to Launch Your AI Assistant:</strong>
        <ol class="steps">
          <li><strong>Sign In</strong> using the credentials above.</li>
          <li><strong>Add Knowledge Base (RAG):</strong> Upload your FAQ or services documentation in the Knowledge Base so your assistant gives precise, company-specific answers.</li>
          <li><strong>Get Embed Code:</strong> Visit <em>Widget Config</em> to choose colors, greeting, and copy the 1-line script for your website.</li>
        </ol>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0;">Built by Chim Theara (ជឺម ធារ៉ា) • Autonomous AI Customer Support Platform</p>
      <p style="margin: 4px 0 0 0;">Phnom Penh, Cambodia • Contact: +855 68 427 420</p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      subject = `Update regarding your AI Assistant Workspace application - ${orgName}`;

      textContent = `Hello ${contactName || 'there'},

Thank you for your interest in Theara AI Support Platform.

Regarding your recent workspace application for "${orgName}": at this time, the application could not be automatically approved based on the submitted details.

If you have additional requirements, would like custom integration support, or have questions regarding our platform, please reach out directly:
- Telegram / Phone: +855 68 427 420
- Email: chimtheara93@gmail.com

Best regards,
Chim Theara (ជឺម ធារ៉ា)
Theara AI Support Platform`;

      htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #f1f5f9; padding: 24px 16px; margin: 0; }
    .card { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; padding: 32px 24px; }
    h2 { color: #ffffff; margin-top: 0; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
    .box { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Application Status Update</h2>
    <p>Hello ${contactName || 'there'},</p>
    <p>Thank you for submitting an application for an AI Assistant Workspace for <strong>${orgName}</strong>.</p>
    <p>After review, we could not automatically approve this application with the information provided.</p>
    <div class="box">
      <p style="margin: 0; color: #cbd5e1; font-size: 13px;">
        If you would like to discuss custom enterprise setup, self-hosted deployment, or provide further details, please reach out directly via Telegram or Email:
      </p>
      <p style="margin: 8px 0 0 0; color: #38bdf8; font-weight: 600; font-size: 13px;">
        Email: chimtheara93@gmail.com | Phone / Telegram: +855 68 427 420
      </p>
    </div>
    <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Chim Theara • Theara AI Support Platform</p>
  </div>
</body>
</html>
      `;
    }

    // Try sending via Resend API if API Key is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailDelivered = false;
    let providerError = null;

    if (resendApiKey) {
      try {
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'Theara AI Support <onboarding@resend.dev>';
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [email],
            subject,
            html: htmlContent,
            text: textContent,
          }),
        });

        if (resendRes.ok) {
          emailDelivered = true;
        } else {
          const errData = await resendRes.json();
          providerError = errData?.message || 'Resend API returned non-200';
          console.warn('Resend API error:', providerError);
        }
      } catch (err: any) {
        providerError = err?.message;
        console.warn('Failed to call Resend API:', err);
      }
    }

    // Build standard mailto fallback link so admin can also 1-click send in Gmail / mail app
    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(textContent)}`;

    return NextResponse.json({
      success: true,
      delivered: emailDelivered,
      provider: resendApiKey ? 'Resend' : 'mailto_ready',
      providerError,
      subject,
      textContent,
      htmlContent,
      mailtoUrl,
      tempPassword: action === 'APPROVE' ? body.tempPassword || 'Auto-Generated' : undefined,
    });
  } catch (error: any) {
    console.error('Onboarding notify error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
