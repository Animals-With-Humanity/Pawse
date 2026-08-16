import html2canvas from "html2canvas";

export async function downloadTicketImage(ticketEl, filename) {
  const canvas = await html2canvas(ticketEl, { backgroundColor: "#0f1217", scale: 2 });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function shareTicketLink({ title, text, url }) {
  if (navigator.share) {
    await navigator.share({ title, text, url });
    return "shared";
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
