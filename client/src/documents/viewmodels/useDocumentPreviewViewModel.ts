import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { GeneratedDocument } from "../models";

interface DocumentPreviewViewModel {
  loading: boolean;
  document: GeneratedDocument | null;
  resending: boolean;
  resend: () => Promise<void>;
}

/** ViewModel for a saved document: loads it and re-sends the stored artefact. */
export function useDocumentPreviewViewModel(documentId: string): DocumentPreviewViewModel {
  const { documents: center } = useServices();
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<GeneratedDocument | null>(null);
  const [resending, setResending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocument((await center.service.get(documentId)) ?? null);
    } finally {
      setLoading(false);
    }
  }, [center, documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resend = useCallback(async () => {
    if (!document) {
      return;
    }
    setResending(true);
    try {
      await center.service.resend(document.id);
      await load();
    } finally {
      setResending(false);
    }
  }, [center, document, load]);

  return { loading, document, resending, resend };
}
