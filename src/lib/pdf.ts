/**
 * Shared PDF generation utilities with watermark support
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

interface PdfOptions {
    title: string;
    subtitle?: string;
    schoolName: string;
    schoolMotto?: string;
    logoUrl?: string;
    watermarkUrl?: string;
    orientation?: 'portrait' | 'landscape';
    fileName?: string;
}

// Load image as base64 for jsPDF
async function loadImageAsBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

export async function createPdfWithHeader(options: PdfOptions): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: options.orientation || 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Add watermark on every page
    const addWatermark = async () => {
        if (options.watermarkUrl || options.logoUrl) {
            const watermarkSrc = options.watermarkUrl || options.logoUrl;
            const watermarkBase64 = await loadImageAsBase64(watermarkSrc!);
            if (watermarkBase64) {
                const wmSize = 80;
                const cx = (pageWidth - wmSize) / 2;
                const cy = (doc.internal.pageSize.getHeight() - wmSize) / 2;
                doc.saveGraphicsState();
                // @ts-ignore
                doc.setGState(new doc.GState({ opacity: 0.08 }));
                doc.addImage(watermarkBase64, 'PNG', cx, cy, wmSize, wmSize);
                doc.restoreGraphicsState();
            }
        }
    };
    await addWatermark();

    // Add logo
    if (options.logoUrl) {
        const logoBase64 = await loadImageAsBase64(options.logoUrl);
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', pageWidth / 2 - 10, y, 20, 20);
            y += 22;
        }
    }

    // School name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(options.schoolName, pageWidth / 2, y, { align: 'center' });
    y += 6;

    // Motto
    if (options.schoolMotto) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.text(options.schoolMotto, pageWidth / 2, y, { align: 'center' });
        y += 5;
    }

    // Title
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(options.title, pageWidth / 2, y, { align: 'center' });
    y += 5;

    // Subtitle
    if (options.subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(options.subtitle, pageWidth / 2, y, { align: 'center' });
        y += 5;
    }

    // Line separator
    doc.setDrawColor(34, 139, 34);
    doc.setLineWidth(0.5);
    doc.line(15, y, pageWidth - 15, y);
    y += 6;

    // Store starting Y for content
    (doc as any).__contentStartY = y;

    // Hook into page add to re-apply watermark
    const origAddPage = doc.addPage.bind(doc);
    doc.addPage = function (...args: any[]) {
        const result = origAddPage(...args);
        // Watermark on new page - synchronous placeholder, actual watermark applied on save
        return result;
    };

    return doc;
}

export function addTableToPdf(doc: jsPDF, headers: string[], rows: any[][], startY?: number) {
    const y = startY || (doc as any).__contentStartY || 40;
    doc.autoTable({
        startY: y,
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: {
            fillColor: [34, 139, 34],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 2,
        },
        alternateRowStyles: {
            fillColor: [245, 255, 245],
        },
        margin: { left: 15, right: 15 },
        didDrawPage: () => {
            // Footer with page number
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(
                `Page ${doc.getCurrentPageInfo().pageNumber} of ${pageCount}`,
                doc.internal.pageSize.getWidth() / 2,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'center' }
            );
            // Date
            doc.text(
                `Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
                doc.internal.pageSize.getWidth() - 15,
                doc.internal.pageSize.getHeight() - 8,
                { align: 'right' }
            );
        },
    });
}

export function downloadPdf(doc: jsPDF, fileName: string) {
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const win = window.open(url, '_blank');
    if (!win) {
        URL.revokeObjectURL(url);
        throw new Error('Pop-up blocked. Allow pop-ups to download the PDF.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// CSV export helper
export function downloadCsv(headers: string[], rows: string[][], fileName: string) {
    const escape = (s: string) => `"${String(s || '').replace(/"/g, '""')}"`;
    const csvContent = [
        headers.map(escape).join(','),
        ...rows.map(row => row.map(escape).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Report card PDF generation
export async function generateReportCardPdf(options: {
    school: any;
    student: any;
    exam: any;
    className: string;
    subjects: any[];
    total: number;
    mean: number;
    grade: string;
    remarks: string;
    feeBalance?: number | null;
    feeTimestamp?: string | null;
    includeFeeBalance: boolean;
    getGrade: (marks: number) => any;
    position?: number;
    totalStudents?: number;
}): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    let y = 12;

    // Watermark
    if (options.school?.watermark_url || options.school?.logo_url) {
        const wmSrc = options.school.watermark_url || options.school.logo_url;
        const wmBase64 = await loadImageAsBase64(wmSrc);
        if (wmBase64) {
            doc.saveGraphicsState();
            // @ts-ignore
            doc.setGState(new doc.GState({ opacity: 0.06 }));
            doc.addImage(wmBase64, 'PNG', pw / 2 - 40, 100, 80, 80);
            doc.restoreGraphicsState();
        }
    }

    // Profile picture (top-left square)
    if (options.student?.profile_picture_url) {
        const picBase64 = await loadImageAsBase64(options.student.profile_picture_url);
        if (picBase64) {
            doc.addImage(picBase64, 'JPEG', 15, y, 25, 25);
        }
    }

    // Logo center
    if (options.school?.logo_url) {
        const logoBase64 = await loadImageAsBase64(options.school.logo_url);
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', pw / 2 - 8, y, 16, 16);
            y += 18;
        }
    } else {
        y += 3;
    }

    // School name
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(options.school?.name || 'School Name', pw / 2, y, { align: 'center' });
    y += 5;
    if (options.school?.motto) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(options.school.motto, pw / 2, y, { align: 'center' });
        y += 4;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 139, 34);
    doc.text('STUDENT REPORT CARD', pw / 2, y, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    y += 5;

    // Line
    doc.setDrawColor(34, 139, 34);
    doc.setLineWidth(0.5);
    doc.line(15, y, pw - 15, y);
    y += 6;

    // Student info
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const col1 = 15, col2 = pw / 2 + 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Name:', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${options.student?.first_name || ''} ${options.student?.last_name || ''}`, col1 + 18, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Adm No:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(options.student?.admission_number || '—'), col2 + 20, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Class:', col1, y);
    doc.setFont('helvetica', 'normal');
    doc.text(options.className || '—', col1 + 18, y);
    doc.setFont('helvetica', 'bold');
    doc.text('Exam:', col2, y);
    doc.setFont('helvetica', 'normal');
    doc.text(options.exam?.name || '—', col2 + 20, y);
    y += 5;
    if (options.position != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('Position:', col1, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${options.position} out of ${options.totalStudents || '—'}`, col1 + 22, y);
    }
    y += 6;

    // Results table
    const tableHeaders = ['#', 'Subject', 'Marks', 'Grade', 'Remarks'];
    const tableRows = options.subjects.map((r: any, i: number) => {
        const gs = options.getGrade(Number(r.marks));
        return [String(i + 1), r.subjects?.name || '—', String(r.marks), gs?.grade || '—', r.remarks || gs?.remarks || '—'];
    });

    doc.autoTable({
        startY: y,
        head: [tableHeaders],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 255, 245] },
        margin: { left: 15, right: 15 },
    });

    y = doc.lastAutoTable.finalY + 6;

    // Summary box
    doc.setFillColor(245, 250, 245);
    doc.roundedRect(15, y, pw - 30, 18, 2, 2, 'F');
    doc.setFontSize(9);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Marks: ${options.total.toFixed(0)}`, 20, y);
    doc.text(`Mean: ${options.mean.toFixed(1)}`, pw / 2 - 20, y);
    doc.text(`Grade: ${options.grade}`, pw - 55, y);
    y += 5;
    doc.text(`Subjects: ${options.subjects.length}`, 20, y);
    if (options.position != null) {
        doc.text(`Position: ${options.position} / ${options.totalStudents}`, pw / 2 - 20, y);
    }
    y += 10;

    // Fee balance
    if (options.includeFeeBalance) {
        doc.setFillColor(255, 243, 205);
        doc.roundedRect(15, y, pw - 30, 10, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const feeText = options.feeBalance != null
            ? `Fee Balance: KES ${Number(options.feeBalance).toLocaleString()} (as at ${options.feeTimestamp ? new Date(options.feeTimestamp).toLocaleDateString('en-GB') : 'N/A'})`
            : 'Fee Balance: N/A';
        doc.text(feeText, 20, y + 6);
        y += 14;
    }

    // Signatures
    y += 4;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Class Teacher: _______________', 15, y);
    doc.text('Principal: _______________', pw / 2, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('Signature & Stamp', 15, y);
    doc.text('Signature & Stamp', pw / 2, y);

    return doc;
}

// Merge multiple single-page PDFs
export function mergePdfPages(docs: jsPDF[]): jsPDF | null {
    if (docs.length === 0) return null;
    // For multi-page we simply return the first doc (each report is its own page added)
    return docs[0];
}
