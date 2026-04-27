const nodemailer = require("nodemailer");

/**
 * Sends a login notification email.
 * Requires SMTP_EMAIL and SMTP_PASSWORD in .env
 */
async function sendLoginEmail(userEmail, userName) {
  const { SMTP_EMAIL, SMTP_PASSWORD } = process.env;

  if (!SMTP_EMAIL || !SMTP_PASSWORD) {
    console.log("Email skipped: SMTP_EMAIL or SMTP_PASSWORD not configured in .env");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: SMTP_EMAIL,
        pass: SMTP_PASSWORD,
      },
    });

    const loginTime = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "full",
      timeStyle: "long"
    });

    const mailOptions = {
      from: `"PureIntake Security" <${SMTP_EMAIL}>`,
      to: userEmail,
      subject: "New login to your PureIntake account",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #22c55e;">PureIntake Security Alert</h2>
          <p>Hi ${userName || 'there'},</p>
          <p>We noticed a successful login to your PureIntake account.</p>
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Time:</strong> ${loginTime} (IST)</p>
          </div>
          <p>If this was you, you can safely ignore this email.</p>
          <p>If you did not authorize this login, please change your password immediately.</p>
          <br/>
          <p style="color: #6b7280; font-size: 12px;">Stay healthy,<br/>The PureIntake Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Login alert email sent to ${userEmail}`);
  } catch (error) {
    console.error("Failed to send login email:", error);
  }
}

module.exports = { sendLoginEmail };
