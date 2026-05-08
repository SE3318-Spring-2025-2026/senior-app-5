import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  onModuleInit() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.error(`SMTP connection failed: ${error.message}`);
      } else {
        this.logger.log('SMTP connection verified — ready to send emails');
      }
    });
  }

  async sendPasswordReset(toEmail: string, token: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"ThesisOS" <${process.env.MAIL_USER}>`,
      to: toEmail,
      subject: 'Password Reset Code',
      html: `
        <p>You requested a password reset for your ThesisOS account.</p>
        <p>Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
        <div style="margin:24px 0;text-align:center">
          <span style="display:inline-block;font-size:36px;font-weight:bold;letter-spacing:12px;color:#1d4ed8;background:#eff6ff;padding:16px 32px;border-radius:12px;border:2px solid #bfdbfe">${token}</span>
        </div>
        <p>Enter this code in the ThesisOS password reset form.</p>
        <p style="color:#6b7280;font-size:12px">If you did not request this, you can safely ignore this email.</p>
      `,
    });

    this.logger.log(`Password reset email sent to ${toEmail}`);
  }
}
