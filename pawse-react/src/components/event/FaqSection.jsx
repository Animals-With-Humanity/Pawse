import { useState } from "react";

export default function FaqSection({ faq }) {
  const [openIndex, setOpenIndex] = useState(null);
  if (!faq?.length) return null;

  return (
    <section id="FAQ" className="faq-section">
      <h2 className="section-title">Common Questions</h2>
      <div className="faq-list">
        {faq.map((item, i) => (
          <div key={item.q} className={"faq-item" + (openIndex === i ? " open" : "")}>
            <button className="faq-q" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              {item.q} <span className="faq-arrow">↓</span>
            </button>
            <div className="faq-a">{item.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
