import { useEvent } from "../../context/EventContext";
import ThemeProvider from "../../context/ThemeProvider";
import Header from "../../components/common/Header";
import EventBanner from "../../components/event/EventBanner";
import EventDetails from "../../components/event/EventDetails";
import BookingForm from "../../components/event/BookingForm";
import FaqSection from "../../components/event/FaqSection";
import Footer from "../../components/common/Footer";

/**
 * The generic event landing + booking page. Every piece of content here
 * comes from EventContext (content/config/ticketTypes) — nothing about
 * "Kitty Party" is hardcoded, so a second event reuses this file as-is.
 */
export default function EventPage() {
  const { content, status } = useEvent();

  if (status.contentLoading) {
    return <div className="page-loader-inline">Loading event...</div>;
  }
  if (status.error || !content) {
    return <div className="page-loader-inline">Could not load this event. {status.error}</div>;
  }

  return (
    <ThemeProvider theme={content.theme}>
      <Header />
      <EventBanner event={content} />

      <section className="booking-section" id="book">
        <h2 className="section-title" style={{ color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
          Secure Your Spot 🐾
        </h2>
        <div className="booking-layout">
          <BookingForm />
          <EventDetails event={content} />
        </div>
      </section>

      <FaqSection faq={content.faq} />
      <Footer contactEmail={content.contactEmail} />
    </ThemeProvider>
  );
}
