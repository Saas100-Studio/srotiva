import { LoadingState } from "../../components/loading-state.tsx";

export default function DashboardLoading() {
  return (
    <section className="dashboard-index">
      <p className="eyebrow">Feeds</p>
      <h1>Workspace</h1>
      <LoadingState label="Loading workspace…" />
    </section>
  );
}
