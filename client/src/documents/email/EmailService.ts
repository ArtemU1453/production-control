import type { EmailEnvelope, TransportResult } from "../models/Email";
import type { EmailTransport } from "../providers/EmailTransport";
import { partitionAddresses } from "./EmailValidation";

/**
 * Sends report emails through a pluggable {@link EmailTransport}.
 *
 * Before delegating to the transport it enforces the safety checks: at least one
 * recipient, all addresses valid, and an attachment present. Multiple
 * recipients (To/Cc/Bcc) are supported.
 */
export interface EmailService {
  send(envelope: EmailEnvelope): Promise<TransportResult>;
}

export function createEmailService(transport: EmailTransport): EmailService {
  return {
    async send(envelope) {
      if (envelope.to.length === 0) {
        return { delivered: false, detail: "Не указаны получатели." };
      }
      const { invalid } = partitionAddresses([...envelope.to, ...envelope.cc, ...envelope.bcc]);
      if (invalid.length > 0) {
        return { delivered: false, detail: `Некорректные адреса: ${invalid.join(", ")}` };
      }
      if (!envelope.attachment || envelope.attachment.sizeBytes === 0) {
        return { delivered: false, detail: "Отсутствует вложение (PDF не сформирован)." };
      }
      return transport.send(envelope);
    },
  };
}
