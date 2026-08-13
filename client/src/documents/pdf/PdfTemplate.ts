import type { ReportData } from "@/reports";

export interface PdfTemplateOptions {
  companyName?: string;
}

function escapeHtml(value: string | number): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("ru-RU");
}

/** Inline SVG logo so the document is fully self-contained. */
const LOGO = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="6" fill="#2563EB"/><path d="M7 7l10 10M7 17L17 7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="8" r="2" stroke="#fff" stroke-width="1.4"/><circle cx="8" cy="16" r="2" stroke="#fff" stroke-width="1.4"/></svg>`;

/**
 * Single, consistent corporate template for every report. It renders a
 * ReportData into a self-contained, print-ready HTML document with a logo,
 * title, generation date, period, data table, totals, page number and print
 * date. All report kinds share this style.
 */
export function renderReportDocument(report: ReportData, options: PdfTemplateOptions = {}): string {
  const company = options.companyName?.trim() || "Производство";

  const headCells = report.table.columns
    .map(
      (column) =>
        `<th class="${column.numeric ? "num" : ""}">${escapeHtml(column.title)}</th>`,
    )
    .join("");

  const bodyRows = report.table.rows
    .map((row) => {
      const cells = report.table.columns
        .map(
          (column) =>
            `<td class="${column.numeric ? "num" : ""}">${escapeHtml(row.cells[column.key] ?? "")}</td>`,
        )
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const summaryRows = report.summary
    .map(
      (item) =>
        `<tr><td class="k">${escapeHtml(item.label)}</td><td class="v">${escapeHtml(item.value)}</td></tr>`,
    )
    .join("");

  const printDate = new Date().toLocaleString("ru-RU");

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"/>
<title>${escapeHtml(report.title)}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --brand:#2563eb; }
  * { box-sizing: border-box; }
  body { font-family: "DM Sans", Arial, sans-serif; color: var(--ink); margin: 0; padding: 24px; font-size: 12px; }
  .header { display:flex; align-items:center; gap:12px; border-bottom:2px solid var(--brand); padding-bottom:12px; }
  .header .brand { font-weight:700; font-size:15px; }
  .header .meta { margin-left:auto; text-align:right; color:var(--muted); font-size:11px; }
  h1 { font-size:19px; margin:18px 0 4px; }
  .period { color:var(--muted); margin-bottom:14px; }
  table.data { width:100%; border-collapse:collapse; margin-top:8px; }
  table.data th, table.data td { border-bottom:1px solid var(--line); padding:6px 8px; text-align:left; }
  table.data th { background:#f1f5f9; font-weight:600; color:#334155; }
  table.data td.num, table.data th.num { text-align:right; font-variant-numeric: tabular-nums; }
  .summary { margin-top:18px; }
  .summary h2 { font-size:14px; margin:0 0 6px; }
  table.summary-t { border-collapse:collapse; width:60%; }
  table.summary-t td { padding:4px 8px; border-bottom:1px solid var(--line); }
  table.summary-t td.k { color:var(--muted); }
  table.summary-t td.v { text-align:right; font-weight:600; }
  .footer { margin-top:24px; border-top:1px solid var(--line); padding-top:8px; color:var(--muted); font-size:10px; display:flex; justify-content:space-between; }
  @page { margin:16mm; }
  @media print { body { padding:0; } }
</style></head>
<body>
  <div class="header">
    ${LOGO}
    <div><div class="brand">${escapeHtml(company)}</div><div style="color:var(--muted);font-size:11px">Производственная отчётность</div></div>
    <div class="meta">Сформирован: ${escapeHtml(formatDateTime(report.generatedAt))}</div>
  </div>

  <h1>${escapeHtml(report.title)}</h1>
  <div class="period">Период: ${escapeHtml(report.period.label)}</div>

  <table class="data"><thead><tr>${headCells}</tr></thead><tbody>${bodyRows || `<tr><td colspan="${report.table.columns.length}" style="color:var(--muted)">Нет данных за период</td></tr>`}</tbody></table>

  <div class="summary"><h2>Итоговые показатели</h2><table class="summary-t"><tbody>${summaryRows}</tbody></table></div>

  <div class="footer"><span>${escapeHtml(company)}</span><span>Дата печати: ${escapeHtml(printDate)} · Стр. 1</span></div>
</body></html>`;
}
