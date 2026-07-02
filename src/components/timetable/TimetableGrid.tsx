import type { GeneratedEntry } from '../../lib/timetable/types';
import { DAY_LABELS } from '../../lib/timetable/types';

interface TimetableGridProps {
    entries: GeneratedEntry[];
    workingDays: number[];
    periods: number[];
    viewType: 'master' | 'teacher' | 'class';
}

export default function TimetableGrid({ entries, workingDays, periods, viewType }: TimetableGridProps) {
    const getCell = (period: number, day: number) => {
        if (viewType === 'master') {
            return entries.filter(e => e.period_number === period && e.day_of_week === day);
        }
        return entries.find(e => e.period_number === period && e.day_of_week === day);
    };

    return (
        <div className="timetable-grid-wrapper">
            <table className="timetable-grid">
                <thead>
                    <tr>
                        <th className="tt-period-col">Period</th>
                        {workingDays.map(d => (
                            <th key={d}>{DAY_LABELS[d]}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {periods.map(period => (
                        <tr key={period}>
                            <td className="tt-period-col">
                                <span className="tt-period-num">P{period}</span>
                            </td>
                            {workingDays.map(day => {
                                const cell = getCell(period, day);
                                if (viewType === 'master') {
                                    const items = cell as GeneratedEntry[];
                                    return (
                                        <td key={day} className="tt-cell tt-cell-master">
                                            {items.length === 0 ? (
                                                <span className="tt-empty">—</span>
                                            ) : (
                                                items.map((e, i) => (
                                                    <div key={i} className="tt-lesson-block">
                                                        <div className="tt-class">{e.class_name}</div>
                                                        <div className="tt-subject">{e.subject_name}</div>
                                                        <div className="tt-teacher">{e.teacher_name}</div>
                                                    </div>
                                                ))
                                            )}
                                        </td>
                                    );
                                }
                                const entry = cell as GeneratedEntry | undefined;
                                return (
                                    <td key={day} className="tt-cell">
                                        {entry ? (
                                            <div className="tt-lesson-block">
                                                <div className="tt-subject">{entry.subject_name}</div>
                                                {viewType === 'class' && (
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
                    ))}
                </tbody>
            </table>
        </div>
    );
}
