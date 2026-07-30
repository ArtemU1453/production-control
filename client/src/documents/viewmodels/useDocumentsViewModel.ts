import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { GeneratedDocument } from "../models";

interface DocumentsViewModel {
  loading: boolean;
  documents: GeneratedDocument[];
  resendingId: string | null;
  resend: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

/** ViewModel for the documents history: lists generated documents and re-sends
 *  a saved one without regenerating it. */
export function useDocumentsViewModel(): DocumentsViewModel {
  const { documents: center } = useServices();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await center.service.history());
    } finally {
      setLoading(false);
    }
  }, [center]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resend = useCallback(
    async (id: string) => {
      setResendingId(id);
      try {
        await center.service.resend(id);
        await reload();
      } finally {
        setResendingId(null);
      }
    },
    [center, reload],
  );

  return { loading, documents, resendingId, resend, reload };
}
