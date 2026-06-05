const nodemailer = require("nodemailer");

/**
 * Returns a configured nodemailer transporter dynamically on each call.
 * This ensures that if configurations are hot-reloaded in Super-Admin,
 * the transporter uses the updated credentials without requiring a server reboot.
 */
const getTransporter = () => {
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER || "",
            pass: process.env.EMAIL_PASS || "",
        }
    });
};

/**
 * Sends a 6-digit email OTP verification code.
 * @param {string} email Receiver email address
 * @param {string} otp 6-digit code
 * @returns {Promise<any>}
 */
const sendEmailOtp = async (email, otp) => {
    const transporter = getTransporter();
    
    const mailOptions = {
        from: `"RapidFix Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "RapidFix - Email Verification OTP",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -1px;">RapidFix</span>
                </div>
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; text-align: center; margin-top: 0;">Verify Your Email Address</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #475569;">Hello,</p>
                <p style="font-size: 14px; line-height: 1.6; color: #475569;">To complete verification of your registered email address, please enter the following 6-digit security verification code (OTP):</p>
                
                <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 5px; color: #4f46e5; margin: 25px 0; font-family: monospace;">
                    ${otp}
                </div>
                
                <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-bottom: 25px;">This verification code is valid for exactly <strong>10 minutes</strong>. If you did not initiate this change, you can safely ignore this email.</p>
                
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
                    RapidFix Inc. · Verification Core Services<br>
                    This is an automated security transmission. Do not reply directly.
                </p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendNotificationEmail = async (to, subject, title, bodyHtml) => {
    const transporter = getTransporter();
    
    const mailOptions = {
        from: `"RapidFix Support" <${process.env.EMAIL_USER}>`,
        to: to,
        subject: `RapidFix - ${subject}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 28px; font-weight: 800; color: #4f46e5; letter-spacing: -1px;">RapidFix</span>
                </div>
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; text-align: center; margin-top: 0;">${title}</h2>
                <div style="font-size: 14px; line-height: 1.6; color: #475569; margin: 20px 0;">
                    ${bodyHtml}
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 25px 0;">
                <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0; line-height: 1.4;">
                    RapidFix Inc. · Notification Core Services<br>
                    This is an automated transmission regarding your service request. Do not reply directly.
                </p>
            </div>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendWorkerAcceptedEmail = async (customerEmail, customerName, workerName, problemName) => {
    const title = "Worker is On the Way!";
    const bodyHtml = `
        <p>Dear ${customerName || "Customer"},</p>
        <p>Good news! Your service request <strong>"${problemName}"</strong> has been accepted by our partner, <strong>${workerName}</strong>.</p>
        <p>The worker is now on the way to your location. You can track their status in the application.</p>
    `;
    return sendNotificationEmail(customerEmail, "Worker is on the way", title, bodyHtml);
};

const sendWorkerReachedEmail = async (customerEmail, customerName, workerName, problemName) => {
    const title = "Worker Reached Your Location";
    const bodyHtml = `
        <p>Dear ${customerName || "Customer"},</p>
        <p>Our partner, <strong>${workerName}</strong>, has reached your location for request <strong>"${problemName}"</strong> and has started working.</p>
        <p>The work status is now set to <strong>In Progress</strong>.</p>
    `;
    return sendNotificationEmail(customerEmail, "Worker has arrived", title, bodyHtml);
};

const sendProblemResolvedEmail = async (customerEmail, customerName, workerName, problemName, amount) => {
    const title = "Service Completed & Payment Details";
    const bodyHtml = `
        <p>Dear ${customerName || "Customer"},</p>
        <p>Your service request <strong>"${problemName}"</strong> has been successfully completed by <strong>${workerName}</strong>.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #0f172a; font-size: 15px;">Payment Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                    <td style="color: #64748b; padding: 4px 0;">Service Partner:</td>
                    <td style="text-align: right; font-weight: 600; color: #0f172a;">${workerName}</td>
                </tr>
                <tr>
                    <td style="color: #64748b; padding: 4px 0;">Total Amount Paid:</td>
                    <td style="text-align: right; font-weight: 700; color: #4f46e5; font-size: 16px;">₹${amount}</td>
                </tr>
            </table>
        </div>
        <p>Thank you for choosing RapidFix! If you have any feedback, please log into the app and rate your experience.</p>
    `;
    return sendNotificationEmail(customerEmail, "Service Completed", title, bodyHtml);
};

module.exports = { 
    sendEmailOtp,
    sendWorkerAcceptedEmail,
    sendWorkerReachedEmail,
    sendProblemResolvedEmail
};
