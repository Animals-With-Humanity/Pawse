import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "../../hooks/useAdminAuth";
import { useToast } from "../../context/ToastContext";
import { getEventConfig, getTicketTypesAdmin } from "../../services/eventService";
import { listEventTickets } from "../../services/ticketService";
import { listCoupons } from "../../services/couponService";
import AdminLogin from "../../components/admin/AdminLogin";
import StatsBar from "../../components/admin/StatsBar";
import GatePanel from "../../components/admin/GatePanel";
import AttendeesPanel from "../../components/admin/AttendeesPanel";
import TicketTypesPanel from "../../components/admin/TicketTypesPanel";
import CouponsPanel from "../../components/admin/CouponsPanel";
import EventSettingsPanel from "../../components/admin/EventSettingsPanel";

const TABS = [
  { id: "gate", label: "🚪 Gate Verification" },
  { id: "attendees", label: "👥 Attendees" },
  { id: "ticketTypes", label: "🎫 Ticket Types" },
  { id: "coupons", label: "🏷️ Coupons" },
  { id: "settings", label: "⚙️ Settings" },
];

export default function AdminPage() {
  const auth = useAdminAuth();
  const showToast = useToast();
  const [tab, setTab] = useState("gate");

  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [ticketTypesLoading, setTicketTypesLoading] = useState(false);
  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [config, setConfig] = useState(null);

  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const data = await listEventTickets(auth.eventId, auth.token);
      setTickets(data.tickets || []);
    } catch {
      showToast("Failed to load attendees", "error");
    } finally {
      setTicketsLoading(false);
    }
  }, [auth.eventId, auth.token, showToast]);

  const loadTicketTypes = useCallback(async () => {
    setTicketTypesLoading(true);
    try {
      const data = await getTicketTypesAdmin(auth.eventId, auth.token);
      setTicketTypes(data.ticketTypes || []);
    } catch {
      showToast("Failed to load ticket types", "error");
    } finally {
      setTicketTypesLoading(false);
    }
  }, [auth.eventId, auth.token, showToast]);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    try {
      const data = await listCoupons(auth.eventId, auth.token);
      setCoupons(data.coupons || []);
    } catch {
      showToast("Failed to load coupons", "error");
    } finally {
      setCouponsLoading(false);
    }
  }, [auth.eventId, auth.token, showToast]);

  const loadConfig = useCallback(async () => {
    try {
      const data = await getEventConfig(auth.eventId);
      setConfig(data.config || null);
    } catch {
      /* non-fatal */
    }
  }, [auth.eventId]);

  useEffect(() => {
    if (!auth.isAuthed) return;
    loadTickets();
    loadTicketTypes();
    loadCoupons();
    loadConfig();
  }, [auth.isAuthed, loadTickets, loadTicketTypes, loadCoupons, loadConfig]);

  if (!auth.isAuthed) {
    return <AdminLogin onLogin={auth.login} loading={auth.loggingIn} error={auth.loginError} />;
  }

  const stats = {
    total: tickets.length,
    used: tickets.filter((t) => t.isUsed).length,
    unused: tickets.filter((t) => !t.isUsed).length,
  };

  return (
    <div className="admin-dashboard">
      <header className="header">
        <div className="header-inner">
          <span className="logo-mark">
            <img className="logo-mark" src="/logo.png" alt="" />
          </span>
          <span className="logo-text">Animals With Humanity — {auth.eventId}</span>
          <div className="admin-header-right">
            <span className="admin-badge">STAFF MODE</span>
            <button className="logout-btn" onClick={auth.logout}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <StatsBar stats={stats} />

        <div className="admin-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={"admin-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "gate" && <GatePanel token={auth.token} eventId={auth.eventId} onVerified={loadTickets} />}
        {tab === "attendees" && <AttendeesPanel tickets={tickets} loading={ticketsLoading} onRefresh={loadTickets} />}
        {tab === "ticketTypes" && (
          <TicketTypesPanel
            token={auth.token}
            eventId={auth.eventId}
            ticketTypes={ticketTypes}
            loading={ticketTypesLoading}
            onRefresh={loadTicketTypes}
            showToast={showToast}
          />
        )}
        {tab === "coupons" && (
          <CouponsPanel
            token={auth.token}
            eventId={auth.eventId}
            coupons={coupons}
            ticketTypes={ticketTypes}
            loading={couponsLoading}
            onRefresh={loadCoupons}
            showToast={showToast}
          />
        )}
        {tab === "settings" && (
          <EventSettingsPanel token={auth.token} eventId={auth.eventId} config={config} onRefresh={loadConfig} showToast={showToast} />
        )}
      </main>
    </div>
  );
}
