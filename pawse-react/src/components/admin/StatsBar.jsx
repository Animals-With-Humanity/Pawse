export default function StatsBar({ stats }) {
  return (
    <div className="stats-bar">
      <div className="stat-chip">
        <div className="stat-val">{stats?.total ?? "—"}</div>
        <div className="stat-lbl">Total Tickets</div>
      </div>
      <div className="stat-chip">
        <div className="stat-val green">{stats?.unused ?? "—"}</div>
        <div className="stat-lbl">Pending Entry</div>
      </div>
      <div className="stat-chip">
        <div className="stat-val orange">{stats?.used ?? "—"}</div>
        <div className="stat-lbl">Checked In</div>
      </div>
    </div>
  );
}
