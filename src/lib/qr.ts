import "server-only";
import QRCode from "qrcode";

/** QR code en SVG (texte), généré sur le serveur : aucune image externe. */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0f172a", light: "#0000" } });
}
