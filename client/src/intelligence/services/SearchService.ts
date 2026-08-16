import type {
  ArchivedJumboRepository,
  CuttingSessionRepository,
  JumboRepository,
  MaterialRepository,
} from "@/repositories";
import { machineTitle } from "@/models";
import type { GeneratedDocument } from "@/documents/models";
import { formatDateTime } from "@/extensions/date";
import { SearchResultKind, type SearchHit, type SearchResults } from "../models";

export interface SearchServiceDeps {
  jumbos: JumboRepository;
  materials: MaterialRepository;
  archivedJumbos: ArchivedJumboRepository;
  sessions: CuttingSessionRepository;
  documentsHistory: () => Promise<GeneratedDocument[]>;
}

/** Per-category cap so a broad query cannot flood the results list. */
const PER_KIND_LIMIT = 20;

/**
 * Global search across every entity the system stores: Jumbos, orders,
 * materials, operators, documents and the archive. Reads through the existing
 * repositories once and filters in memory.
 */
export interface SearchService {
  search(query: string): Promise<SearchResults>;
}

function contains(haystack: string, q: string): boolean {
  return haystack.toLowerCase().includes(q);
}

export function createSearchService(deps: SearchServiceDeps): SearchService {
  return {
    async search(query) {
      const q = query.trim().toLowerCase();
      if (q.length === 0) {
        return { query, hits: [], total: 0 };
      }

      const [jumbos, materials, archived, sessions, documents] = await Promise.all([
        deps.jumbos.getAll(),
        deps.materials.getAll(),
        deps.archivedJumbos.getAll(),
        deps.sessions.getAll(),
        deps.documentsHistory(),
      ]);

      const hits: SearchHit[] = [];

      for (const jumbo of jumbos) {
        if (contains(`${jumbo.stockNumber} ${jumbo.materialCode} ${jumbo.comment ?? ""}`, q)) {
          hits.push({
            kind: SearchResultKind.jumbo,
            title: `Джамб №${jumbo.stockNumber}`,
            subtitle: `${jumbo.materialCode} · остаток ${Math.round(jumbo.currentRemainderM)} м`,
            href: `/warehouse/${jumbo.id}`,
          });
          if (hits.length >= PER_KIND_LIMIT) break;
        }
      }

      let orderCount = 0;
      for (const session of sessions) {
        const hay = `${session.order.customer} ${session.order.operator} ${session.jumboStockNumber} ${session.materialCode}`;
        if (contains(hay, q)) {
          hits.push({
            kind: SearchResultKind.order,
            title: `${session.order.customer || "Без заказчика"} · Джамб № ${session.jumboStockNumber}`,
            subtitle: `${session.materialCode} · ${machineTitle(session.order.machine)} · ${session.result.total_rolls} рул.`,
            href: "/history",
          });
          if (++orderCount >= PER_KIND_LIMIT) break;
        }
      }

      let materialCount = 0;
      for (const material of materials) {
        if (contains(`${material.code} ${material.name} ${material.manufacturer}`, q)) {
          hits.push({
            kind: SearchResultKind.material,
            title: `${material.code} · ${material.name}`,
            subtitle: material.manufacturer || "—",
            href: `/materials/${material.id}/edit`,
          });
          if (++materialCount >= PER_KIND_LIMIT) break;
        }
      }

      const operators = new Set<string>();
      for (const session of sessions) {
        const name = session.order.operator?.trim();
        if (name && contains(name, q)) {
          operators.add(name);
        }
      }
      for (const name of Array.from(operators).slice(0, PER_KIND_LIMIT)) {
        const orders = sessions.filter((s) => s.order.operator?.trim() === name).length;
        hits.push({
          kind: SearchResultKind.operator,
          title: name,
          subtitle: `Заказов: ${orders}`,
        });
      }

      let docCount = 0;
      for (const document of documents) {
        if (contains(`${document.title} ${document.recipients.join(" ")}`, q)) {
          hits.push({
            kind: SearchResultKind.document,
            title: document.title,
            subtitle: `${formatDateTime(document.createdAt)}`,
            href: `/documents/${document.id}`,
          });
          if (++docCount >= PER_KIND_LIMIT) break;
        }
      }

      let archiveCount = 0;
      for (const entry of archived) {
        if (contains(`${entry.jumbo.stockNumber} ${entry.jumbo.materialCode}`, q)) {
          hits.push({
            kind: SearchResultKind.archive,
            title: `Архив №${entry.jumbo.stockNumber}`,
            subtitle: `${entry.jumbo.materialCode} · ${formatDateTime(entry.archivedAt)}`,
            href: `/archive/${entry.id}`,
          });
          if (++archiveCount >= PER_KIND_LIMIT) break;
        }
      }

      return { query, hits, total: hits.length };
    },
  };
}
