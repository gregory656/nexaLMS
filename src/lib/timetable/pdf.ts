import type { GeneratedEntry, TimetableBreak, TimeSlot } from './types';
import { DAY_NAMES } from './generator';

interface PdfOptions {
    schoolName: string;
    title: string;
    subtitle: string;
    version: number;
    watermarkUrl?: string;
    entries: GeneratedEntry[];
    viewType: 'master' | 'teacher' | 'class';
    filterName?: string;
    periods: number[];
    workingDays: number[];
    breaks?: TimetableBreak[];
    timeSlots?: TimeSlot[];
    classes?: { id: string; name: string }[];
}

function escapeHtml(value: string | number | undefined | null): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatTime12h(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return time;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate() {
    return new Date().toLocaleString('en-KE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });
}

function getPeriodInfo(options: PdfOptions, period: number, day?: number) {
    const slot = options.timeSlots?.find(s =>
        s.period === period && s.day === (day ?? options.workingDays[0])
    );

    if (!slot) {
        return { label: `Period ${period}`, time: '', isBreak: false };
    }

    const time = `${formatTime12h(slot.start_time)} - ${formatTime12h(slot.end_time)}`;
    const breakInfo = options.breaks?.find(b =>
        b.start_time === slot.start_time && b.end_time === slot.end_time
    );

    return {
        label: breakInfo?.name || time,
        time,
        isBreak: Boolean(breakInfo),
    };
}

function emptyCell() {
    return '<span class="empty">-</span>';
}

function buildMasterTableHtml(options: PdfOptions): string {
    const { entries, periods, workingDays } = options;
    const classList = options.classes?.length
        ? options.classes
        : Array.from(new Map(entries.map(e => [
            e.class_id,
            { id: e.class_id, name: e.class_name || 'Unknown' },
        ])).values());

    return workingDays.map(day => {
        const headers = periods.map(period => {
            const periodInfo = getPeriodInfo(options, period, day);
            return `<th>${escapeHtml(periodInfo.label)}${periodInfo.isBreak && periodInfo.time ? `<span>${escapeHtml(periodInfo.time)}</span>` : ''}</th>`;
        }).join('');

        const rows = classList.map(cls => {
            const cells = periods.map(period => {
                const entry = entries.find(e =>
                    e.class_id === cls.id && e.day_of_week === day && e.period_number === period
                );

                if (!entry) return `<td>${emptyCell()}</td>`;

                return `<td>
                    <div class="lesson">
                        <strong>${escapeHtml(entry.subject_name)}</strong>
                        <em>${escapeHtml(entry.teacher_name)}</em>
                    </div>
                </td>`;
            }).join('');

            return `<tr><td class="row-header">${escapeHtml(cls.name)}</td>${cells}</tr>`;
        }).join('');

        return `<section class="day-section">
            <h3>${escapeHtml(DAY_NAMES[day] || `Day ${day}`)}</h3>
            <table>
                <thead><tr><th class="row-header">Class</th>${headers}</tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </section>`;
    }).join('');
}

function buildWeeklyTableHtml(options: PdfOptions): string {
    const { entries, viewType, periods, workingDays } = options;
    const dayHeaders = workingDays.map(d => DAY_NAMES[d]?.slice(0, 3) || `D${d}`);

    const body = periods.map(period => {
        const periodInfo = getPeriodInfo(options, period);
        const cells = workingDays.map(day => {
            const entry = entries.find(x => x.period_number === period && x.day_of_week === day);
            const secondaryText = viewType === 'teacher' ? entry?.class_name : entry?.teacher_name;
            const cell = entry
                ? `<strong>${escapeHtml(entry.subject_name)}</strong><br><em>${escapeHtml(secondaryText)}</em>`
                : emptyCell();

            return `<td>${cell}</td>`;
        }).join('');

        return `<tr><td class="period">${escapeHtml(periodInfo.label)}</td>${cells}</tr>`;
    }).join('');

    return `<table>
        <thead><tr><th>Time</th>${dayHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${body}</tbody>
    </table>`;
}

function buildTableHtml(options: PdfOptions): string {
    if (options.viewType === 'master') return buildMasterTableHtml(options);
    return buildWeeklyTableHtml(options);
}

export async function downloadTimetablePdf(options: PdfOptions): Promise<void> {
    const { schoolName, title, subtitle, version, watermarkUrl, filterName } = options;
    const tableHtml = buildTableHtml(options);

    const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${escapeHtml(title)} - V${version}</title>
<style>
  @page { size: landscape; margin: 12mm; }
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #1f2937; position: relative; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); opacity: 0.06; width: 200px; z-index: 0; }
  .content { position: relative; z-index: 1; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 1px; }
  h2 { text-align: center; font-size: 14px; margin: 0 0 4px; color: #059669; text-transform: uppercase; }
  h3 { font-size: 12px; margin: 18px 0 8px; color: #047857; border-bottom: 1px solid #a7f3d0; padding-bottom: 4px; }
  .filter { text-align: center; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { text-align: center; font-size: 11px; color: #6b7280; margin-bottom: 16px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #059669; color: white; padding: 8px 4px; border: 1px solid #047857; }
  th span { display: block; margin-top: 2px; font-size: 8px; font-weight: 400; }
  td { border: 1px solid #d1d5db; padding: 6px 4px; text-align: center; vertical-align: middle; min-height: 40px; }
  td.period, td.row-header { background: #f3f4f6; font-weight: 700; width: 90px; }
  .day-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 14px; }
  .lesson { margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #e5e7eb; }
  .lesson:last-child { border-bottom: none; }
  .lesson em, td em { display: block; margin-top: 2px; color: #6b7280; font-size: 9px; }
  .empty { color: #9ca3af; }
  .footer { text-align: center; margin-top: 16px; font-size: 9px; color: #9ca3af; }
</style>
</head><body>
${watermarkUrl ? `<img class="watermark" src="${escapeHtml(watermarkUrl)}" alt="" />` : ''}
<div class="content">
  <h1>${escapeHtml(schoolName)}</h1>
  <h2>${escapeHtml(title)}</h2>
  ${filterName ? `<div class="filter">${escapeHtml(filterName)}</div>` : ''}
  <div class="subtitle">${escapeHtml(subtitle)}</div>
  ${tableHtml}
  <div class="footer">Generated by NexaLMS &nbsp;|&nbsp; ${formatDate()} &nbsp;|&nbsp; Version V${version}</div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
        URL.revokeObjectURL(url);
        throw new Error('Pop-up blocked. Allow pop-ups to download the timetable PDF.');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export function getEntriesForTeacher(entries: GeneratedEntry[], teacherId: string) {
    return entries.filter(e => e.teacher_id === teacherId);
}

export function getEntriesForClass(entries: GeneratedEntry[], classId: string) {
    return entries.filter(e => e.class_id === classId);
}
