import type { Report } from "../models";

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  attachmentRef?: string;
}

export interface EmailDeliveryResult {
  delivered: boolean;
  /** Explanation when `delivered` is false. */
  reason?: string;
}

/**
 * Email delivery contract. The API is defined now so report auto-send can be
 * wired in a later phase; the default implementation reports that delivery is
 * not yet available rather than performing any network call.
 */
export interface EmailService {
  sendReport(report: Report, recipient: string): Promise<EmailDeliveryResult>;
  send(message: EmailMessage): Promise<EmailDeliveryResult>;
}

const unavailable: EmailDeliveryResult = {
  delivered: false,
  reason: "Отправка по электронной почте будет реализована на следующем этапе.",
};

export function createEmailService(): EmailService {
  return {
    async sendReport() {
      return unavailable;
    },
    async send() {
      return unavailable;
    },
  };
}
