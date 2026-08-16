import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EventProvider } from "./context/EventContext";
import { ToastProvider } from "./context/ToastContext";
import EventPage from "./pages/Home/EventPage";
import MyTicketsPage from "./pages/MyTickets/MyTicketsPage";
import TicketPage from "./pages/Ticket/TicketPage";
import AdminPage from "./pages/Admin/AdminPage";
import { EVENT_ID } from "./config/app";

/**
 * Routes today are single-event (matching the legacy site). Adding a
 * second simultaneous event later means changing this to
 * `/e/:eventId` and reading eventId from useParams() instead of the
 * EVENT_ID constant — every page below already gets its event data
 * through EventContext/config/app.js, so no page component needs to
 * change for that.
 */
export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <EventProvider eventId={EVENT_ID}>
                <EventPage />
              </EventProvider>
            }
          />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/ticket" element={<TicketPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
