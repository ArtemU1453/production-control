import qrcode from "qrcode-generator";

/**
 * Builds a QR code as a data-URL (GIF) for embedding in an <img>. Self-contained
 * — no network, no external image host. Type number 0 lets the library pick the
 * smallest version that fits the payload; error correction "M" is a good balance
 * for a printed label.
 */
export function qrDataUrl(text: string, cellSize = 4, margin = 2): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createDataURL(cellSize, margin);
}
