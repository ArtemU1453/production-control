import { Route, Switch } from "wouter";
import { AppProviders } from "@/app/providers/AppProviders";
import { TabBar } from "@/components";
import {
  ArchiveView,
  CalculatorView,
  DashboardView,
  HistoryView,
  JumboDetailView,
  MaterialEditorView,
  MaterialsView,
  ProductionView,
  ReceiptView,
  ReportsView,
  SettingsView,
  WarehouseView,
} from "@/views";
import NotFound from "@/pages/not-found";

/** Top-level route table. The tab bar is rendered outside the switch so it
 *  stays persistent across navigation, mirroring a native TabView. */
function AppRouter() {
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

        <Route path="/reports" component={ReportsView} />
        <Route path="/settings" component={SettingsView} />
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
