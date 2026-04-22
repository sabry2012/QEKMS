import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)


class EmailService:
    """
    Sends transactional emails via SMTP with TLS.

    If SMTP is not configured (host/user/password absent), the email body
    is written to the log at WARNING level so credentials are never silently
    lost in development environments.
    """

    def __init__(
        self,
        host: Optional[str],
        port: int,
        user: Optional[str],
        password: Optional[str],
        sender: str,
        app_url: str,
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.sender = sender
        self.app_url = app_url
        self._configured = bool(host and user and password)

        if not self._configured:
            logger.warning(
                "EmailService: SMTP not configured. "
                "Emails will be logged to stdout only. "
                "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env to enable real delivery."
            )

    def _send(self, to_email: str, subject: str, html_body: str) -> bool:
        """Internal method — sends the email or falls back to logging."""
        if not self._configured:
            logger.warning(
                f"\n{'='*60}\n"
                f"[EMAIL NOT SENT — SMTP NOT CONFIGURED]\n"
                f"To: {to_email}\n"
                f"Subject: {subject}\n"
                f"Body:\n{html_body}\n"
                f"{'='*60}"
            )
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.sender
            msg["To"] = to_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(self.host, self.port, timeout=10) as server:
                server.ehlo()
                server.starttls()
                server.login(self.user, self.password)
                server.sendmail(self.sender, [to_email], msg.as_string())

            logger.info(f"Email sent to {to_email}: {subject}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    # ── Transactional templates ───────────────────────────────────────

    def send_activation_email(
        self,
        to_email: str,
        full_name: str,
        password: str,
        plan: str,
    ) -> bool:
        """
        Send account activation credentials to a newly provisioned user.
        Called automatically when an admin approves a verified client request.
        """
        subject = "Your QEKMS Account Has Been Activated"
        login_url = f"{self.app_url}/login"

        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #0a0c10; color: #e6edf3; margin: 0; padding: 0;">
  <div style="max-width: 600px; margin: 40px auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1d4ed8, #7c3aed); padding: 32px 40px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: 4px; color: white;">Q E K M S</h1>
      <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">Quantum Encryption Key Management System</p>
    </div>

    <!-- Body -->
    <div style="padding: 40px;">
      <h2 style="color: #58a6ff; margin: 0 0 16px; font-size: 20px;">Welcome, {full_name}</h2>
      <p style="color: #8b949e; margin: 0 0 24px; line-height: 1.6;">
        Your QEKMS account has been activated and is ready for use.
        Your subscription plan is <strong style="color: #e6edf3;">{plan.upper()}</strong>.
      </p>

      <!-- Credentials -->
      <div style="background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 12px; font-size: 11px; color: #6e7681; text-transform: uppercase; letter-spacing: 2px; font-weight: 700;">Your Login Credentials</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6e7681; font-size: 13px; width: 120px;">Email</td>
            <td style="padding: 8px 0; color: #e6edf3; font-family: monospace; font-size: 14px;">{to_email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6e7681; font-size: 13px;">Password</td>
            <td style="padding: 8px 0; color: #58a6ff; font-family: monospace; font-size: 16px; font-weight: 700; letter-spacing: 2px;">{password}</td>
          </tr>
        </table>
      </div>

      <div style="background: #1c2128; border: 1px solid #e3b341; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
        <p style="margin: 0; color: #e3b341; font-size: 12px;">
          ⚠️ <strong>Security Notice:</strong> Change your password immediately after first login.
          Do not share these credentials with anyone.
        </p>
      </div>

      <!-- CTA Button -->
      <a href="{login_url}"
         style="display: inline-block; background: #1d4ed8; color: white; text-decoration: none;
                padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px;
                letter-spacing: 1px;">
        Login to QEKMS →
      </a>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 40px; border-top: 1px solid #21262d;">
      <p style="margin: 0; color: #484f58; font-size: 11px; line-height: 1.6;">
        This email was sent by QEKMS Global Security Solutions.<br>
        If you did not request this account, contact your administrator immediately.
      </p>
    </div>
  </div>
</body>
</html>
"""
        return self._send(to_email, subject, html)

    def send_rejection_email(
        self,
        to_email: str,
        full_name: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Notify a client that their access request was not approved."""
        subject = "QEKMS Access Request Update"
        reason_block = (
            f'<p style="color: #8b949e; margin: 0 0 16px;">Reason: <em>{reason}</em></p>'
            if reason else ""
        )
        html = f"""
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #0a0c10; color: #e6edf3; padding: 40px;">
  <div style="max-width: 600px; margin: auto; background: #161b22; border: 1px solid #30363d; border-radius: 12px; overflow: hidden;">
    <div style="background: #1d4ed8; padding: 24px 40px;">
      <h1 style="margin:0; letter-spacing: 4px; color: white;">Q E K M S</h1>
    </div>
    <div style="padding: 40px;">
      <h2 style="color: #f85149; margin: 0 0 16px;">Access Request Not Approved</h2>
      <p style="color: #8b949e; margin: 0 0 16px; line-height: 1.6;">
        Dear {full_name}, your access request to QEKMS could not be approved at this time.
      </p>
      {reason_block}
      <p style="color: #8b949e; margin: 0; line-height: 1.6;">
        Please contact our team if you believe this is an error or to discuss alternative arrangements.
      </p>
    </div>
  </div>
</body>
</html>
"""
        return self._send(to_email, subject, html)

