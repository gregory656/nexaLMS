/**
 * Shared PDF generation utilities with watermark support
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF with lastAutoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => void;
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
    (doc as any).autoTable({
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
    // Chrome asynchronous download engine may fail if ObjectURL is revoked too quickly.
    // Instead of jsPDF's built-in doc.save(), we generate a Blob and use a delayed revocation.
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(url), 10000);
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

    // CRITICAL: Delay URL revocation so Chrome's async download engine
    // doesn't fail silently with "Network Error" or empty files.
    setTimeout(() => URL.revokeObjectURL(url), 10000);
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
    analytics?: {
        history: { examName: string; mean: number; grade?: string }[];
        subjectPerformance: { subject: string; marks: number; grade?: string; classMean?: number }[];
        gradeMix: { grade: string; count: number }[];
        strengths: string[];
        focus: string[];
        advice: string;
        classMean?: number;
        improvement?: number | null;
    };
    theme?: string;
    classTeacherName?: string;
    principalName?: string;
    classTeacherRemarks?: string;
    principalRemarks?: string;
    prediction?: string;
    closingDate?: string;
    openingDate?: string;
    upcomingEvents?: string;
    reportVersion?: number;
    schoolUsername?: string;
    multiExamSummary?: {
        examNames: string[];
        examLabels?: string[];
        rows: { subject: string; marks: (number | null)[]; average?: number | null; movement?: number | null }[];
        includeAverage: boolean;
    };
}): Promise<jsPDF> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    let y = 10;

    const dash = '-';
    const safeText = (value: any, fallback = dash) => {
        const text = value == null || value === '' ? fallback : String(value);
        return text.replace(/â€”/g, '-').replace(/â†’/g, '->');
    };
    const truncateText = (value: any, max = 28) => {
        const text = safeText(value, '');
        return text.length > max ? `${text.slice(0, max - 3)}...` : text;
    };
    const cbcLevel = (marks: number | null | undefined) => {
        if (marks == null || Number.isNaN(Number(marks))) {
            return { level: '-', points: '0', label: 'Not Completed' };
        }
        const mark = Number(marks);
        if (mark >= 90) return { level: 'EE1', points: '8', label: 'Exceeding Expectations' };
        if (mark >= 75) return { level: 'EE2', points: '7', label: 'Exceeding Expectations' };
        if (mark >= 58) return { level: 'ME1', points: '6', label: 'Meeting Expectations' };
        if (mark >= 42) return { level: 'ME2', points: '5', label: 'Meeting Expectations' };
        if (mark >= 31) return { level: 'AE2', points: '4', label: 'Approaching Expectations' };
        if (mark >= 21) return { level: 'AE1', points: '3', label: 'Approaching Expectations' };
        if (mark >= 11) return { level: 'BE2', points: '2', label: 'Below Expectations' };
        return { level: 'BE1', points: '1', label: 'Below Expectations' };
    };
    const drawPerformanceChart = (chartY: number) => {
        const chartX = 14;
        const chartW = pw - 28;
        const chartH = 22;
        const plotX = chartX + 10;
        const plotY = chartY + 5;
        const plotW = chartW - 17;
        const plotH = chartH - 11;
        const rows = options.subjects.slice(0, 9);
        const shortName = (value: string) => safeText(value).replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || '-';

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(215, 222, 232);
        doc.roundedRect(chartX, chartY, chartW, chartH, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text('Subject Performance Graph', chartX + 4, chartY + 4.2);

        doc.setDrawColor(205, 214, 226);
        doc.setLineWidth(0.25);
        [25, 50, 75, 100].forEach((tick) => {
            const tickY = plotY + plotH - (tick / 100) * plotH;
            doc.line(plotX, tickY, plotX + plotW, tickY);
        });

        doc.setDrawColor(72, 84, 101);
        doc.setLineWidth(0.45);
        doc.line(plotX, plotY, plotX, plotY + plotH);
        doc.line(plotX, plotY + plotH, plotX + plotW, plotY + plotH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.4);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text('Y', plotX - 5, plotY + 2);
        doc.text('X', plotX + plotW + 2, plotY + plotH + 1.5);
        doc.text('100', plotX - 8, plotY + 1.5);
        doc.text('0', plotX - 4, plotY + plotH + 1.5);

        const slot = plotW / Math.max(rows.length, 1);
        const points: { x: number; y: number; mark: number }[] = [];
        rows.forEach((row: any, index: number) => {
            const mark = row.marks == null || row.marks === '' ? null : Number(row.marks);
            const cx = plotX + slot * index + slot / 2;
            doc.setFontSize(4.8);
            doc.setTextColor(muted[0], muted[1], muted[2]);
            doc.text(shortName(row.subjects?.name || row.subject_name), cx, plotY + plotH + 4, { align: 'center' });
            if (mark == null || Number.isNaN(mark)) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(185, 28, 28);
                doc.text('X', cx, plotY + plotH - 2, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                return;
            }
            const yPoint = plotY + plotH - (Math.max(0, Math.min(100, mark)) / 100) * plotH;
            points.push({ x: cx, y: yPoint, mark });
            const barW = Math.min(7, slot * 0.45);
            doc.setFillColor(42, 157, 143);
            doc.roundedRect(cx - barW / 2, yPoint, barW, plotY + plotH - yPoint, 0.8, 0.8, 'F');
            if (row.classMean != null) {
                const meanY = plotY + plotH - (Math.max(0, Math.min(100, Number(row.classMean))) / 100) * plotH;
                doc.setDrawColor(245, 158, 11);
                doc.line(cx - barW / 2, meanY, cx + barW / 2, meanY);
            }
        });

        if (points.length > 1) {
            doc.setDrawColor(primary[0], primary[1], primary[2]);
            doc.setLineWidth(0.65);
            points.forEach((point, index) => {
                if (index > 0) doc.line(points[index - 1].x, points[index - 1].y, point.x, point.y);
                doc.setFillColor(255, 255, 255);
                doc.circle(point.x, point.y, 1.3, 'F');
                doc.setFillColor(primary[0], primary[1], primary[2]);
                doc.circle(point.x, point.y, 0.8, 'F');
            });
        }

        doc.setFillColor(42, 157, 143);
        doc.rect(chartX + chartW - 44, chartY + 2.5, 4, 2, 'F');
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.setFontSize(5.4);
        doc.text('Learner', chartX + chartW - 38, chartY + 4.3);
        doc.setDrawColor(245, 158, 11);
        doc.line(chartX + chartW - 21, chartY + 3.5, chartX + chartW - 16, chartY + 3.5);
        doc.text('Class avg', chartX + chartW - 14, chartY + 4.3);
    };
    const themeFill = () => {
        const palette: Record<string, [number, number, number]> = {
            Cream: [255, 253, 240],
            'Light Blue': [240, 248, 255],
            'Soft Green': [240, 255, 240],
            'Light Pink': [255, 240, 245],
            'Light Grey': [248, 249, 250],
        };
        const fill = palette[options.theme || ''];
        if (fill) {
            doc.setFillColor(fill[0], fill[1], fill[2]);
            doc.rect(0, 0, pw, ph, 'F');
        }
    };
    themeFill();

    const primary: [number, number, number] = [18, 94, 82];
    const ink: [number, number, number] = [25, 32, 45];
    const muted: [number, number, number] = [90, 102, 118];
    const verificationCode = Math.random().toString(36).slice(2, 10).toUpperCase();

    if (options.school?.watermark_url || options.school?.logo_url) {
        const wmBase64 = await loadImageAsBase64(options.school.watermark_url || options.school.logo_url);
        if (wmBase64) {
            doc.saveGraphicsState();
            // @ts-ignore
            doc.setGState(new doc.GState({ opacity: 0.05 }));
            doc.addImage(wmBase64, 'PNG', pw / 2 - 42, 92, 84, 84);
            doc.restoreGraphicsState();
        }
    }

    if (options.school?.logo_url) {
        const logo = await loadImageAsBase64(options.school.logo_url);
        if (logo) doc.addImage(logo, 'PNG', 14, 9, 21, 21);
    }
    const photoUrl = options.student?.profile_picture_url || options.student?.profile_photo_url;
    if (photoUrl) {
        const photo = await loadImageAsBase64(photoUrl);
        if (photo) doc.addImage(photo, 'JPEG', pw - 34, 9, 20, 23);
    } else {
        doc.setFillColor(234, 239, 245);
        doc.roundedRect(pw - 34, 9, 20, 23, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(120, 130, 145);
        doc.text('PHOTO', pw - 24, 22, { align: 'center' });
    }

    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(safeText(options.school?.name, 'School Name').toUpperCase(), pw / 2, 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    const schoolDetails = [
        options.school?.motto,
        options.schoolUsername ? `App login: ${options.schoolUsername}` : null,
        options.school?.address,
        options.school?.phone,
        options.school?.email,
        options.school?.website,
    ].filter(Boolean).join(' | ');
    doc.text(safeText(schoolDetails, 'School details'), pw / 2, 19, { align: 'center', maxWidth: 130 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text('CBC LEARNER REPORT CARD', pw / 2, 27, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(`${safeText(options.exam?.academic_years?.name)} | ${safeText(options.exam?.terms?.name)} | ${safeText(options.exam?.name)}`, pw / 2, 32, { align: 'center', maxWidth: 135 });
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.45);
    doc.line(14, 35, pw - 14, 35);

    y = 40;
    const fullName = `${safeText(options.student?.first_name, '')} ${safeText(options.student?.last_name, '')}`.trim();
    const classParts = safeText(options.className, 'N/A').split(' ');
    const age = options.student?.date_of_birth ? String(new Date().getFullYear() - new Date(options.student.date_of_birth).getFullYear()) : dash;
    const profileRows = [
        ['Learner', fullName || dash, 'Adm No', safeText(options.student?.admission_number)],
        ['Grade', `${classParts[0] || ''} ${classParts[1] || ''}`.trim() || dash, 'Stream', classParts.slice(2).join(' ') || 'N/A'],
        ['Gender', safeText(options.student?.gender), 'Age', age],
        ['House', safeText(options.student?.houses?.name), 'Class Teacher', dash],
    ];
    (doc as any).autoTable({
        startY: y,
        body: profileRows,
        theme: 'grid',
        styles: { fontSize: 7.4, cellPadding: 1.45, lineColor: [215, 222, 232], lineWidth: 0.1 },
        columnStyles: {
            0: { fontStyle: 'bold', textColor: primary, cellWidth: 24, fillColor: [239, 247, 245] },
            1: { cellWidth: 66 },
            2: { fontStyle: 'bold', textColor: primary, cellWidth: 24, fillColor: [239, 247, 245] },
            3: { cellWidth: 66 },
        },
        margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 5;

    const attemptedSubjects = options.subjects.filter((item: any) => item.marks != null && item.marks !== '').length;
    const meanPoints = attemptedSubjects
        ? options.subjects.reduce((sum: number, item: any) => sum + Number(cbcLevel(item.marks).points || 0), 0) / attemptedSubjects
        : 0;
    const overall = cbcLevel(options.mean);
    const summary = [
        ['Total Marks', options.total.toFixed(0)],
        ['Mean Score', options.mean.toFixed(1)],
        ['Mean Points', meanPoints.toFixed(1)],
        ['Overall Rank', `${options.position || dash}/${options.totalStudents || dash}`],
        ['CBC Grade', overall.level],
        ['Completed', `${attemptedSubjects}/${options.subjects.length || 9}`],
    ];
    const cardW = (pw - 28) / summary.length;
    summary.forEach(([label, value], index) => {
        const x = 14 + index * cardW;
        doc.setFillColor(index % 2 === 0 ? 239 : 247, index % 2 === 0 ? 247 : 250, index % 2 === 0 ? 245 : 252);
        doc.roundedRect(x + 1, y, cardW - 2, 17, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(label, x + cardW / 2, y + 5.6, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(String(value), x + cardW / 2, y + 12.5, { align: 'center' });
    });
    y += 22;

    if (options.multiExamSummary?.rows?.length) {
        const examLabels = options.multiExamSummary.examLabels?.length
            ? options.multiExamSummary.examLabels.slice(0, 3)
            : options.multiExamSummary.examNames.slice(0, 3).map((_, index) => `Test ${index + 1}`);
        const headers = [
            'Learning Area',
            ...examLabels,
            ...(options.multiExamSummary.includeAverage ? ['Avg'] : []),
            'Dev',
        ];
        const rows = options.multiExamSummary.rows.slice(0, 8).map(row => [
            truncateText(row.subject, 18),
            ...row.marks.slice(0, 3).map(mark => mark == null ? 'X' : Number(mark).toFixed(0)),
            ...(options.multiExamSummary?.includeAverage ? [row.average == null ? '-' : Number(row.average).toFixed(1)] : []),
            row.movement == null ? '0' : row.movement > 0 ? '^' : row.movement < 0 ? 'v' : '0',
        ]);
        (doc as any).autoTable({
            startY: y,
            head: [headers],
            body: rows,
            theme: 'grid',
            headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 5.7, halign: 'center' },
            bodyStyles: { fontSize: 5.6, cellPadding: 0.55, textColor: ink, minCellHeight: 2.9 },
            alternateRowStyles: { fillColor: [249, 250, 251] },
            columnStyles: {
                0: { cellWidth: 52, fontStyle: 'bold' },
                1: { cellWidth: 16, halign: 'center' },
                2: { cellWidth: 16, halign: 'center' },
                3: { cellWidth: 16, halign: 'center' },
                4: { cellWidth: options.multiExamSummary.includeAverage ? 16 : 12, halign: 'center' },
                5: { cellWidth: 12, halign: 'center' },
            },
            margin: { left: 14, right: 14 },
            pageBreak: 'avoid',
        });
        y = doc.lastAutoTable.finalY + 2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.6);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        const examMap = options.multiExamSummary.examNames
            .slice(0, 3)
            .map((name, index) => `${examLabels[index]}=${truncateText(name, 25)}`)
            .join(' | ');
        doc.text(doc.splitTextToSize(examMap, pw - 28).slice(0, 2), 14, y + 2);
        y += 5;
    }

    const tableRows = options.subjects.slice(0, options.multiExamSummary?.rows?.length ? 8 : 10).map((result: any) => {
        const hasMark = result.marks != null && result.marks !== '' && !Number.isNaN(Number(result.marks));
        const mark = hasMark ? Number(result.marks) : null;
        const level = cbcLevel(mark);
        const movement = result.movement == null ? '0' : Number(result.movement) > 0 ? '^' : Number(result.movement) < 0 ? 'v' : '0';
        return [
            truncateText(result.subjects?.name || result.subject_name, 18),
            hasMark ? mark!.toFixed(0) : 'X',
            movement,
            level.level,
            result.subjectRank ? `${result.subjectRank}/${result.subjectTotal || options.totalStudents || dash}` : dash,
            truncateText(result.subjectTeacherRemark || result.remarks || level.label, 34),
            truncateText(result.teacher_name, 18),
        ];
    });
    (doc as any).autoTable({
        startY: y,
        head: [['Learning Area', 'Marks', 'Dev', 'Grade', 'Rank', 'Subject TR Remarks', 'Teacher']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: primary, textColor: 255, fontStyle: 'bold', fontSize: 6.1, halign: 'center' },
        bodyStyles: { fontSize: 5.85, cellPadding: 0.75, textColor: ink, overflow: 'linebreak', minCellHeight: 3.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
            0: { cellWidth: 34, fontStyle: 'bold' },
            1: { cellWidth: 13, halign: 'center' },
            2: { cellWidth: 10, halign: 'center' },
            3: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: 16, halign: 'center' },
            5: { cellWidth: 58 },
            6: { cellWidth: 36 },
        },
        margin: { left: 14, right: 14 },
        pageBreak: 'avoid',
    });
    y = doc.lastAutoTable.finalY + 5;

    const marked = options.subjects.filter((item: any) => item.marks != null);
    const sorted = [...marked].sort((a: any, b: any) => Number(b.marks) - Number(a.marks));
    const strongest = sorted[0]?.subjects?.name || sorted[0]?.subject_name || dash;
    const weakest = sorted[sorted.length - 1]?.subjects?.name || sorted[sorted.length - 1]?.subject_name || dash;
    const advice = marked.length
        ? `${fullName || 'Learner'} is strongest in ${strongest} and should give extra attention to ${weakest}. Maintain daily revision and complete all practice tasks.`
        : `${fullName || 'Learner'} has no recorded marks for this assessment. Follow up with the examination office for completion.`;

    if (y > 173) y = 173;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(215, 222, 232);
    doc.roundedRect(14, y, pw - 28, 22, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text('Prediction', 18, y + 5);
    doc.text('Activity Note', 116, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.9);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(doc.splitTextToSize(truncateText(options.prediction || advice, 130), 88).slice(0, 3), 18, y + 10);
    const coText = `CAS supports sports and arts; English supports debate. Rank: ${options.position || dash}/${options.totalStudents || dash}.`;
    doc.text(doc.splitTextToSize(coText, 72).slice(0, 3), 116, y + 10);
    y += 25;

    drawPerformanceChart(Math.min(y, 198));

    const remarksY = 224;
    const cardGap = 6;
    const remarkCardW = (pw - 28 - cardGap) / 2;
    const drawRemarkCard = (x: number, title: string, remark: string, name: string) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(190, 202, 216);
        doc.roundedRect(x, remarksY, remarkCardW, 24, 2, 2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(title, x + 4, remarksY + 4.8);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(5.7);
        doc.setTextColor(ink[0], ink[1], ink[2]);
        const quote = `"${truncateText(remark, 112) || 'No remark generated.'}"`;
        doc.text(doc.splitTextToSize(quote, remarkCardW - 8).slice(0, 3), x + 4, remarksY + 9.5);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.6);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(`Name: ${truncateText(name, 30)}`, x + 4, remarksY + 21);
    };
    drawRemarkCard(14, 'Class TR Remarks', safeText(options.classTeacherRemarks), safeText(options.classTeacherName, 'Class Teacher'));
    drawRemarkCard(14 + remarkCardW + cardGap, 'Principal Remarks', safeText(options.principalRemarks), safeText(options.principalName, 'Principal'));

    const dates = [
        options.closingDate ? `Closing: ${safeText(options.closingDate)}` : '',
        options.openingDate ? `Opening: ${safeText(options.openingDate)}` : '',
        options.upcomingEvents ? `Events: ${safeText(options.upcomingEvents)}` : '',
    ].filter(Boolean).join(' | ');
    if (dates) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(doc.splitTextToSize(dates, pw - 60).slice(0, 2), 14, ph - 20);
    }

    const sigY = 253;
    doc.setFontSize(6.6);
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text('Class TR Sign: ____________________', 14, sigY);
    doc.text('Principal Sign: ____________________', 78, sigY);
    doc.text('Parent/Guardian: ____________________', 138, sigY);
    doc.setDrawColor(180, 190, 205);
    doc.roundedRect(142, 263, 28, 15, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text('SCHOOL STAMP', 156, 272, { align: 'center' });

    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(pw - 30, ph - 25, 16, 16, 1, 1, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text('QR', pw - 22, ph - 15, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(`Verify: ${verificationCode} | School: ${safeText(options.schoolUsername, 'N/A')}`, 14, ph - 14);
    doc.text(`Closing/Opening above | Generated by Nexalms | Report v${options.reportVersion || 2} | ${new Date().toLocaleDateString('en-GB')} | (c) Nexagen Technologies Ltd`, 14, ph - 8);

    return doc;

    // 1. Theme Configuration
    const applyThemeBackground = () => {
        if (!options.theme || options.theme === 'Classic White') return;
        let c = [255, 255, 255];
        if (options.theme === 'Cream') c = [255, 253, 240];
        else if (options.theme === 'Light Blue') c = [240, 248, 255];
        else if (options.theme === 'Soft Green') c = [240, 255, 240];
        else if (options.theme === 'Light Pink') c = [255, 240, 245];
        else if (options.theme === 'Light Grey') c = [248, 249, 250];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(0, 0, pw, doc.internal.pageSize.getHeight(), 'F');
    };
    applyThemeBackground();

    const origAddPage = doc.addPage.bind(doc);
    doc.addPage = function (...args: any[]) {
        const result = origAddPage(...args);
        applyThemeBackground();
        return result;
    };

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

    // Header Area
    // Logo Center
    if (options.school?.logo_url) {
        const logoBase64 = await loadImageAsBase64(options.school.logo_url);
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', pw / 2 - 12, y, 24, 24);
            y += 28;
        }
    } else {
        y += 5;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 40, 50);
    doc.text(options.school?.name || 'School Name', pw / 2, y, { align: 'center' });
    y += 5;
    if (options.school?.motto) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(71, 85, 105);
        doc.text(options.school.motto, pw / 2, y, { align: 'center' });
        y += 5;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${options.exam?.academic_years?.name || '2024'} - ${options.exam?.terms?.name || 'Term'} | ${options.exam?.name || 'Examination'}`, pw / 2, y, { align: 'center' });
    y += 5;

    // QR / Verification Code Placeholder Top Right
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const verifyCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    doc.text(`VERIFY: ${verifyCode}`, pw - 15, 15, { align: 'right' });

    // Line Sep
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y, pw - 15, y);
    y += 5;

    // Student Profile Section
    const pWidth = pw - 30;
    doc.setFillColor(250, 252, 255);
    doc.setDrawColor(200, 210, 225);
    doc.roundedRect(15, y, pWidth, 32, 2, 2, 'FD');

    const profX = 18;
    // Avatar
    if (options.student?.profile_picture_url) {
        const picBase64 = await loadImageAsBase64(options.student.profile_picture_url);
        if (picBase64) doc.addImage(picBase64, 'JPEG', profX, y + 3, 26, 26);
    } else {
        doc.setFillColor(230, 235, 240);
        doc.rect(profX, y + 3, 26, 26, 'F');
        doc.setFontSize(8);
        doc.setTextColor(150, 160, 170);
        doc.text('PHOTO', profX + 13, y + 17, { align: 'center' });
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 40, 50);
    doc.text(`${options.student?.first_name || ''} ${options.student?.last_name || ''}`, profX + 30, y + 8);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 100, 110);
    // Col 1
    doc.text(`Adm No: ${options.student?.admission_number || '—'}`, profX + 30, y + 14);
    doc.text(`Gender: ${options.student?.gender ? options.student.gender.charAt(0).toUpperCase() + options.student.gender.slice(1) : '—'}`, profX + 30, y + 19);
    doc.text(`Age: ${options.student?.date_of_birth ? (new Date().getFullYear() - new Date(options.student.date_of_birth).getFullYear()) : '—'} yrs`, profX + 30, y + 24);

    // Col 2
    const cx2 = profX + 75;
    const parts = options.className ? options.className.split(' ') : [];
    doc.text(`Grade/Class: ${parts[0]} ${parts[1] || ''}`, cx2, y + 14);
    doc.text(`Stream: ${parts.slice(2).join(' ') || 'N/A'}`, cx2, y + 19);
    doc.text(`House: ${options.student?.houses?.name || '—'}`, cx2, y + 24);

    // Col 3
    const cx3 = profX + 130;
    doc.text(`UPI: ${'—'}`, cx3, y + 14); // UPI not in schema
    doc.text(`Teacher: ${'—'}`, cx3, y + 19);

    y += 36;

    // Academic Summary
    doc.setFillColor(242, 248, 242);
    doc.setDrawColor(200, 225, 200);
    doc.roundedRect(15, y, pWidth, 18, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 60, 30);

    const sumW = pWidth / 5;
    doc.text('TOTAL MARKS', 15 + sumW * 0.5, y + 7, { align: 'center' });
    doc.text('MEAN SCORE', 15 + sumW * 1.5, y + 7, { align: 'center' });
    doc.text('OVERALL POS', 15 + sumW * 2.5, y + 7, { align: 'center' });
    doc.text('STREAM POS', 15 + sumW * 3.5, y + 7, { align: 'center' });
    doc.text('GRADE (CBC)', 15 + sumW * 4.5, y + 7, { align: 'center' });

    doc.setFontSize(11);
    doc.text(`${options.total.toFixed(0)}`, 15 + sumW * 0.5, y + 14, { align: 'center' });
    doc.text(`${options.mean.toFixed(1)}`, 15 + sumW * 1.5, y + 14, { align: 'center' });
    doc.text(`${options.position || '—'} / ${options.totalStudents || '—'}`, 15 + sumW * 2.5, y + 14, { align: 'center' });
    doc.text(`${options.position || '—'}`, 15 + sumW * 3.5, y + 14, { align: 'center' });

    // CBC Grade Logic
    let cbc = 'BE1 (1)';
    if (options.mean >= 90) cbc = 'EE1 (8)';
    else if (options.mean >= 75) cbc = 'EE2 (7)';
    else if (options.mean >= 58) cbc = 'ME1 (6)';
    else if (options.mean >= 42) cbc = 'ME2 (5)';
    else if (options.mean >= 31) cbc = 'AE2 (4)';
    else if (options.mean >= 21) cbc = 'AE1 (3)';
    else if (options.mean >= 11) cbc = 'BE2 (2)';
    doc.text(`${cbc}`, 15 + sumW * 4.5, y + 14, { align: 'center' });

    y += 24;

    // Results table
    const tableHeaders = ['LEARNING AREA', 'SCORE %', 'CBC LEVEL', 'TEACHER', 'TR INITIAL', 'PERFORMANCE REMARK'];
    const legacyTableRows = options.subjects.map((r: any) => {
        const mark = Number(r.marks);
        let glvl = 'BE1';
        if (mark >= 90) { glvl = 'EE1'; }
        else if (mark >= 75) { glvl = 'EE2'; }
        else if (mark >= 58) { glvl = 'ME1'; }
        else if (mark >= 42) { glvl = 'ME2'; }
        else if (mark >= 31) { glvl = 'AE2'; }
        else if (mark >= 21) { glvl = 'AE1'; }
        else if (mark >= 11) { glvl = 'BE2'; }

        return [
            r.subjects?.name || '—',
            String(mark),
            `${glvl}`,
            r.teacher_name || '—',
            '-',
            r.remarks || '—'
        ];
    });

    (doc as any).autoTable({
        startY: y,
        head: [tableHeaders],
        body: legacyTableRows,
        theme: 'grid',
        headStyles: { fillColor: [40, 50, 60], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2, textColor: [30, 40, 50] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        styles: { lineColor: [220, 220, 220], lineWidth: 0.1 },
    });

    y = doc.lastAutoTable.finalY + 6;

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

    const ensureSpace = (needed: number) => {
        if (y + needed > 278) {
            doc.addPage();
            y = 16;
        }
    };

    const analytics = options.analytics;
    if (analytics) {
        ensureSpace(130);
        const left = 15;
        const width = pw - 30;
        const chartColors = [
            [16, 185, 129], [59, 130, 246], [245, 158, 11], [239, 68, 68],
            [139, 92, 246], [6, 182, 212], [236, 72, 153], [34, 197, 94],
        ];

        // Main analytics container
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(left, y, width, 126, 3, 3, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(6, 26, 63);
        doc.text('STUDENT PERFORMANCE ANALYTICS', left + 5, y + 7);
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('Comprehensive visual analysis with personalized insights and recommendations', left + 5, y + 11);

        const topY = y + 16;
        const colW = (width - 14) / 3;

        // ─── COLUMN 1: Performance Trend Line Chart ───
        const lineX = left + 5;
        const lineY = topY + 4;
        const lineW = colW - 10;
        const lineH = 35;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text('Performance Trend', lineX, topY);

        // Chart background with gradient effect
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(lineX, lineY, lineW, lineH, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(lineX, lineY, lineW, lineH, 2, 2, 'S');

        // Grid lines
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        for (let i = 1; i <= 4; i++) {
            const gridY = lineY + (lineH / 5) * i;
            doc.line(lineX + 2, gridY, lineX + lineW - 2, gridY);
        }

        const hist = analytics.history.slice(-6);
        if (hist.length > 1) {
            const points = hist.map((item, index) => ({
                x: lineX + 4 + (index / Math.max(hist.length - 1, 1)) * (lineW - 8),
                y: lineY + lineH - 4 - (Math.max(0, Math.min(item.mean, 100)) / 100) * (lineH - 8),
                mean: item.mean,
                grade: item.grade,
            }));

            // Fill area under line
            doc.setFillColor(16, 185, 129, 0.15);
            (doc as any).moveTo(points[0].x, lineY + lineH - 4);
            points.forEach(p => (doc as any).lineTo(p.x, p.y));
            (doc as any).lineTo(points[points.length - 1].x, lineY + lineH - 4);
            (doc as any).closePath();
            (doc as any).fill();

            // Draw line with shadow effect
            doc.setDrawColor(15, 118, 110);
            doc.setLineWidth(1.2);
            points.forEach((point, index) => {
                if (index > 0) doc.line(points[index - 1].x, points[index - 1].y, point.x, point.y);
            });

            // Draw points with glow
            points.forEach((point) => {
                doc.setFillColor(255, 255, 255);
                doc.circle(point.x, point.y, 2.5, 'F');
                doc.setFillColor(16, 185, 129);
                doc.circle(point.x, point.y, 1.5, 'F');
            });

            // Add grade labels
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(6, 26, 63);
            points.forEach((point) => {
                if (point.grade) {
                    doc.text(point.grade, point.x, point.y - 4, { align: 'center' });
                }
            });
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Insufficient data', lineX + lineW / 2, lineY + lineH / 2, { align: 'center' });
        }

        // Trend summary
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);
        const trendText = hist.length > 1
            ? `${hist[0].mean.toFixed(1)} → ${hist[hist.length - 1].mean.toFixed(1)} (${analytics.improvement != null ? (analytics.improvement >= 0 ? '+' : '') + analytics.improvement.toFixed(1) : 'N/A'})`
            : 'N/A';
        doc.text(trendText, lineX, lineY + lineH + 5);

        // ─── COLUMN 2: Subject Comparison Bar Chart ───
        const barX = left + colW + 7;
        const barY = topY + 4;
        const barW = colW - 10;
        const barH = 35;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text('Subject Comparison', barX, topY);

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(barX, barY, barW, barH, 2, 2, 'S');

        const subjectsToShow = analytics.subjectPerformance.slice(0, 5);
        const rowHeight = (barH - 6) / subjectsToShow.length;

        subjectsToShow.forEach((subject, index) => {
            const rowY = barY + 3 + index * rowHeight;
            const barMaxWidth = barW - 45;
            const studentBarWidth = (subject.marks / 100) * barMaxWidth;
            const classBarWidth = ((subject.classMean || subject.marks) / 100) * barMaxWidth;

            // Subject name
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(51, 65, 85);
            doc.text(subject.subject.substring(0, 10), barX + 3, rowY + rowHeight / 2 + 1.5);

            // Track background (very light gray)
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(barX + 28, rowY + 2, barMaxWidth, 4, 1, 1, 'F');

            // Class mean bar (gray background)
            doc.setFillColor(203, 213, 225);
            doc.roundedRect(barX + 28, rowY + 2, Math.max(classBarWidth, 1), 4, 1, 1, 'F');

            // Student bar (colored)
            const color = chartColors[index % chartColors.length];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.roundedRect(barX + 28, rowY + 3, Math.max(studentBarWidth, 1), 2, 0.5, 0.5, 'F');

            // Marks text
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6);
            doc.setTextColor(15, 23, 42);
            doc.text(String(subject.marks), barX + 30 + barMaxWidth, rowY + rowHeight / 2 + 1.5);
        });

        // Legend
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setFillColor(16, 185, 129);
        doc.rect(barX + 28, barY + barH + 2, 6, 2, 'F');
        doc.setTextColor(71, 85, 105);
        doc.text('Student', barX + 36, barY + barH + 3.5);
        doc.setFillColor(203, 213, 225);
        doc.rect(barX + 55, barY + barH + 2, 6, 2, 'F');
        doc.text('Class Avg', barX + 63, barY + barH + 3.5);

        // ─── COLUMN 3: Grade Distribution Donut + Stats ───
        const mixX = left + colW * 2 + 9;
        const mixY = topY + 4;
        const mixW = colW - 10;
        const mixH = 35;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text('Grade Distribution', mixX, topY);

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(mixX, mixY, mixW, mixH, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(mixX, mixY, mixW, mixH, 2, 2, 'S');

        const totalGrades = analytics.gradeMix.reduce((sum, item) => sum + item.count, 0);
        const donutCx = mixX + mixW / 2 - 12;
        const donutCy = mixY + mixH / 2 + 2;
        const donutRadius = 12;
        const donutInnerRadius = 7;

        if (totalGrades > 0) {
            let startAngle = 0;
            analytics.gradeMix.forEach((item, index) => {
                const sliceAngle = (item.count / totalGrades) * 360;
                const color = chartColors[index % chartColors.length];

                // Draw slice
                doc.setFillColor(color[0], color[1], color[2]);
                for (let angle = startAngle; angle < startAngle + sliceAngle; angle += 5) {
                    const rad = (angle * Math.PI) / 180;
                    const x1 = donutCx + Math.cos(rad) * donutInnerRadius;
                    const y1 = donutCy + Math.sin(rad) * donutInnerRadius;
                    const x2 = donutCx + Math.cos(rad) * donutRadius;
                    const y2 = donutCy + Math.sin(rad) * donutRadius;
                    const nextRad = ((angle + 5) * Math.PI) / 180;
                    const x3 = donutCx + Math.cos(nextRad) * donutRadius;
                    const y3 = donutCy + Math.sin(nextRad) * donutRadius;
                    const x4 = donutCx + Math.cos(nextRad) * donutInnerRadius;
                    const y4 = donutCy + Math.sin(nextRad) * donutInnerRadius;
                    (doc as any).moveTo(x1, y1);
                    (doc as any).lineTo(x2, y2);
                    (doc as any).lineTo(x3, y3);
                    (doc as any).lineTo(x4, y4);
                    (doc as any).closePath();
                    (doc as any).fill();
                }
                startAngle += sliceAngle;
            });

            // Center hole
            doc.setFillColor(241, 245, 249);
            doc.circle(donutCx, donutCy, donutInnerRadius, 'F');

            // Center grade
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(6, 26, 63);
            doc.text(options.grade || 'N/A', donutCx, donutCy + 2, { align: 'center' });
        }

        // Stats on the right
        const statsX = mixX + mixW / 2 + 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(71, 85, 105);

        const stats = [
            { label: 'Mean', value: options.mean.toFixed(1) },
            { label: 'Class', value: analytics.classMean != null ? analytics.classMean.toFixed(1) : 'N/A' },
            { label: 'Trend', value: analytics.improvement != null ? `${analytics.improvement >= 0 ? '+' : ''}${analytics.improvement.toFixed(1)}` : 'N/A' },
            { label: 'Rank', value: `${options.position || 'N/A'}/${options.totalStudents || 'N/A'}` },
        ];

        stats.forEach((stat, index) => {
            const statY = mixY + 8 + index * 7;
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(stat.label + ':', statsX, statY);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(stat.value, statsX + 12, statY);
        });

        // ─── SECOND ROW: Performance Meters & Insights ───
        const row2Y = topY + 45;
        const meterWidth = (width - 20) / 4;

        // Performance Meter 1: Overall Score
        const meter1X = left + 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text('Overall Score', meter1X, row2Y);

        const scorePercent = Math.min(options.mean, 100);
        const meterRadius = 10;
        const meterCx = meter1X + meterWidth / 2;
        const meterCy = row2Y + 15;

        // Background arc
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(3);
        doc.circle(meterCx, meterCy, meterRadius, 'S');

        // Colored arc based on score
        const scoreColor = scorePercent >= 80 ? [16, 185, 129] : scorePercent >= 60 ? [59, 130, 246] : scorePercent >= 40 ? [245, 158, 11] : [239, 68, 68];
        doc.setDrawColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        doc.setLineWidth(3);
        const startAngle = 180;
        const endAngle = 180 + (scorePercent / 100) * 180;
        for (let angle = startAngle; angle < endAngle; angle += 5) {
            const rad = (angle * Math.PI) / 180;
            const x = meterCx + Math.cos(rad) * meterRadius;
            const y = meterCy + Math.sin(rad) * meterRadius;
            const nextRad = ((angle + 5) * Math.PI) / 180;
            const nx = meterCx + Math.cos(nextRad) * meterRadius;
            const ny = meterCy + Math.sin(nextRad) * meterRadius;
            doc.line(x, y, nx, ny);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(6, 26, 63);
        doc.text(options.mean.toFixed(0) + '%', meterCx, meterCy + 3, { align: 'center' });

        // Performance Meter 2: Class Standing
        const meter2X = meter1X + meterWidth + 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text('Class Standing', meter2X, row2Y);

        const rankPercent = options.totalStudents ? ((options.totalStudents - (options.position || 0) + 1) / options.totalStudents) * 100 : 50;
        const meter2Cx = meter2X + meterWidth / 2;
        const meter2Cy = row2Y + 15;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(3);
        doc.circle(meter2Cx, meter2Cy, meterRadius, 'S');

        const rankColor = rankPercent >= 80 ? [16, 185, 129] : rankPercent >= 60 ? [59, 130, 246] : rankPercent >= 40 ? [245, 158, 11] : [239, 68, 68];
        doc.setDrawColor(rankColor[0], rankColor[1], rankColor[2]);
        const rankEndAngle = 180 + (rankPercent / 100) * 180;
        for (let angle = startAngle; angle < rankEndAngle; angle += 5) {
            const rad = (angle * Math.PI) / 180;
            const x = meter2Cx + Math.cos(rad) * meterRadius;
            const y = meter2Cy + Math.sin(rad) * meterRadius;
            const nextRad = ((angle + 5) * Math.PI) / 180;
            const nx = meter2Cx + Math.cos(nextRad) * meterRadius;
            const ny = meter2Cy + Math.sin(nextRad) * meterRadius;
            doc.line(x, y, nx, ny);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(6, 26, 63);
        doc.text(`#${options.position || 'N/A'}`, meter2Cx, meter2Cy + 3, { align: 'center' });

        // Performance Meter 3: Consistency
        const meter3X = meter2X + meterWidth + 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text('Consistency', meter3X, row2Y);

        const marks = analytics.subjectPerformance.map(s => s.marks);
        const avgMarks = marks.reduce((a, b) => a + b, 0) / marks.length;
        const variance = marks.reduce((sum, mark) => sum + Math.pow(mark - avgMarks, 2), 0) / marks.length;
        const consistency = Math.max(0, 100 - Math.sqrt(variance));
        const meter3Cx = meter3X + meterWidth / 2;
        const meter3Cy = row2Y + 15;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(3);
        doc.circle(meter3Cx, meter3Cy, meterRadius, 'S');

        const consColor = consistency >= 80 ? [16, 185, 129] : consistency >= 60 ? [59, 130, 246] : consistency >= 40 ? [245, 158, 11] : [239, 68, 68];
        doc.setDrawColor(consColor[0], consColor[1], consColor[2]);
        const consEndAngle = 180 + (consistency / 100) * 180;
        for (let angle = startAngle; angle < consEndAngle; angle += 5) {
            const rad = (angle * Math.PI) / 180;
            const x = meter3Cx + Math.cos(rad) * meterRadius;
            const y = meter3Cy + Math.sin(rad) * meterRadius;
            const nextRad = ((angle + 5) * Math.PI) / 180;
            const nx = meter3Cx + Math.cos(nextRad) * meterRadius;
            const ny = meter3Cy + Math.sin(nextRad) * meterRadius;
            doc.line(x, y, nx, ny);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(6, 26, 63);
        doc.text(consistency.toFixed(0) + '%', meter3Cx, meter3Cy + 3, { align: 'center' });

        // Performance Meter 4: Improvement Potential
        const meter4X = meter3X + meterWidth + 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text('Potential', meter4X, row2Y);

        const potential = Math.min(100, (100 - options.mean) + (analytics.improvement || 0) * 2);
        const meter4Cx = meter4X + meterWidth / 2;
        const meter4Cy = row2Y + 15;

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(3);
        doc.circle(meter4Cx, meter4Cy, meterRadius, 'S');

        const potColor = potential >= 80 ? [16, 185, 129] : potential >= 60 ? [59, 130, 246] : potential >= 40 ? [245, 158, 11] : [239, 68, 68];
        doc.setDrawColor(potColor[0], potColor[1], potColor[2]);
        const potEndAngle = 180 + (potential / 100) * 180;
        for (let angle = startAngle; angle < potEndAngle; angle += 5) {
            const rad = (angle * Math.PI) / 180;
            const x = meter4Cx + Math.cos(rad) * meterRadius;
            const y = meter4Cy + Math.sin(rad) * meterRadius;
            const nextRad = ((angle + 5) * Math.PI) / 180;
            const nx = meter4Cx + Math.cos(nextRad) * meterRadius;
            const ny = meter4Cy + Math.sin(nextRad) * meterRadius;
            doc.line(x, y, nx, ny);
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(6, 26, 63);
        doc.text(potential.toFixed(0) + '%', meter4Cx, meter4Cy + 3, { align: 'center' });

        // ─── THIRD ROW: Insights & Recommendations ───
        const insightsY = row2Y + 32;

        // Strengths card
        doc.setFillColor(236, 253, 245);
        doc.roundedRect(left + 5, insightsY, (width - 20) / 3 - 4, 28, 2, 2, 'F');
        doc.setDrawColor(16, 185, 129);
        doc.roundedRect(left + 5, insightsY, (width - 20) / 3 - 4, 28, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 26, 63);
        doc.text('Strengths', left + 8, insightsY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const strengthText = analytics.strengths.length ? analytics.strengths.join(', ') : 'Identify your strong subjects';
        const strengthLines = doc.splitTextToSize(strengthText, (width - 20) / 3 - 16);
        doc.text(strengthLines.slice(0, 3), left + 8, insightsY + 12);

        // Focus areas card
        const focusX = left + (width - 20) / 3 + 3;
        doc.setFillColor(254, 249, 195);
        doc.roundedRect(focusX, insightsY, (width - 20) / 3 - 4, 28, 2, 2, 'F');
        doc.setDrawColor(245, 158, 11);
        doc.roundedRect(focusX, insightsY, (width - 20) / 3 - 4, 28, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 26, 63);
        doc.text('Focus Areas', focusX + 3, insightsY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const focusText = analytics.focus.length ? analytics.focus.join(', ') : 'Areas needing attention';
        const focusLines = doc.splitTextToSize(focusText, (width - 20) / 3 - 16);
        doc.text(focusLines.slice(0, 3), focusX + 3, insightsY + 12);

        // Personalized advice card
        const adviceX = focusX + (width - 20) / 3 + 3;
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(adviceX, insightsY, (width - 20) / 3 - 4, 28, 2, 2, 'F');
        doc.setDrawColor(59, 130, 246);
        doc.roundedRect(adviceX, insightsY, (width - 20) / 3 - 4, 28, 2, 2, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(6, 26, 63);
        doc.text('Personalized Advice', adviceX + 3, insightsY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const adviceLines = doc.splitTextToSize(analytics.advice || 'Keep working hard!', (width - 20) / 3 - 16);
        doc.text(adviceLines.slice(0, 3), adviceX + 3, insightsY + 12);

        y += 132;
        doc.setTextColor(0, 0, 0);
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
    const merged = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const mergedInternal = merged.internal as any;
    let hasPage = false;

    for (const source of docs) {
        const sourceInternal = source.internal as any;
        if (sourceInternal.collections) {
            mergedInternal.collections = mergedInternal.collections || {};
            Object.entries(sourceInternal.collections).forEach(([key, value]) => {
                if (!mergedInternal.collections[key]) mergedInternal.collections[key] = value;
                else if (typeof value === 'object' && value) {
                    mergedInternal.collections[key] = { ...mergedInternal.collections[key], ...(value as Record<string, unknown>) };
                }
            });
        }
        const pageCount = source.getNumberOfPages();
        for (let page = 1; page <= pageCount; page++) {
            if (hasPage) merged.addPage();
            merged.setPage(merged.getNumberOfPages());
            const currentPage = merged.getCurrentPageInfo().pageNumber;
            const sourcePage = sourceInternal.pages?.[page];
            mergedInternal.pages[currentPage] = Array.isArray(sourcePage) ? [...sourcePage] : sourcePage;
            hasPage = true;
        }
    }

    const totalPages = merged.getNumberOfPages();
    for (let page = 1; page <= totalPages; page++) {
        merged.setPage(page);
        merged.setFont('helvetica', 'normal');
        merged.setFontSize(7);
        merged.setTextColor(90, 102, 118);
        merged.text(`Page ${page} of ${totalPages}`, merged.internal.pageSize.getWidth() / 2, merged.internal.pageSize.getHeight() - 4, { align: 'center' });
    }
    return merged;
}
