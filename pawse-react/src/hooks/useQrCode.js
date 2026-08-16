import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * Renders a QR code onto a canvas. Replaces the legacy pattern of
 * `QRCode.toCanvas(document.getElementById(...))` with a proper React
 * ref so there's no manual DOM lookup / setTimeout race.
 */
export function useQrCode(value) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 140,
      color: { dark: "#000000", light: "#ffffff" },
      margin: 1,
      errorCorrectionLevel: "H",
    }).catch(() => {
      /* non-fatal — ticket still shows without QR if generation fails */
    });
  }, [value]);

  return canvasRef;
}
