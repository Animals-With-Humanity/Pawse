import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * The legacy pages each pasted the same ~80 lines of header markup with
 * only the nav links changing slightly. This is that header, generic
 * across events (logo/name still come from brand assets, not event data,
 * since the org — not the event — owns the site header).
 */
export default function Header({ brandName = "PAWSE", orgName = "Animals With Humanity" }) {
  const [open, setOpen] = useState(false);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 50,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          height: 80,
        }}
      >
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
          <img src="/logo.png" alt={`${orgName} Logo`} style={{ height: 40, width: 40, objectFit: "contain" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>
              {brandName}
            </span>
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontSize: "0.6rem",
                fontWeight: 700,
                color: "var(--text)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginTop: 3,
              }}
            >
              {orgName}
            </span>
          </div>
        </Link>

        <nav id="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link
            to="/my-tickets"
            style={{
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 600,
              fontSize: "0.875rem",
              color: "var(--text)",
              textDecoration: "none",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
            }}
          >
            MY TICKETS
          </Link>
          <Link
            to="/#book"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.625rem 1.25rem",
              background: "#B8F500",
              color: "#1a1a1a",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: "0.875rem",
              borderRadius: "9999px",
              textDecoration: "none",
            }}
          >
            BOOK TICKETS
          </Link>
        </nav>

        <button
          id="mobile-menu-toggle"
          aria-label="Toggle Menu"
          onClick={() => setOpen((o) => !o)}
          className={open ? "open" : ""}
          style={{
            display: "none",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 8,
            width: 40,
            height: 40,
          }}
        >
          <span className="bar" style={{ display: "block", width: 22, height: 2, background: "#374151", borderRadius: 2 }} />
          <span className="bar" style={{ display: "block", width: 22, height: 2, background: "#374151", borderRadius: 2 }} />
          <span className="bar" style={{ display: "block", width: 22, height: 2, background: "#374151", borderRadius: 2 }} />
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "1rem 1.5rem 1.5rem",
            background: "rgba(255,255,255,0.97)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            gap: "0.5rem",
          }}
        >
          <Link to="/my-tickets" onClick={() => setOpen(false)} style={mobileLinkStyle}>
            MY TICKETS
          </Link>
          <Link to="/#FAQ" onClick={() => setOpen(false)} style={mobileLinkStyle}>
            FAQ
          </Link>
          <a href="mailto:team@awhbharat.org" style={mobileLinkStyle}>
            Contact
          </a>
          <Link
            to="/#book"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.875rem 1rem",
              background: "#FEF600",
              color: "#1F2937",
              fontFamily: "Montserrat, sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              borderRadius: 12,
              textDecoration: "none",
              marginTop: "0.25rem",
            }}
          >
            BOOK TICKETS
          </Link>
        </div>
      )}
    </header>
  );
}

const mobileLinkStyle = {
  fontFamily: "Montserrat, sans-serif",
  fontWeight: 600,
  fontSize: "0.95rem",
  color: "var(--text)",
  textDecoration: "none",
  padding: "0.875rem 1rem",
  borderRadius: 12,
};
