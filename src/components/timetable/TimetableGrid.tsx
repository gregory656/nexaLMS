import type { GeneratedEntry, TimetableBreak, TimeSlot } from '../../lib/timetable/types';
import { DAY_LABELS } from '../../lib/timetable/types';

interface TimetableGridProps {
    entries: GeneratedEntry[];
    workingDays: number[];
    periods: number[];
    viewType: 'master' | 'teacher' | 'class';
    breaks?: TimetableBreak[];
    timeSlots?: TimeSlot[];
    breakSlots?: TimeSlot[];
    classes?: { id: string; name: string }[];
}

// Helper to format time (24h to 12h AM/PM)
function formatTime12h(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function TimetableGrid({ 
    entries, 
    workingDays, 
    periods, 
    viewType, 
    breaks = [], 
    timeSlots,
    classes = [],
}: TimetableGridProps) {
    
    // Master View: Rows = Classes, Columns = Periods
    if (viewType === 'master') {
        return <MasterTimetableView 
            entries={entries} 
            workingDays={workingDays}
            periods={periods} 
            breaks={breaks}
            timeSlots={timeSlots}
            classes={classes}
        />;
    }
    
    // Teacher or Class View: Rows = Periods, Columns = Days
    return <WeeklyTimetableView 
        entries={entries} 
        workingDays={workingDays} 
        periods={periods}
        viewType={viewType}
        breaks={breaks}
        timeSlots={timeSlots}
    />;
}

// ============================================
// Master Timetable View (Admin View)
// Rows: Classes, Columns: Periods
// ============================================
function MasterTimetableView({ 
    entries, 
    workingDays,
    periods, 
    breaks,
    timeSlots,
    classes 
}: { 
    entries: GeneratedEntry[]; 
    workingDays: number[];
    periods: number[];
    breaks: TimetableBreak[];
    timeSlots: TimeSlot[] | undefined;
    classes: { id: string; name: string }[];
}) {
    
    // Get unique classes from entries
    const classList = classes.length > 0 
        ? classes 
        : Array.from(new Map(entries.map(e => [e.class_id, { id: e.class_id, name: e.class_name || 'Unknown' }])).values());
    
    // Get entries for a specific class, day, and period
    const getCellEntry = (classId: string, day: number, period: number) => {
        return entries.find(e => e.class_id === classId && e.day_of_week === day && e.period_number === period);
    };
    
    // Get period time label
    const getPeriodLabel = (period: number): { label: string; isBreak: boolean; breakName?: string; breakTime?: string } => {
        if (timeSlots && timeSlots.length > 0) {
            const slot = timeSlots.find(s => s.period === period && s.day === workingDays[0]);
            if (slot) {
                const time = `${formatTime12h(slot.start_time)} - ${formatTime12h(slot.end_time)}`;
                // Check if this slot is a break by comparing with breaks config
                const isBreak = breaks.some(b => 
                    b.start_time === slot.start_time && b.end_time === slot.end_time
                );
                if (isBreak) {
                    const breakInfo = breaks.find(b => 
                        b.start_time === slot.start_time && b.end_time === slot.end_time
                    );
                    return { label: time, isBreak: true, breakName: breakInfo?.name, breakTime: time };
                }
                return { label: time, isBreak: false };
            }
        }
        return { label: `Period ${period}`, isBreak: false };
    };
    
    return (
        <div className="timetable-grid-wrapper">
            <div className="master-timetable-scroll">
                {workingDays.map(day => (
                    <div key={day} className="master-day-section">
                        <h4 className="master-day-header">{DAY_LABELS[day]}</h4>
                        <table className="timetable-grid master-table">
                            <thead>
                                <tr>
                                    <th className="tt-class-col">Class</th>
                                    {periods.map(period => {
                                        const periodInfo = getPeriodLabel(period);
                                        return (
                                            <th key={period} className={periodInfo.isBreak ? 'tt-period-break' : ''}>
                                                {periodInfo.isBreak ? (
                                                    <div className="break-header">
                                                        <span className="break-name">{periodInfo.breakName}</span>
                                                        {periodInfo.breakTime && <span className="tt-period-time">{periodInfo.breakTime}</span>}
                                                    </div>
                                                ) : (
                                                    <div className="period-header">
                                                        <span className="period-num">{periodInfo.label}</span>
                                                    </div>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {classList.map(cls => (
                                    <tr key={cls.id}>
                                        <td className="tt-class-cell">{cls.name}</td>
                                        {periods.map(period => {
                                            const entry = getCellEntry(cls.id, day, period);
                                            const periodInfo = getPeriodLabel(period);
                                            
                                            if (periodInfo.isBreak) {
                                                return (
                                                    <td key={period} className="tt-cell tt-break-cell">
                                                        <span className="break-label">{periodInfo.breakName}</span>
                                                    </td>
                                                );
                                            }
                                            
                                            return (
                                                <td key={period} className="tt-cell">
                                                    {entry ? (
                                                        <div className="tt-lesson-block">
                                                            <div className="tt-subject">{entry.subject_name}</div>
                                                            <div className="tt-teacher">{entry.teacher_name}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="tt-empty">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// Weekly Timetable View (Teacher/Class View)
// Rows: Periods, Columns: Days
// ============================================
function WeeklyTimetableView({ 
    entries, 
    workingDays, 
    periods,
    viewType,
    breaks,
    timeSlots
}: { 
    entries: GeneratedEntry[]; 
    workingDays: number[]; 
    periods: number[];
    viewType: 'teacher' | 'class';
    breaks: TimetableBreak[];
    timeSlots: TimeSlot[] | undefined;
}) {
    
    // Get entry for specific period and day
    const getCell = (period: number, day: number) => {
        return entries.find(e => e.period_number === period && e.day_of_week === day);
    };
    
    // Get period time and break info
    const getPeriodInfo = (period: number): { time: string; isBreak: boolean; breakName?: string; breakTime?: string } => {
        if (timeSlots && timeSlots.length > 0) {
            const slot = timeSlots.find(s => s.period === period && s.day === workingDays[0]);
            if (slot) {
                // Check if this slot is a break by comparing with breaks config
                const breakInfo = breaks.find(b => 
                    b.start_time === slot.start_time && b.end_time === slot.end_time
                );
                if (breakInfo) {
                    return { 
                        time: `${formatTime12h(slot.start_time)} - ${formatTime12h(slot.end_time)}`, 
                        isBreak: true, 
                        breakName: breakInfo.name,
                        breakTime: `${formatTime12h(breakInfo.start_time)} - ${formatTime12h(breakInfo.end_time)}`
                    };
                }
                return { 
                    time: `${formatTime12h(slot.start_time)} - ${formatTime12h(slot.end_time)}`, 
                    isBreak: false 
                };
            }
        }
        return { time: '', isBreak: false };
    };
    
    return (
        <div className="timetable-grid-wrapper">
            <table className="timetable-grid">
                <thead>
                    <tr>
                        <th className="tt-time-col">Time</th>
                        {workingDays.map(d => (
                            <th key={d}>{DAY_LABELS[d]}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {periods.map(period => {
                        const periodInfo = getPeriodInfo(period);
                        
                        return (
                            <tr key={period} className={periodInfo.isBreak ? 'tt-break-row' : ''}>
                                <td className="tt-time-cell">
                                    {periodInfo.isBreak ? (
                                        <div className="break-time-cell">
                                            <span className="tt-break-name">{periodInfo.breakName}</span>
                                            <span className="tt-period-time">{periodInfo.breakTime}</span>
                                        </div>
                                    ) : (
                                        <span className="tt-period-time tt-period-time-primary">
                                            {periodInfo.time || `Period ${period}`}
                                        </span>
                                    )}
                                </td>
                                {workingDays.map(day => {
                                    const entry = getCell(period, day);
                                    
                                    if (periodInfo.isBreak) {
                                        return (
                                            <td key={day} className="tt-cell tt-break-cell">
                                                <span className="break-time">{periodInfo.breakTime}</span>
                                            </td>
                                        );
                                    }
                                    
                                    return (
                                        <td key={day} className="tt-cell">
                                            {entry ? (
                                                <div className="tt-lesson-block">
                                                    <div className="tt-subject">{entry.subject_name}</div>
                                                    {viewType === 'teacher' && entry.class_name && (
                                                        <div className="tt-class">{entry.class_name}</div>
                                                    )}
                                                    {viewType === 'class' && entry.teacher_name && (
                                                        <div className="tt-teacher">{entry.teacher_name}</div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="tt-empty">—</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
