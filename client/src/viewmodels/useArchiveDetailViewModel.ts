import { useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { ArchivedJumbo } from "@/models";
import type { JumboReportData } from "@/services";

interface ArchiveDetailViewModel {
  loading: boolean;
  archived: ArchivedJumbo | null;
  /** Prepared (render-agnostic) report data for the archived Jumbo. */
  report: JumboReportData | null;
}

/** ViewModel for the archive card: loads one frozen ArchivedJumbo and the
 *  prepared report structure for it. */
export function useArchiveDetailViewModel(archiveId: string): ArchiveDetailViewModel {
  const { archivedJumbos, reportBuilder } = useServices();
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState<ArchivedJumbo | null>(null);
  const [report, setReport] = useState<JumboReportData | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const entry = await archivedJumbos.getById(archiveId);
      if (!active) {
        return;
      }
      setArchived(entry ?? null);
      setReport(entry ? reportBuilder.buildJumboReport(entry) : null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [archiveId, archivedJumbos, reportBuilder]);

  return { loading, archived, report };
}
