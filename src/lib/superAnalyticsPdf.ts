/**
 * Super Analytics PDF Generator for NexaLMS — CBC Edition
 * Competency-Based Curriculum: EE1 → BE1 grading throughout.
 * Covers all 13 analytics levels.
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { downloadPdf } from './pdf';

declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => void;
        lastAutoTable: { finalY: number };
    }
}

// ─── CBC Scale (matches pdf.ts + SuperAnalyticsPage.tsx) ──────────────────

const CBC_LEVELS = [
    { level: 'EE1', min: 90, max: 100, label: 'Exceeding Expectations', points: '8' },
    { level: 'EE2', min: 75, max: 89, label: 'Exceeding Expectations', points: '7' },
    { level: 'ME1', min: 58, max: 74, label: 'Meeting Expectations', points: '6' },
    { level: 'ME2', min: 42, max: 57, label: 'Meeting Expectations', points: '5' },
    { level: 'AE2', min: 31, max: 41, label: 'Approaching Expectations', points: '4' },
    { level: 'AE1', min: 21, max: 30, label: 'Approaching Expectations', points: '3' },
    { level: 'BE2', min: 11, max: 20, label: 'Below Expectations', points: '2' },
    { level: 'BE1', min: 0, max: 10, label: 'Below Expectations', points: '1' },
];

// CBC pass-mark = ME2+ (≥42)
const CBC_PASS = 42;
// CBC excellence = EE2+ (≥75)
const CBC_EXCEL = 75;

function cbcLevelOf(marks: number | null | undefined) {
    if (marks == null || isNaN(Number(marks))) return { level: '-', label: 'No Mark', points: '0' };
    const n = Number(marks);
    for (const l of CBC_LEVELS) { if (n >= l.min && n <= l.max) return l; }
    if (n > 100) return CBC_LEVELS[0];
    return CBC_LEVELS[CBC_LEVELS.length - 1];
}

// ─── Colour palette ───────────────────────────────────────────────────────

const P: [number, number, number] = [18, 94, 82];
const INK: [number, number, number] = [15, 23, 42];
const MUTED: [number, number, number] = [100, 116, 139];
const GOLD: [number, number, number] = [245, 158, 11];
const BLUE: [number, number, number] = [59, 130, 246];
const RED: [number, number, number] = [239, 68, 68];
const PURPLE: [number, number, number] = [139, 92, 246];
const GREEN2: [number, number, number] = [5, 150, 105];

// ─── Public interface ──────────────────────────────────────────────────────

export interface SuperAnalyticsData {
    school: any;
    exam: any;
    exams: any[];
    classes: any[];
    students: any[];
    results: any[];
    subjects: any[];
    departments: any[];
    gradeScales?: any[];
    teacherAssignments: any[];
    selectedExamId: string;
    getGrade: (marks: number | null | undefined) => any; // kept for API compat, we resolve CBC internally
}

// ─── Utility helpers ───────────────────────────────────────────────────────

function dash(v: any, fallback = '-'): string {
    if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) return fallback;
    return String(v);
}
function pct(v: number, decimals = 1): string { return isNaN(v) ? '-' : v.toFixed(decimals) + '%'; }
function avg(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ─── Image loader ─────────────────────────────────────────────────────────

async function loadImg(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch { return null; }
}

// ─── Page helpers ──────────────────────────────────────────────────────────

function addPageHeader(doc: jsPDF, title: string, subtitle: string, school: any, pageNum: number): number {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(P[0], P[1], P[2]);
    doc.rect(0, 0, pw, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(title, 14, 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(subtitle, 14, 13);
    doc.text(`${school?.name || 'School'} | CBC Analytics | ${new Date().toLocaleDateString('en-GB')} | Pg ${pageNum}`, pw - 14, 13, { align: 'right' });
    doc.setTextColor(INK[0], INK[1], INK[2]);
    return 22;
}

function sectionTitle(doc: jsPDF, text: string, y: number, color: [number, number, number] = P): number {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(color[0], color[1], color[2], 0.08);
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(14, y, pw - 28, 8, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(text, 17, y + 5.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    return y + 11;
}

function kpiRow(doc: jsPDF, items: { label: string; value: string; color?: [number, number, number] }[], x: number, y: number, totalW: number): number {
    const w = totalW / items.length;
    items.forEach((item, i) => {
        const col = item.color || P;
        doc.setFillColor(col[0], col[1], col[2], 0.06);
        doc.roundedRect(x + i * w + 1, y, w - 2, 14, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(item.label, x + i * w + w / 2, y + 4.5, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(item.value, x + i * w + w / 2, y + 11, { align: 'center' });
    });
    return y + 17;
}

function autoT(doc: jsPDF, head: string[], rows: any[][], y: number, fontSize = 7): number {
    (doc as any).autoTable({
        startY: y,
        head: [head],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: P, textColor: 255, fontStyle: 'bold', fontSize: fontSize - 0.5, halign: 'center' },
        bodyStyles: { fontSize: fontSize - 0.5, cellPadding: 1.4, textColor: INK },
        alternateRowStyles: { fillColor: [245, 253, 250] },
        margin: { left: 14, right: 14 },
        styles: { lineColor: [220, 230, 225], lineWidth: 0.1 },
    });
    return doc.lastAutoTable.finalY + 4;
}

function ensureSpace(doc: jsPDF, needed: number, y: number, headerFn?: () => number): number {
    if (y + needed > doc.internal.pageSize.getHeight() - 12) {
        doc.addPage();
        return headerFn ? headerFn() : 14;
    }
    return y;
}

// CBC level distribution bar (horizontal strip) in PDF
function drawCBCStrip(doc: jsPDF, levelCounts: Record<string, number>, total: number, x: number, y: number, w: number): number {
    if (!total) return y;
    const stripH = 10;
    const labelH = 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text('CBC LEVEL DISTRIBUTION', x, y);
    y += 4;

    const cellW = w / CBC_LEVELS.length;
    const levelColors: Record<string, [number, number, number]> = {
        EE1: [6, 95, 70], EE2: [5, 150, 105],
        ME1: [8, 145, 178], ME2: [99, 102, 241],
        AE2: [217, 119, 6], AE1: [245, 158, 11],
        BE2: [239, 68, 68], BE1: [185, 28, 28],
    };

    CBC_LEVELS.forEach((lvl, i) => {
        const cnt = levelCounts[lvl.level] || 0;
        const col: [number, number, number] = levelColors[lvl.level] || [150, 150, 150];
        const cellX = x + i * cellW;

        doc.setFillColor(col[0], col[1], col[2]);
        doc.roundedRect(cellX + 0.5, y, cellW - 1, stripH, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(255, 255, 255);
        doc.text(lvl.level, cellX + cellW / 2, y + 4, { align: 'center' });
        doc.setFontSize(7.5);
        doc.text(String(cnt), cellX + cellW / 2, y + 8, { align: 'center' });
    });

    y += stripH + 2;

    // Percentages below
    CBC_LEVELS.forEach((lvl, i) => {
        const cnt = levelCounts[lvl.level] || 0;
        const p = total ? (cnt / total * 100).toFixed(0) + '%' : '-';
        const cellX = x + i * cellW;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(p, cellX + cellW / 2, y + labelH - 2, { align: 'center' });
    });

    return y + labelH + 2;
}

// ─── MAIN PDF GENERATOR ────────────────────────────────────────────────────

export async function generateSuperAnalyticsPdf(data: SuperAnalyticsData): Promise<void> {
    const { school, exam, exams, classes, students, results, subjects, departments, teacherAssignments, selectedExamId } = data;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    let pageNum = 1;

    // ── Logo watermark ──
    if (school?.logo_url || school?.watermark_url) {
        const wm = await loadImg(school.watermark_url || school.logo_url);
        if (wm) {
            doc.saveGraphicsState();
            (doc as any).setGState(new (doc as any).GState({ opacity: 0.04 }));
            doc.addImage(wm, 'PNG', pw / 2 - 40, 100, 80, 80);
            doc.restoreGraphicsState();
        }
    }

    // ── Filter results for this exam ──
    const examResults = results.filter(r => r.exam_id === selectedExamId);
    const examStudentIds = [...new Set(examResults.map(r => r.student_id))];
    const examStudents = students.filter(s => examStudentIds.includes(s.id));

    // ── Compute per-student summaries ──
    function studentTotal(sid: string) {
        return examResults.filter(r => r.student_id === sid).reduce((s, r) => s + Number(r.marks || 0), 0);
    }
    function studentMean(sid: string) {
        const sr = examResults.filter(r => r.student_id === sid);
        return sr.length ? avg(sr.map(r => Number(r.marks || 0))) : 0;
    }
    function studentCBC(sid: string) { return cbcLevelOf(studentMean(sid)).level; }

    const rankedStudents = [...examStudents]
        .map(s => ({ ...s, total: studentTotal(s.id), mean: studentMean(s.id), cbcLevel: studentCBC(s.id) }))
        .sort((a, b) => b.total - a.total)
        .map((s, i) => ({ ...s, position: i + 1 }));

    const schoolMean = rankedStudents.length ? avg(rankedStudents.map(s => s.mean)) : 0;
    const schoolCBC = cbcLevelOf(schoolMean);
    const totalCandidates = rankedStudents.length;
    const passCount = rankedStudents.filter(s => s.mean >= CBC_PASS).length;
    const passRateVal = totalCandidates ? (passCount / totalCandidates) * 100 : 0;
    const excelCount = rankedStudents.filter(s => s.mean >= CBC_EXCEL).length;
    const excelRate = totalCandidates ? (excelCount / totalCandidates) * 100 : 0;

    // CBC level counts
    const levelCounts: Record<string, number> = {};
    rankedStudents.forEach(s => { levelCounts[s.cbcLevel] = (levelCounts[s.cbcLevel] || 0) + 1; });

    // Subject mean helper
    function subjectMean(subjectId: string, studentIds?: string[]) {
        const sr = examResults.filter(r => r.subject_id === subjectId && (!studentIds || studentIds.includes(r.student_id)));
        return sr.length ? avg(sr.map(r => Number(r.marks || 0))) : 0;
    }
    function passRate(marks: number[], pm = CBC_PASS): string {
        return marks.length ? pct((marks.filter(m => m >= pm).length / marks.length) * 100) : '-';
    }

    // Class helpers
    function classStudents(classId: string) { return rankedStudents.filter(s => s.class_id === classId); }

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ═══════════════════════════════════════════════════════════════════════
    doc.setFillColor(P[0], P[1], P[2]);
    doc.rect(0, 0, pw, 80, 'F');

    if (school?.logo_url) {
        const logo = await loadImg(school.logo_url);
        if (logo) doc.addImage(logo, 'PNG', pw / 2 - 15, 8, 30, 30);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(school?.name || 'School Name', pw / 2, 50, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(school?.motto || '', pw / 2, 56, { align: 'center' });

    // Gold badge
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.roundedRect(pw / 2 - 55, 62, 110, 12, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('⚡ SUPER ANALYTICS — CBC EDITION', pw / 2, 69.5, { align: 'center' });

    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(exam?.name || 'Examination', pw / 2, 92, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`${exam?.academic_years?.name || ''} | ${exam?.terms?.name || ''}`, pw / 2, 99, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pw / 2, 106, { align: 'center' });

    // CBC scale key on cover
    let keyY = 115;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(P[0], P[1], P[2]);
    doc.text('CBC COMPETENCY LEVELS', pw / 2, keyY, { align: 'center' });
    keyY += 5;
    const keyColW = (pw - 28) / 4;
    CBC_LEVELS.forEach((lvl, i) => {
        const col = i < 4 ? i : i - 4;
        const row = i < 4 ? 0 : 1;
        const kx = 14 + col * keyColW;
        const ky = keyY + row * 12;
        doc.setFillColor(...CBC_LEVELS[i].min >= CBC_PASS ? GREEN2 : RED);
        doc.roundedRect(kx, ky, keyColW - 2, 9, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(`${lvl.level}  ${lvl.min}–${lvl.max}%`, kx + (keyColW - 2) / 2, ky + 6, { align: 'center' });
    });
    keyY += 28;

    // TOC
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(P[0], P[1], P[2]);
    doc.text('TABLE OF CONTENTS', pw / 2, keyY, { align: 'center' });
    keyY += 6;
    [
        'Level 2: School Overview & CBC Level Dashboard',
        'Level 3: Department Analysis',
        'Level 4: Subject Analysis (with CBC levels)',
        'Level 5: Teacher Analysis',
        'Level 6: Class Analysis',
        'Level 7: Stream Analysis',
        'Level 8: Full Student Rankings',
        'Level 10: CBC Level Distribution',
        'Level 11: Improvement & Decline Analysis',
        'Level 12: Target Analysis (ME1+)',
        'Level 13: Special Lists (EE, At-Risk, Top 50)',
    ].forEach((item, i) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(`${i + 1}. ${item}`, 30, keyY);
        keyY += 7;
    });

    doc.setFontSize(7);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text('Powered by NexaLMS Super Analytics Engine — NexaGen Technologies Ltd', pw / 2, 280, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════════════
    // PAGE 2 — SCHOOL OVERVIEW (Level 2)
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    let y = addPageHeader(doc, '⚡ SUPER ANALYTICS — SCHOOL OVERVIEW', `Level 2 | ${exam?.name}`, school, pageNum);

    // KPI strip
    y = kpiRow(doc, [
        { label: 'Total Candidates', value: dash(totalCandidates), color: P },
        { label: 'School Mean Score', value: schoolMean.toFixed(1), color: BLUE },
        { label: 'School CBC Level', value: schoolCBC.level, color: P },
        { label: 'Meeting+ Rate (≥42)', value: pct(passRateVal), color: GREEN2 },
        { label: 'Exceeding Rate (≥75)', value: pct(excelRate), color: GREEN2 },
    ], 14, y, pw - 28);

    y = kpiRow(doc, [
        { label: 'EE1 (≥90)', value: String(levelCounts['EE1'] || 0), color: [6, 95, 70] as [number, number, number] },
        { label: 'EE2 (75-89)', value: String(levelCounts['EE2'] || 0), color: GREEN2 },
        { label: 'ME1 (58-74)', value: String(levelCounts['ME1'] || 0), color: BLUE },
        { label: 'ME2 (42-57)', value: String(levelCounts['ME2'] || 0), color: PURPLE },
        { label: 'AE2 (31-41)', value: String(levelCounts['AE2'] || 0), color: GOLD },
        { label: 'AE1 (21-30)', value: String(levelCounts['AE1'] || 0), color: GOLD },
        { label: 'BE2 (11-20)', value: String(levelCounts['BE2'] || 0), color: RED },
        { label: 'BE1 (0-10)', value: String(levelCounts['BE1'] || 0), color: RED },
    ], 14, y, pw - 28);

    // Visual CBC strip
    y = drawCBCStrip(doc, levelCounts, totalCandidates, 14, y, pw - 28);

    // Class means table
    y = ensureSpace(doc, 50, y, () => { pageNum++; return addPageHeader(doc, '⚡ SCHOOL OVERVIEW (cont.)', `Level 2 | ${exam?.name}`, school, pageNum); });
    y = sectionTitle(doc, 'MEAN SCORE BY CLASS — CBC LEVELS', y);
    const classMeansRows = classes.map(cls => {
        const cs = classStudents(cls.id);
        if (!cs.length) return null;
        const cm = avg(cs.map(s => s.mean));
        const pr = passRate(cs.map(s => s.mean));
        const top = cs[0];
        return [cls.name, String(cs.length), cm.toFixed(1), cbcLevelOf(cm).level, pr,
        top ? `${top.first_name} ${top.last_name}` : '-'];
    }).filter(Boolean).sort((a: any, b: any) => Number(b[2]) - Number(a[2])) as any[][];
    y = autoT(doc, ['Class', 'Students', 'Mean', 'CBC Level', 'Meeting+ Rate', 'Top Student'],
        classMeansRows.length ? classMeansRows : [['No data', '-', '-', '-', '-', '-']], y);

    // Top 10 students
    y = ensureSpace(doc, 55, y, () => { pageNum++; return addPageHeader(doc, '⚡ TOP STUDENTS — SCHOOL', `Level 2 | ${exam?.name}`, school, pageNum); });
    y = sectionTitle(doc, 'TOP 10 STUDENTS — SCHOOL WIDE', y);
    const top10 = rankedStudents.slice(0, 10).map(s => [
        String(s.position), `${s.first_name} ${s.last_name}`,
        classes.find(c => c.id === s.class_id)?.name || '-',
        s.total.toFixed(0), s.mean.toFixed(1), s.cbcLevel,
    ]);
    y = autoT(doc, ['Pos', 'Student', 'Class', 'Total', 'Mean', 'CBC Level'], top10.length ? top10 : [['No data', '-', '-', '-', '-', '-']], y);

    // Bottom 10
    y = ensureSpace(doc, 55, y, () => { pageNum++; return addPageHeader(doc, '⚡ BOTTOM STUDENTS — SCHOOL', `Level 2 | ${exam?.name}`, school, pageNum); });
    y = sectionTitle(doc, 'BOTTOM 10 STUDENTS — SCHOOL WIDE', y, RED);
    const bottom10 = [...rankedStudents].reverse().slice(0, 10).map(s => [
        String(s.position), `${s.first_name} ${s.last_name}`,
        classes.find(c => c.id === s.class_id)?.name || '-',
        s.total.toFixed(0), s.mean.toFixed(1), s.cbcLevel,
    ]);
    y = autoT(doc, ['Pos', 'Student', 'Class', 'Total', 'Mean', 'CBC Level'], bottom10.length ? bottom10 : [['No data', '-', '-', '-', '-', '-']], y);

    // EE students
    const eeStudents = rankedStudents.filter(s => s.mean >= CBC_EXCEL);
    if (eeStudents.length) {
        y = ensureSpace(doc, 30, y, () => { pageNum++; return addPageHeader(doc, '⚡ EXCEEDING EXPECTATIONS', `Level 2 | ${exam?.name}`, school, pageNum); });
        y = sectionTitle(doc, `EXCEEDING EXPECTATIONS STUDENTS — EE1 / EE2 (≥75%)  [${eeStudents.length}]`, y, GREEN2);
        y = autoT(doc, ['#', 'Student', 'Class', 'Mean', 'CBC Level'],
            eeStudents.map((s, i) => [String(i + 1), `${s.first_name} ${s.last_name}`, classes.find(c => c.id === s.class_id)?.name || '-', s.mean.toFixed(1), s.cbcLevel]), y);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 3 — DEPARTMENT ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    if (departments.length > 0) {
        doc.addPage(); pageNum++;
        y = addPageHeader(doc, '⚡ SUPER ANALYTICS — DEPARTMENT ANALYSIS', `Level 3 | ${exam?.name}`, school, pageNum);
        y = sectionTitle(doc, 'DEPARTMENT PERFORMANCE — CBC LEVELS', y);
        const deptRows = departments.map(dept => {
            const deptSubjects = subjects.filter(s => s.department_id === dept.id);
            const deptMarks: number[] = [];
            deptSubjects.forEach(sub => examResults.filter(r => r.subject_id === sub.id).forEach(r => deptMarks.push(Number(r.marks || 0))));
            if (!deptMarks.length) return null;
            const dm = avg(deptMarks);
            return [dept.name, String(deptSubjects.length), String(deptMarks.length), dm.toFixed(1), cbcLevelOf(dm).level, passRate(deptMarks)];
        }).filter(Boolean).sort((a: any, b: any) => Number(b[3]) - Number(a[3])) as any[][];
        y = autoT(doc, ['Department', 'Subjects', 'Entries', 'Mean', 'CBC Level', 'Meeting+ Rate'],
            deptRows.length ? deptRows : [['No data', '-', '-', '-', '-', '-']], y);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 4 — SUBJECT ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — SUBJECT ANALYSIS', `Level 4 | ${exam?.name}`, school, pageNum);
    y = sectionTitle(doc, 'SUBJECT ANALYSIS — STATISTICAL BREAKDOWN WITH CBC LEVELS', y);

    const subjectRows = subjects.map(sub => {
        const sr = examResults.filter(r => r.subject_id === sub.id);
        if (!sr.length) return null;
        const marks = sr.map(r => Number(r.marks || 0));
        const sm = avg(marks);
        const highest = Math.max(...marks);
        const lowest = Math.min(...marks);
        const sorted = [...marks].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        const variance = avg(marks.map(m => (m - sm) ** 2));
        const stdDev = Math.sqrt(variance);
        const pr = passRate(marks);
        const belowME2 = marks.filter(m => m < CBC_PASS).length;
        return [sub.name, String(marks.length), sm.toFixed(1), cbcLevelOf(sm).level,
        String(highest), String(lowest), median.toFixed(1), stdDev.toFixed(1),
        String(highest - lowest), pr, String(belowME2)];
    }).filter(Boolean).sort((a: any, b: any) => Number(b[2]) - Number(a[2])) as any[][];

    y = autoT(doc,
        ['Subject', 'Count', 'Mean', 'CBC Level', 'High', 'Low', 'Median', 'StdDev', 'Range', 'Meet+%', 'Below ME2'],
        subjectRows.length ? subjectRows : [['No data', ...Array(10).fill('-')]], y, 6.5);

    if (subjectRows.length >= 2) {
        y = ensureSpace(doc, 18, y, () => { pageNum++; return addPageHeader(doc, '⚡ SUBJECT ANALYSIS (cont.)', `Level 4 | ${exam?.name}`, school, pageNum); });
        const best = subjectRows[0] as any[];
        const hardest = subjectRows[subjectRows.length - 1] as any[];
        y = kpiRow(doc, [
            { label: 'Best Subject', value: best[0], color: P },
            { label: 'Best Level', value: best[3], color: GREEN2 },
            { label: 'Hardest Subject', value: hardest[0], color: RED },
            { label: 'Hardest Level', value: hardest[3], color: RED },
        ], 14, y, pw - 28);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 5 — TEACHER ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — TEACHER ANALYSIS', `Level 5 | ${exam?.name}`, school, pageNum);
    y = sectionTitle(doc, 'TEACHER PERFORMANCE BY SUBJECT — CBC LEVELS', y);

    const teacherMap: Record<string, any> = {};
    teacherAssignments.forEach((ta: any) => {
        const teacher = ta.teachers;
        if (!teacher) return;
        const key = `${teacher.id}_${ta.subject_id}`;
        if (!teacherMap[key]) {
            const tMarks = examResults.filter(r => r.subject_id === ta.subject_id).map(r => Number(r.marks || 0));
            teacherMap[key] = {
                name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
                subjectName: subjects.find(s => s.id === ta.subject_id)?.name || '-',
                marks: tMarks,
            };
        }
    });

    const teacherRows = Object.values(teacherMap).map(t => {
        if (!t.marks.length) return null;
        const tm = avg(t.marks);
        const pr = passRate(t.marks);
        const exRate = t.marks.length ? pct((t.marks.filter((m: number) => m >= CBC_EXCEL).length / t.marks.length) * 100) : '-';
        const high = Math.max(...t.marks);
        const low = Math.min(...t.marks);
        return [t.name, t.subjectName, String(t.marks.length), tm.toFixed(1), cbcLevelOf(tm).level, pr, exRate, String(high), String(low)];
    }).filter(Boolean).sort((a: any, b: any) => Number(b[3]) - Number(a[3])) as any[][];

    y = autoT(doc,
        ['Teacher', 'Subject', 'Count', 'Mean', 'CBC Level', 'Meet+%', 'Exceed%', 'Highest', 'Lowest'],
        teacherRows.length ? teacherRows : [['No data', ...Array(8).fill('-')]], y, 6.5);

    if (teacherRows.length > 0) {
        const best = teacherRows[0] as any[];
        y = ensureSpace(doc, 18, y, () => { pageNum++; return addPageHeader(doc, '⚡ TEACHER ANALYSIS (cont.)', `Level 5 | ${exam?.name}`, school, pageNum); });
        y = kpiRow(doc, [
            { label: 'Best Teacher', value: best[0], color: GOLD },
            { label: 'Subject', value: best[1], color: GOLD },
            { label: 'Mean Score', value: best[3], color: GOLD },
            { label: 'CBC Level', value: best[4], color: GREEN2 },
            { label: 'Meeting+ Rate', value: best[5], color: P },
        ], 14, y, pw - 28);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 6 — CLASS ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — CLASS ANALYSIS', `Level 6 | ${exam?.name}`, school, pageNum);
    y = sectionTitle(doc, 'CLASS SUMMARY — CBC LEVELS', y);

    const classRows = classes.map(cls => {
        const cs = classStudents(cls.id);
        if (!cs.length) return null;
        const cm = avg(cs.map(s => s.mean));
        const pr = passRate(cs.map(s => s.mean));
        const top = cs[0];
        const bottom = cs[cs.length - 1];
        return [cls.name, String(cs.length), cm.toFixed(1), cbcLevelOf(cm).level, pr,
        top ? `${top.first_name} ${top.last_name}` : '-',
        bottom ? `${bottom.first_name} ${bottom.last_name}` : '-'];
    }).filter(Boolean).sort((a: any, b: any) => Number(b[2]) - Number(a[2])) as any[][];

    y = autoT(doc, ['Class', 'Students', 'Mean', 'CBC Level', 'Meeting+ Rate', 'Top Student', 'Bottom Student'],
        classRows.length ? classRows : [['No data', ...Array(6).fill('-')]], y);

    if (classRows.length >= 2) {
        const bestC = classRows[0] as any[];
        const worstC = classRows[classRows.length - 1] as any[];
        y = ensureSpace(doc, 18, y, () => { pageNum++; return addPageHeader(doc, '⚡ CLASS ANALYSIS (cont.)', `Level 6 | ${exam?.name}`, school, pageNum); });
        y = kpiRow(doc, [
            { label: 'Best Class', value: bestC[0], color: P },
            { label: 'Level', value: bestC[3], color: GREEN2 },
            { label: 'Lowest Class', value: worstC[0], color: RED },
            { label: 'Level', value: worstC[3], color: RED },
        ], 14, y, pw - 28);
    }

    // Per-class subject breakdown
    for (const cls of classes) {
        const cs = classStudents(cls.id);
        if (!cs.length) continue;
        y = ensureSpace(doc, 55, y, () => {
            pageNum++;
            return addPageHeader(doc, `⚡ CLASS: ${cls.name} — SUBJECT BREAKDOWN`, `Level 6 | ${exam?.name}`, school, pageNum);
        });
        const totalCBCHeader = cbcLevelOf(avg(cs.map(s => s.mean))).level;
        y = sectionTitle(doc, `${cls.name} — ${cs.length} Students | Mean CBC: ${totalCBCHeader}`, y);
        const csIds = cs.map(s => s.id);
        const subRows = subjects.map(sub => {
            const sm = subjectMean(sub.id, csIds);
            const sr = examResults.filter(r => r.subject_id === sub.id && csIds.includes(r.student_id));
            if (!sr.length) return null;
            return [sub.name, String(sr.length), sm.toFixed(1), cbcLevelOf(sm).level, passRate(sr.map(r => Number(r.marks || 0)))];
        }).filter(Boolean).sort((a: any, b: any) => Number(b[2]) - Number(a[2])) as any[][];
        y = autoT(doc, ['Subject', 'Count', 'Mean', 'CBC Level', 'Meeting+ Rate'],
            subRows.length ? subRows : [['No data', '-', '-', '-', '-']], y, 6.5);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 7 — STREAM ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    const streams = [...new Set(students.map(s => s.stream_id).filter(Boolean))];
    if (streams.length > 0) {
        doc.addPage(); pageNum++;
        y = addPageHeader(doc, '⚡ SUPER ANALYTICS — STREAM ANALYSIS', `Level 7 | ${exam?.name}`, school, pageNum);
        y = sectionTitle(doc, 'PERFORMANCE BY STREAM — CBC LEVELS', y);
        const streamRows = streams.map(streamId => {
            const ss = rankedStudents.filter(s => s.stream_id === streamId);
            if (!ss.length) return null;
            const sm = avg(ss.map(s => s.mean));
            const streamName = classes.find(c => c.stream_id === streamId)?.streams?.name || `Stream ${String(streamId).slice(0, 6)}`;
            return [streamName, String(ss.length), sm.toFixed(1), cbcLevelOf(sm).level, passRate(ss.map(s => s.mean))];
        }).filter(Boolean).sort((a: any, b: any) => Number(b[2]) - Number(a[2])) as any[][];
        y = autoT(doc, ['Stream', 'Students', 'Mean', 'CBC Level', 'Meeting+ Rate'],
            streamRows.length ? streamRows : [['No data', '-', '-', '-', '-']], y);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 8 — FULL STUDENT RANKINGS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — FULL STUDENT RANKINGS', `Level 8 | ${exam?.name}`, school, pageNum);
    y = sectionTitle(doc, 'COMPLETE STUDENT RANKINGS — ALL CLASSES', y);
    const fullRankRows = rankedStudents.map(s => [
        String(s.position), `${s.first_name} ${s.last_name}`,
        s.admission_number || '-',
        classes.find(c => c.id === s.class_id)?.name || '-',
        s.total.toFixed(0), s.mean.toFixed(1), s.cbcLevel,
    ]);
    y = autoT(doc, ['Pos', 'Student', 'Adm No', 'Class', 'Total', 'Mean', 'CBC Level'],
        fullRankRows.length ? fullRankRows : [['No data', '-', '-', '-', '-', '-', '-']], y, 6);

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 10 — CBC LEVEL DISTRIBUTION
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — CBC LEVEL DISTRIBUTION', `Level 10 | ${exam?.name}`, school, pageNum);
    y = drawCBCStrip(doc, levelCounts, totalCandidates, 14, y + 4, pw - 28);
    y += 6;
    y = sectionTitle(doc, 'FULL CBC LEVEL BREAKDOWN', y);
    const gradeDetailRows = CBC_LEVELS.map(lvl => {
        const cnt = levelCounts[lvl.level] || 0;
        const p = totalCandidates ? (cnt / totalCandidates * 100).toFixed(1) + '%' : '-';
        const status = lvl.min >= CBC_PASS ? 'Meeting+' : 'Below ME2';
        return [lvl.level, lvl.label, `${lvl.min}–${lvl.max}%`, lvl.points, String(cnt), p, status];
    });
    y = autoT(doc, ['CBC Level', 'Description', 'Range', 'Points', 'Count', '% Total', 'Status'], gradeDetailRows, y);

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 11 — IMPROVEMENT ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — IMPROVEMENT ANALYSIS', `Level 11 | ${exam?.name}`, school, pageNum);

    const prevExams = [...exams]
        .filter(e => e.id !== selectedExamId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const prevExam = prevExams[0];

    if (prevExam) {
        const prevResults = results.filter(r => r.exam_id === prevExam.id);
        const improvements: { student: any; prev: number; curr: number; change: number }[] = [];
        rankedStudents.forEach(s => {
            const pr = prevResults.filter(r => r.student_id === s.id);
            if (!pr.length) return;
            const prevMean = avg(pr.map(r => Number(r.marks || 0)));
            improvements.push({ student: s, prev: prevMean, curr: s.mean, change: s.mean - prevMean });
        });

        if (improvements.length) {
            improvements.sort((a, b) => b.change - a.change);
            const improved = improvements.filter(i => i.change > 0).slice(0, 15);
            const declined = improvements.filter(i => i.change < 0).sort((a, b) => a.change - b.change).slice(0, 15);

            y = sectionTitle(doc, `MOST IMPROVED — vs ${prevExam.name} (CBC Level Changes)`, y, P);
            y = autoT(doc, ['#', 'Student', 'Class', 'Prev', 'Prev Level', 'Curr', 'Curr Level', 'Δ'],
                improved.length ? improved.map((i, idx) => [
                    String(idx + 1),
                    `${i.student.first_name} ${i.student.last_name}`,
                    classes.find(c => c.id === i.student.class_id)?.name || '-',
                    i.prev.toFixed(1), cbcLevelOf(i.prev).level,
                    i.curr.toFixed(1), cbcLevelOf(i.curr).level,
                    `+${i.change.toFixed(1)}`,
                ]) : [['No data', '-', '-', '-', '-', '-', '-', '-']], y, 6.5);

            y = ensureSpace(doc, 55, y, () => { pageNum++; return addPageHeader(doc, '⚡ DECLINE ANALYSIS', `Level 11 | ${exam?.name}`, school, pageNum); });
            y = sectionTitle(doc, 'BIGGEST DECLINE — CBC Level Changes', y, RED);
            y = autoT(doc, ['#', 'Student', 'Class', 'Prev', 'Prev Level', 'Curr', 'Curr Level', 'Δ'],
                declined.length ? declined.map((i, idx) => [
                    String(idx + 1),
                    `${i.student.first_name} ${i.student.last_name}`,
                    classes.find(c => c.id === i.student.class_id)?.name || '-',
                    i.prev.toFixed(1), cbcLevelOf(i.prev).level,
                    i.curr.toFixed(1), cbcLevelOf(i.curr).level,
                    i.change.toFixed(1),
                ]) : [['No data', '-', '-', '-', '-', '-', '-', '-']], y, 6.5);

            // Class improvements
            y = ensureSpace(doc, 55, y, () => { pageNum++; return addPageHeader(doc, '⚡ CLASS IMPROVEMENT', `Level 11 | ${exam?.name}`, school, pageNum); });
            y = sectionTitle(doc, 'CLASS IMPROVEMENT vs PREVIOUS EXAM', y, BLUE);
            const classImpRows = classes.map(cls => {
                const cs = classStudents(cls.id);
                if (!cs.length) return null;
                const currM = avg(cs.map(s => s.mean));
                const prevArr = improvements.filter(i => i.student.class_id === cls.id);
                if (!prevArr.length) return null;
                const prevM = avg(prevArr.map(i => i.prev));
                const chg = currM - prevM;
                return [cls.name, prevM.toFixed(1), cbcLevelOf(prevM).level,
                currM.toFixed(1), cbcLevelOf(currM).level,
                (chg >= 0 ? '+' : '') + chg.toFixed(1)];
            }).filter(Boolean).sort((a: any, b: any) => Number(b[5]) - Number(a[5])) as any[][];
            y = autoT(doc, ['Class', 'Prev Mean', 'Prev Level', 'Curr Mean', 'Curr Level', 'Change'],
                classImpRows.length ? classImpRows : [['No data', '-', '-', '-', '-', '-']], y);
        } else {
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
            doc.text('No overlapping student data between exams for improvement analysis.', 14, y + 6);
            y += 14;
        }
    } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text('No previous exam found. Improvement analysis requires at least 2 exams.', 14, y + 6);
        y += 14;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 12 — TARGET ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — TARGET ANALYSIS', `Level 12 | ${exam?.name}`, school, pageNum);
    y = sectionTitle(doc, 'TARGET: ME1 (≥58%) — Meeting Expectations Level 1', y);

    const targetMark = 58;
    const meetTarget = rankedStudents.filter(s => s.mean >= targetMark);
    const belowTarget = rankedStudents.filter(s => s.mean < targetMark);
    y = kpiRow(doc, [
        { label: `At ME1+ (≥${targetMark}%)`, value: String(meetTarget.length), color: P },
        { label: 'Below ME1', value: String(belowTarget.length), color: RED },
        { label: 'ME1+ Hit Rate', value: pct(totalCandidates ? meetTarget.length / totalCandidates * 100 : 0), color: GOLD },
        { label: 'Meeting+ Rate (≥42)', value: pct(passRateVal), color: GREEN2 },
        { label: 'Exceeding Rate (≥75)', value: pct(excelRate), color: GREEN2 },
    ], 14, y, pw - 28);

    y = sectionTitle(doc, 'STUDENTS BELOW ME1 — NEED TARGETED SUPPORT', y, RED);
    const belowRows = belowTarget.slice(0, 40).map((s, i) => [
        String(i + 1),
        `${s.first_name} ${s.last_name}`,
        classes.find(c => c.id === s.class_id)?.name || '-',
        s.mean.toFixed(1), s.cbcLevel,
        (targetMark - s.mean).toFixed(1) + ' marks needed',
    ]);
    y = autoT(doc, ['#', 'Student', 'Class', 'Mean', 'CBC Level', 'Gap to ME1'],
        belowRows.length ? belowRows : [['No data', '-', '-', '-', '-', '-']], y, 6.5);

    // ═══════════════════════════════════════════════════════════════════════
    // LEVEL 13 — SPECIAL LISTS
    // ═══════════════════════════════════════════════════════════════════════
    doc.addPage(); pageNum++;
    y = addPageHeader(doc, '⚡ SUPER ANALYTICS — SPECIAL LISTS', `Level 13 | ${exam?.name}`, school, pageNum);

    // Top 50
    y = sectionTitle(doc, 'TOP 50 STUDENTS — SCHOOL WIDE', y, GOLD);
    const top50 = rankedStudents.slice(0, 50).map(s => [
        String(s.position), `${s.first_name} ${s.last_name}`,
        classes.find(c => c.id === s.class_id)?.name || '-',
        s.mean.toFixed(1), s.cbcLevel,
    ]);
    if (top50.length) y = autoT(doc, ['Pos', 'Student', 'Class', 'Mean', 'CBC Level'], top50, y, 6);

    // Students 51–100
    if (rankedStudents.length > 50) {
        y = ensureSpace(doc, 40, y, () => { pageNum++; return addPageHeader(doc, '⚡ SPECIAL LISTS (cont.)', `Level 13 | ${exam?.name}`, school, pageNum); });
        y = sectionTitle(doc, 'STUDENTS 51–100', y, BLUE);
        const next50 = rankedStudents.slice(50, 100).map(s => [
            String(s.position), `${s.first_name} ${s.last_name}`,
            classes.find(c => c.id === s.class_id)?.name || '-',
            s.mean.toFixed(1), s.cbcLevel,
        ]);
        y = autoT(doc, ['Pos', 'Student', 'Class', 'Mean', 'CBC Level'], next50, y, 6);
    }

    // At-risk (3+ subjects below ME2)
    y = ensureSpace(doc, 40, y, () => { pageNum++; return addPageHeader(doc, '⚡ AT-RISK STUDENTS', `Level 13 | ${exam?.name}`, school, pageNum); });
    y = sectionTitle(doc, 'AT-RISK STUDENTS — 3+ SUBJECTS BELOW ME2 (<42%)', y, RED);
    const atRisk = rankedStudents.filter(s => {
        const sr = examResults.filter(r => r.student_id === s.id);
        return sr.filter(r => Number(r.marks || 0) < CBC_PASS).length >= 3;
    });
    if (atRisk.length) {
        y = autoT(doc, ['#', 'Student', 'Class', 'Mean', 'CBC Level', 'Subjects Below ME2'],
            atRisk.map((s, i) => {
                const sr = examResults.filter(r => r.student_id === s.id);
                return [String(i + 1), `${s.first_name} ${s.last_name}`,
                classes.find(c => c.id === s.class_id)?.name || '-',
                s.mean.toFixed(1), s.cbcLevel,
                String(sr.filter(r => Number(r.marks || 0) < CBC_PASS).length)];
            }), y, 6.5);
    } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(P[0], P[1], P[2]);
        doc.text('✓ No students failing 3+ subjects below ME2 in this exam.', 14, y + 5);
        y += 12;
    }

    // All-pass (all subjects ≥ ME2)
    const allPass = rankedStudents.filter(s => {
        const sr = examResults.filter(r => r.student_id === s.id);
        return sr.length > 0 && sr.every(r => Number(r.marks || 0) >= CBC_PASS);
    });
    y = ensureSpace(doc, 30, y, () => { pageNum++; return addPageHeader(doc, '⚡ SPECIAL LISTS (cont.)', `Level 13 | ${exam?.name}`, school, pageNum); });
    y = sectionTitle(doc, `STUDENTS MEETING ME2+ IN ALL SUBJECTS [${allPass.length}]`, y, P);
    if (allPass.length) {
        y = autoT(doc, ['#', 'Student', 'Class', 'Mean', 'CBC Level'],
            allPass.map((s, i) => [String(i + 1), `${s.first_name} ${s.last_name}`,
            classes.find(c => c.id === s.class_id)?.name || '-', s.mean.toFixed(1), s.cbcLevel]), y, 6.5);
    } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text('No students meeting ME2+ in all subjects for this exam.', 14, y + 5);
        y += 12;
    }

    // ─── FOOTER on last page ──────────────────────────────────────────────
    const lastY = doc.internal.pageSize.getHeight() - 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(
        `Generated by NexaLMS Super Analytics Engine (CBC) | NexaGen Technologies Ltd | ${new Date().toLocaleString('en-GB')}`,
        pw / 2, lastY, { align: 'center' }
    );

    const fileName = `super_analytics_CBC_${(exam?.name || 'exam').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}`;
    downloadPdf(doc, fileName);
}
