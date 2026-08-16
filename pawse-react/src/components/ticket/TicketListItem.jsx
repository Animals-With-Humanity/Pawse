import { Link } from "react-router-dom";

export default function TicketListItem({ ticket }) {
  const date = new Date(ticket.createdAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="ticket-item">
      <div className="ticket-info">
        <h4>{ticket.name}</h4>
        <p>ID: {ticket.ticketId}</p>
        <p>
          Booked on: {date}{" "}
          {ticket.isUsed ? <span style={{ color: "var(--red)" }}>(Used)</span> : <span style={{ color: "var(--green)" }}>(Active)</span>}
        </p>
      </div>
      <Link to={`/ticket?id=${ticket.ticketId}`} className="view-btn">
        View Ticket
      </Link>
    </div>
  );
}
