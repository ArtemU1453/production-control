import { Route, Switch } from "wouter";
import { AppProviders } from "@/app/providers/AppProviders";
import { TabBar } from "@/components";
import {
  ArchiveDetailView,
  ArchiveView,
  CalculatorView,
  DashboardView,
  HistoryView,
  JumboDetailView,
  MaterialEditorView,
  MaterialsView,
  ProductionView,
  ReceiptView,
  SettingsView,
  WarehouseView,
} from "@/views";
import { AnalyticsView, ReportPreviewView } from "@/reports/views";
import { allReportKinds, type ReportKind } from "@/reports";
import {
  DocumentComposeView,
  DocumentPreviewView,
  DocumentsView,
} from "@/documents/views";
import { useDocumentScheduler } from "@/documents/viewmodels/useDocumentScheduler";
import { AnalyticsCenterView } from "@/analytics/views";
import {
  AboutView,
  BackupView,
  DiagnosticsView,
  EmailSettingsView,
  GeneralSettingsView,
  LogsView,
  MaintenanceView,
  ProductionSettingsView,
  SecuritySettingsView,
} from "@/admin/views";
import { useAppBootstrap } from "@/admin/viewmodels/useAppBootstrap";
import {
  DecisionsView,
  IntegrationsView,
  NotificationCenterView,
  SearchView,
  SettingsHistoryView,
} from "@/intelligence/views";
import NotFound from "@/pages/not-found";

function isReportKind(value: string): value is ReportKind {
  return (allReportKinds as readonly string[]).includes(value);
}

/** Top-level route table. The tab bar is rendered outside the switch so it
 *  stays persistent across navigation, mirroring a native TabView. */
function AppRouter() {
  useDocumentScheduler();
  useAppBootstrap();
  return (
    <>
      <Switch>
        <Route path="/" component={DashboardView} />
        <Route path="/production" component={ProductionView} />
        <Route path="/calculator" component={CalculatorView} />
        <Route path="/history" component={HistoryView} />

        <Route path="/materials" component={MaterialsView} />
        <Route path="/materials/new">{() => <MaterialEditorView />}</Route>
        <Route path="/materials/:id/edit">
          {(params) => <MaterialEditorView materialId={params.id} />}
        </Route>

        <Route path="/warehouse" component={WarehouseView} />
        <Route path="/warehouse/receipt" component={ReceiptView} />
        <Route path="/warehouse/:id">
          {(params) => <JumboDetailView jumboId={params.id} />}
        </Route>
        <Route path="/archive" component={ArchiveView} />
        <Route path="/archive/:id">
          {(params) => <ArchiveDetailView archiveId={params.id} />}
        </Route>

        <Route path="/reports" component={AnalyticsView} />
        <Route path="/reports/:kind">
          {(params) =>
            isReportKind(params.kind) ? <ReportPreviewView kind={params.kind} /> : <NotFound />
          }
        </Route>

        <Route path="/analytics" component={AnalyticsCenterView} />

        <Route path="/notifications" component={NotificationCenterView} />
        <Route path="/decisions" component={DecisionsView} />
        <Route path="/search" component={SearchView} />

        <Route path="/documents" component={DocumentsView} />
        <Route path="/documents/new" component={DocumentComposeView} />
        <Route path="/documents/:id">
          {(params) => <DocumentPreviewView documentId={params.id} />}
        </Route>

        <Route path="/settings" component={SettingsView} />
        <Route path="/settings/general" component={GeneralSettingsView} />
        <Route path="/settings/production" component={ProductionSettingsView} />
        <Route path="/settings/email" component={EmailSettingsView} />
        <Route path="/settings/security" component={SecuritySettingsView} />
        <Route path="/settings/backup" component={BackupView} />
        <Route path="/settings/maintenance" component={MaintenanceView} />
        <Route path="/settings/diagnostics" component={DiagnosticsView} />
        <Route path="/settings/logs" component={LogsView} />
        <Route path="/settings/history" component={SettingsHistoryView} />
        <Route path="/settings/integrations" component={IntegrationsView} />
        <Route path="/settings/about" component={AboutView} />
        <Route component={NotFound} />
      </Switch>
      <TabBar />
    </>
  );
}

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
