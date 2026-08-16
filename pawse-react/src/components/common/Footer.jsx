export default function Footer({ contactEmail = "team@awhbharat.org" }) {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">PAWSE</div>
        <div className="footer-links">
          <div className="contact-group">
            <a href={`mailto:${contactEmail}`}>Contact</a>
          </div>
        </div>
        <div className="footer-copy">© {new Date().getFullYear()} Animals With Humanity. All rights reserved.</div>
      </div>
    </footer>
  );
}
