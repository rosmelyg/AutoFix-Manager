import nodemailer from 'nodemailer';
import '../utils/LoadEnvConfig.js';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"AutoFix Manager" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    console.log('[EmailService] Correo enviado exitosamente:', info.messageId);
    return info;
  } catch (error) {
    console.error('[EmailService] Error al enviar el correo:', error);
  }
};