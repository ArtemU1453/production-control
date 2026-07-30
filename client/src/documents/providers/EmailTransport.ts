import type { EmailEnvelope, TransportResult } from "../models/Email";

/**
 * Pluggable email delivery transport.
 *
 * This is the extension seam for future integrations: an SMTP transport, a REST
 * API transport, or connectors for 1С / ERP / SharePoint each implement this
 * interface and are injected without touching the document or email services.
 * The bundled {@link createLocalEmailTransport} simulates delivery, since a pure
 * client build has no mail server.
 */
export interface EmailTransport {
  readonly name: string;
  send(envelope: EmailEnvelope): Promise<TransportResult>;
}

/** Default transport: records the message as delivered locally (no network). */
export function createLocalEmailTransport(): EmailTransport {
  return {
    name: "local",
    async send(envelope) {
      return {
        delivered: true,
        detail: `Локальная доставка (симуляция): ${envelope.to.length} получат.`,
      };
    },
  };
}
