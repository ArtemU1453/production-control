import { CollectionRepository } from "../repositories";
import type { KeyValueStore } from "../storage/KeyValueStore";
import { storageKeys } from "../storage/StorageKeys";
import { nowIso } from "../extensions/date";
import { makeId } from "../utilities/id";

export enum QueuedEmailStatus {
  queued = "queued",
  sent = "sent",
  failed = "failed",
}

export interface QueuedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  attachmentRef?: string;
  status: QueuedEmailStatus;
  createdAt: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
  attachmentRef?: string;
}

/**
 * Persistent outbox for report emails. This phase prepares the architecture
 * only: messages can be enqueued and listed, but nothing is sent — the actual
 * delivery is implemented in a later phase via {@link EmailService}.
 */
export interface EmailQueue {
  enqueue(draft: EmailDraft): Promise<QueuedEmail>;
  pending(): Promise<QueuedEmail[]>;
  all(): Promise<QueuedEmail[]>;
}

export function createEmailQueue(store: KeyValueStore): EmailQueue {
  const repository = new CollectionRepository<QueuedEmail>(store, storageKeys.emailQueue);
  return {
    async enqueue(draft) {
      const message: QueuedEmail = {
        ...draft,
        id: makeId(),
        status: QueuedEmailStatus.queued,
        createdAt: nowIso(),
      };
      await repository.save(message);
      return message;
    },
    async pending() {
      const all = await repository.getAll();
      return all.filter((message) => message.status === QueuedEmailStatus.queued);
    },
    async all() {
      return repository.getAll();
    },
  };
}
