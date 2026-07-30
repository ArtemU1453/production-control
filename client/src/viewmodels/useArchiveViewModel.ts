import { useEffect, useState } from "react";
import { useServices } from "@/core/di/AppServices";
import type { ArchivedJumbo } from "@/models";

interface ArchiveViewModel {
  loading: boolean;
  archived: ArchivedJumbo[];
}

/**
 * ViewModel for the archive section. The repository is wired and the entity is
 * fully modelled; moving written-off Jumbos here is a later phase, so the list
 * is currently empty and the screen shows its prepared placeholder.
 */
export function useArchiveViewModel(): ArchiveViewModel {
  const { archivedJumbos } = useServices();
  const [loading, setLoading] = useState(true);
  const [archived, setArchived] = useState<ArchivedJumbo[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const items = await archivedJumbos.getAll();
      if (active) {
        setArchived(items);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [archivedJumbos]);

  return { loading, archived };
}
