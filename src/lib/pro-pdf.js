export async function maakProPdf({ titel, dossier, periode, secties, bestand }) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const L = 20, B = 170, H = 297;
    let y = 30;
    const nieuweRegel = (hoogte) => { if (y + hoogte > H - 22) {
        doc.addPage();
        y = 22;
    } };
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(titel, L, y);
    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`${dossier} · ${periode}`, L, y);
    y += 5;
    doc.text(`Geëxporteerd op ${new Date().toLocaleString("nl-NL")}`, L, y);
    y += 10;
    doc.setTextColor(0);
    for (const s of secties) {
        nieuweRegel(16);
        doc.setDrawColor(200);
        doc.line(L, y, L + B, y);
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(s.titel, L, y);
        y += 7;
        if (!s.regels.length) {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(9);
            doc.text("Geen gegevens in deze periode.", L, y);
            y += 7;
            continue;
        }
        for (const r of s.regels) {
            const tekst = doc.splitTextToSize(r.tekst, B);
            nieuweRegel(6 + tekst.length * 4.5 + (r.meta ? 4.5 : 0) + (r.kop ? 5 : 0));
            if (r.meta) {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(110);
                doc.text(r.meta, L, y);
                y += 4.5;
                doc.setTextColor(0);
            }
            if (r.kop) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.text(r.kop, L, y);
                y += 5;
            }
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(tekst, L, y);
            y += tekst.length * 4.5 + 3;
        }
    }
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(`Gegenereerd via Ouderschap & Co op ${new Date().toLocaleDateString("nl-NL")}`, L, H - 10);
        doc.text(`Pagina ${i} van ${n}`, L + B, H - 10, { align: "right" });
    }
    doc.save(bestand);
}
