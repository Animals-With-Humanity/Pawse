export default function EventBanner({ event }) {
  const decorations = event.images?.decorations || [];

  return (
    <section className="hero" style={{ position: "relative", overflow: "visible" }}>
      {decorations.map((src, i) => (
        <img key={src} src={src} alt="" className={`cat-decor cat-${i + 1}`} />
      ))}

      <div className="hero-eyebrow">
        <span className="dot" />
        <span className="date-top" style={{ color: "rgba(255,255,255,0.9)" }}>
          {event.dateShort} | {event.address}
        </span>
        <span className="dot" />
      </div>

      <h1 className="hero-title" style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)" }}>
        <span className="hero-title-line" style={{ color: "#B8F500", WebkitTextStroke: "2px rgba(0,0,0,0.15)" }}>
          {event.tagline}
        </span>
      </h1>

      <a
        href="#book"
        className="cta-btn"
        style={{ marginTop: "2rem", background: "#1565E8", color: "white", fontWeight: 800, letterSpacing: "0.05em" }}
      >
        <span>BOOK YOUR TICKETS NOW!! 🐾</span>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M4 10h12M10 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
