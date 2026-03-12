/** Download rows as a CSV file. */
export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = String(row[h] ?? '').replace(/"/g, '""');
                return `"${val}"`;
            }).join(',')
        ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/** Download a table as a PDF using jsPDF + autotable (lazy-loaded). */
export async function exportToPdf(
    title: string,
    columns: string[],
    rows: (string | number | null | undefined)[][]
) {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(130);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 28);
    autoTable(doc, {
        head: [columns],
        body: rows.map(r => r.map(cell => cell ?? '')),
        startY: 35,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [224, 12, 5] },
    });
    const safeName = title.replace(/\s+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`${safeName}_${dateStr}.pdf`);
}
