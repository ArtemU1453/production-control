/** An attachment carried by an email envelope. */
export interface EmailAttachment {
  filename: string;
  mimeType: string;
  content: string;
  sizeBytes: number;
}

/** A fully-addressed email ready to hand to a transport. */
export interface EmailEnvelope {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachment?: EmailAttachment;
}

/** Result of a transport delivery attempt. */
export interface TransportResult {
  delivered: boolean;
  /** Explanation when delivery failed or is simulated. */
  detail?: string;
}
