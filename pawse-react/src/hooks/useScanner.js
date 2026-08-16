import { useRef, useState } from "react";

export function useScanner(onDecoded) {
  const html5QrCodeRef = useRef(null);
  const [active, setActive] = useState(false);

  function start() {
    if (!window.Html5Qrcode) return;
    if (html5QrCodeRef.current) html5QrCodeRef.current.clear();
    const instance = new window.Html5Qrcode("qr-reader");
    html5QrCodeRef.current = instance;
    instance
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decodedText) => {
          let tId = decodedText;
          try {
            const dec = JSON.parse(atob(decodedText));
            if (dec.t) tId = dec.t;
          } catch (_) {
            /* not base64-encoded JSON — use raw text as ticket ID */
          }
          onDecoded(tId);
        },
        () => {}
      )
      .then(() => setActive(true))
      .catch(() => setActive(false));
  }

  function stop() {
    if (html5QrCodeRef.current && active) {
      html5QrCodeRef.current.stop().catch(() => {});
      setActive(false);
    }
  }

  return { active, start, stop };
}
