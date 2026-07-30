import { useCallback, useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import {
  allReportDefinitions,
  defaultReportFilter,
  ReportKind,
  type ReportFilter,
} from "@/reports";
import type { GeneratedDocument, PdfDocument } from "../models";
import { parseAddresses, partitionAddresses } from "../email/EmailValidation";

interface DocumentComposeViewModel {
  loading: boolean;
  kind: ReportKind;
  setKind: (kind: ReportKind) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  recipients: string;
  setRecipients: (value: string) => void;
  definitions: typeof allReportDefinitions;
  preview: PdfDocument | null;
  building: boolean;
  sending: boolean;
  error: string | null;
  buildPreview: () => Promise<void>;
  send: () => Promise<GeneratedDocument | undefined>;
}

/** ViewModel for manual document composition: pick report type, period and
 *  recipients, preview the PDF, then generate and send it. */
export function useDocumentComposeViewModel(): DocumentComposeViewModel {
  const { documents: center, settings } = useServices();
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<ReportKind>(ReportKind.production);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recipients, setRecipients] = useState("");
  const [cc, setCc] = useState<string[]>([]);
  const [bcc, setBcc] = useState<string[]>([]);
  const [preview, setPreview] = useState<PdfDocument | null>(null);
  const [building, setBuilding] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const current = await settings.load();
      if (!active) {
        return;
      }
      setRecipients(current.reportRecipients);
      setCc(parseAddresses(current.reportCc));
      setBcc(parseAddresses(current.reportBcc));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [settings]);

  const filter = useCallback((): ReportFilter => {
    return {
      ...defaultReportFilter,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
  }, [startDate, endDate]);

  const buildPreview = useCallback(async () => {
    setBuilding(true);
    setError(null);
    try {
      setPreview(await center.service.preview(kind, filter()));
    } finally {
      setBuilding(false);
    }
  }, [center, kind, filter]);

  const send = useCallback(async (): Promise<GeneratedDocument | undefined> => {
    const parsed = parseAddresses(recipients);
    if (parsed.length === 0) {
      setError("Укажите хотя бы одного получателя.");
      return undefined;
    }
    const { invalid } = partitionAddresses(parsed);
    if (invalid.length > 0) {
      setError(`Некорректные адреса: ${invalid.join(", ")}`);
      return undefined;
    }
    setSending(true);
    setError(null);
    try {
      return await center.service.generateAndSend({
        kind,
        filter: filter(),
        recipients: parsed,
        cc,
        bcc,
      });
    } finally {
      setSending(false);
    }
  }, [center, kind, filter, recipients, cc, bcc]);

  return {
    loading,
    kind,
    setKind,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    recipients,
    setRecipients,
    definitions: allReportDefinitions,
    preview,
    building,
    sending,
    error,
    buildPreview,
    send,
  };
}
