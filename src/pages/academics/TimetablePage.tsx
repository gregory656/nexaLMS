import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
    Calendar, Clock, Download, Eye, Play, Plus, Save, Settings,
    Trash2, CheckCircle, AlertTriangle, X, BookOpen
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { buildTimeSlots, generateTimetable, getBreakSlots } from '../../lib/timetable/generator';
import { downloadTimetablePdf, getEntriesForClass, getEntriesForTeacher } from '../../lib/timetable/pdf';
import type {
    GeneratedEntry, LessonAssignment, TimetableBreak,
    TimetableRecord, TimetableSettings
} from '../../lib/timetable/types';
import { DAY_LABELS, WORKING_DAY_PRESETS } from '../../lib/timetable/types';
import TimetableGrid from '../../components/timetable/TimetableGrid';

const DEFAULT_BREAKS: TimetableBreak[] = [
    { name: 'Tea Break', start_time: '09:20', end_time: '09:40' },
    { name: 'Lunch', start_time: '11:40', end_time: '12:30' },
];

const TERM_OPTIONS = ['Term 1', 'Term 2', 'Term 3'];

export default function TimetablePage() {
    const { school, user } = useAuth();
    const [tab, setTab] = useState<'setup' | 'generate' | 'view'>('setup');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState(0);

    const [years, setYears] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [timetables, setTimetables] = useState<TimetableRecord[]>([]);
    const [activeTimetable, setActiveTimetable] = useState<TimetableRecord | null>(null);
    const [entries, setEntries] = useState<GeneratedEntry[]>([]);

    const [viewMode, setViewMode] = useState<'master' | 'teacher' | 'class'>('master');
    const [filterTeacherId, setFilterTeacherId] = useState('');
    const [filterClassId, setFilterClassId] = useState('');
    const [dayPreset, setDayPreset] = useState('Monday – Friday');
    const [customDays, setCustomDays] = useState<number[]>([0, 1, 2, 3, 4]);
    const [showBreakModal, setShowBreakModal] = useState(false);
    const [breakForm, setBreakForm] = useState<TimetableBreak>({ name: '', start_time: '09:20', end_time: '09:40' });

    const [settings, setSettings] = useState<Partial<TimetableSettings>>({
        term_name: 'Term 1',
        name: '',
        working_days: [0, 1, 2, 3, 4],
        lesson_duration_minutes: 40,
        periods_per_day: 7,
        school_start_time: '08:00',
        school_end_time: '15:30',
        min_teacher_lessons_per_day: 1,
        max_teacher_lessons_per_day: 6,
        min_class_lessons_per_day: 4,
        max_class_lessons_per_day: 8,
        breaks: DEFAULT_BREAKS,
    });

    const currentYear = useMemo(
        () => years.find(y => y.is_current) || years[0],
        [years]
    );

    // Compute time slots for displaying time in timetable
    const timeSlots = useMemo(() => {
        if (!settings.school_start_time || !settings.lesson_duration_minutes || !settings.periods_per_day) {
            return [];
        }
        return buildTimeSlots(settings as TimetableSettings);
    }, [settings.school_start_time, settings.lesson_duration_minutes, settings.periods_per_day, settings.breaks, settings.working_days, settings.school_end_time]);

    // Compute periods including breaks - use timeSlots to determine the actual number of periods
    const periods = useMemo(() => {
        if (timeSlots.length > 0) {
            // Get unique period numbers from timeSlots
            const uniquePeriods = [...new Set(timeSlots.map(s => s.period))];
            return uniquePeriods.sort((a, b) => a - b);
        }
        const p = settings.periods_per_day || 7;
        return Array.from({ length: p }, (_, i) => i + 1);
    }, [timeSlots, settings.periods_per_day]);

    // Compute break slots for displaying breaks in timetable
    const breakSlots = useMemo(() => {
        return getBreakSlots(settings as TimetableSettings);
    }, [settings.breaks, settings.working_days]);

    const workingDays = settings.working_days || [0, 1, 2, 3, 4];

    const displayEntries = useMemo(() => {
        if (viewMode === 'teacher' && filterTeacherId) {
            return getEntriesForTeacher(entries, filterTeacherId);
        }
        if (viewMode === 'class' && filterClassId) {
            return getEntriesForClass(entries, filterClassId);
        }
        return entries;
    }, [entries, viewMode, filterTeacherId, filterClassId]);

    const fetchAll = useCallback(async () => {
        if (!school?.id) return;
        setLoading(true);

        const [yrRes, clsRes, teaRes, asnRes, setRes, ttRes] = await Promise.all([
            supabase.from('academic_years').select('*').eq('school_id', school.id).order('is_current', { ascending: false }),
            supabase.from('classes').select('*').eq('school_id', school.id).order('name'),
            supabase.from('teachers').select('*').eq('school_id', school.id).order('first_name'),
            supabase.from('teacher_subject_assignments')
                .select('*, teachers(first_name, last_name), subjects(name, lessons_per_week), classes(name)')
                .eq('school_id', school.id),
            supabase.from('timetable_settings').select('*').eq('school_id', school.id).maybeSingle(),
            supabase.from('timetables').select('*').eq('school_id', school.id).order('version', { ascending: false }),
        ]);

        const yearList = yrRes.data || [];
        setYears(yearList);
        setClasses(clsRes.data || []);
        setTeachers(teaRes.data || []);
        setAssignments(asnRes.data || []);
        setTimetables((ttRes.data || []) as TimetableRecord[]);

        const cur = yearList.find(y => y.is_current) || yearList[0];
        if (setRes.data) {
            setSettings(setRes.data as TimetableSettings);
            const preset = WORKING_DAY_PRESETS.find(p =>
                JSON.stringify(p.days) === JSON.stringify(setRes.data.working_days)
            );
            setDayPreset(preset?.label || 'Custom');
            if (!preset) setCustomDays(setRes.data.working_days);
        } else if (cur) {
            setSettings(s => ({
                ...s,
                academic_year_id: cur.id,
                name: `${s.term_name || 'Term 1'} ${cur.name}`,
                school_id: school.id,
            }));
        }

        const published = (ttRes.data || []).find((t: any) => t.status === 'published') || ttRes.data?.[0];
        if (published) {
            setActiveTimetable(published as TimetableRecord);
            await loadEntries(published.id);
        }

        setLoading(false);
    }, [school?.id]);

    const loadEntries = async (timetableId: string) => {
        const { data, error } = await supabase
            .from('timetable_entries')
            .select('*, classes(name), subjects(name), teachers(first_name, last_name)')
            .eq('timetable_id', timetableId);

        if (error) {
            toast.error(error.message);
            return;
        }

        setEntries((data || []).map((e: any) => ({
            class_id: e.class_id,
            subject_id: e.subject_id,
            teacher_id: e.teacher_id,
            day_of_week: e.day_of_week,
            period_number: e.period_number || 1,
            start_time: e.start_time?.slice(0, 5) || '08:00',
            end_time: e.end_time?.slice(0, 5) || '08:40',
            class_name: e.classes?.name,
            subject_name: e.subjects?.name,
            teacher_name: e.teachers ? `${e.teachers.first_name} ${e.teachers.last_name}` : '',
        })));
    };

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        if (currentYear && !settings.academic_year_id) {
            setSettings(s => ({
                ...s,
                academic_year_id: currentYear.id,
                name: `${s.term_name || 'Term 1'} ${currentYear.name}`,
                school_id: school?.id,
            }));
        }
    }, [currentYear, settings.academic_year_id, school?.id]);

    const handleDayPresetChange = (label: string) => {
        setDayPreset(label);
        const preset = WORKING_DAY_PRESETS.find(p => p.label === label);
        if (preset && preset.days.length > 0) {
            setSettings(s => ({ ...s, working_days: preset.days }));
        }
    };

    const toggleCustomDay = (day: number) => {
        const next = customDays.includes(day)
            ? customDays.filter(d => d !== day)
            : [...customDays, day].sort();
        setCustomDays(next);
        setSettings(s => ({ ...s, working_days: next }));
        setDayPreset('Custom');
    };

    const saveSettings = async () => {
        if (!school?.id || !settings.academic_year_id) {
            toast.error('Select an academic year first.');
            return;
        }
        setSaving(true);
        const payload = {
            school_id: school.id,
            academic_year_id: settings.academic_year_id,
            term_name: settings.term_name || 'Term 1',
            name: settings.name || `${settings.term_name} Timetable`,
            working_days: settings.working_days,
            lesson_duration_minutes: settings.lesson_duration_minutes,
            periods_per_day: settings.periods_per_day,
            school_start_time: settings.school_start_time,
            school_end_time: settings.school_end_time,
            min_teacher_lessons_per_day: settings.min_teacher_lessons_per_day,
            max_teacher_lessons_per_day: settings.max_teacher_lessons_per_day,
            min_class_lessons_per_day: settings.min_class_lessons_per_day,
            max_class_lessons_per_day: settings.max_class_lessons_per_day,
            breaks: settings.breaks || [],
            updated_at: new Date().toISOString(),
        };

        const { error } = settings.id
            ? await supabase.from('timetable_settings').update(payload).eq('id', settings.id)
            : await supabase.from('timetable_settings').insert(payload);

        if (error) toast.error(error.message);
        else {
            toast.success('Timetable settings saved');
            await fetchAll();
        }
        setSaving(false);
    };

    const validateBeforeGenerate = (): string | null => {
        if (!classes.length) return 'No classes found. Create class groups first.';
        if (!assignments.length) return 'No teacher subject assignments. Add subject combinations under Staff & Teachers.';
        if (!settings.academic_year_id) return 'Academic year is required.';
        return null;
    };

    const ensureTerm = async (): Promise<string | null> => {
        if (!school?.id || !settings.academic_year_id) return null;
        const termName = settings.term_name || 'Term 1';
        const { data: existing } = await supabase
            .from('terms')
            .select('id')
            .eq('academic_year_id', settings.academic_year_id)
            .eq('name', termName)
            .maybeSingle();

        if (existing) return existing.id;

        const year = years.find(y => y.id === settings.academic_year_id);
        const { data, error } = await supabase.from('terms').insert({
            school_id: school.id,
            academic_year_id: settings.academic_year_id,
            name: termName,
            term_number: TERM_OPTIONS.indexOf(termName) + 1 || 1,
            start_date: year?.start_date || new Date().toISOString().slice(0, 10),
            end_date: year?.end_date || new Date().toISOString().slice(0, 10),
            is_current: true,
        }).select('id').single();

        if (error) {
            toast.error(error.message);
            return null;
        }
        return data.id;
    };

    const handleGenerate = async () => {
        const err = validateBeforeGenerate();
        if (err) {
            toast.error(err);
            return;
        }

        setGenerating(true);
        setProgress(0);
        setTab('generate');

        const fullSettings = settings as TimetableSettings;
        const slots = buildTimeSlots(fullSettings);

        const lessonAssignments: LessonAssignment[] = assignments
            .filter(a => a.class_id && a.academic_year_id === settings.academic_year_id)
            .map(a => ({
                teacher_id: a.teacher_id,
                subject_id: a.subject_id,
                class_id: a.class_id,
                lessons_per_week: a.lessons_per_week || a.subjects?.lessons_per_week || 5,
                teacher_name: a.teachers ? `${a.teachers.first_name} ${a.teachers.last_name}` : 'Teacher',
                subject_name: a.subjects?.name || 'Subject',
                class_name: a.classes?.name || 'Class',
            }));

        const result = generateTimetable({
            settings: fullSettings,
            assignments: lessonAssignments,
            slots,
            onProgress: setProgress,
        });

        if (!result.success) {
            toast.error(result.errors[0] || 'Generation failed');
            setGenerating(false);
            return;
        }

        const nextVersion = (timetables[0]?.version || 0) + 1;
        const termId = await ensureTerm();

        const { data: tt, error: ttError } = await supabase.from('timetables').insert({
            school_id: school!.id,
            academic_year_id: settings.academic_year_id,
            term_id: termId,
            term_name: settings.term_name,
            name: settings.name || `Timetable V${nextVersion}`,
            version: nextVersion,
            status: 'draft',
            is_active: false,
            generated_at: new Date().toISOString(),
            generated_by: user?.id,
            settings_snapshot: fullSettings,
        }).select().single();

        if (ttError || !tt) {
            toast.error(ttError?.message || 'Failed to save timetable');
            setGenerating(false);
            return;
        }

        const entryRows = result.entries.map(e => ({
            timetable_id: tt.id,
            class_id: e.class_id,
            subject_id: e.subject_id,
            teacher_id: e.teacher_id,
            day_of_week: e.day_of_week,
            period_number: e.period_number,
            start_time: e.start_time,
            end_time: e.end_time,
            school_id: school!.id,
        }));

        const { error: entError } = await supabase.from('timetable_entries').insert(entryRows);
        if (entError) {
            toast.error(entError.message);
            setGenerating(false);
            return;
        }

        setProgress(100);
        toast.success(`Timetable V${nextVersion} generated successfully!`);
        setActiveTimetable(tt as TimetableRecord);
        setEntries(result.entries);
        setGenerating(false);
        setTab('view');
        await fetchAll();
    };

    const handlePublish = async () => {
        if (!activeTimetable) return;
        await supabase.from('timetables').update({ is_active: false, status: 'archived' }).eq('school_id', school!.id).eq('status', 'published');
        const { error } = await supabase.from('timetables').update({ status: 'published', is_active: true }).eq('id', activeTimetable.id);
        if (error) toast.error(error.message);
        else {
            toast.success('Timetable published — teachers and students will see this version.');
            await fetchAll();
        }
    };

    const handleDeleteVersion = async (id: string) => {
        if (!confirm('Delete this timetable version?')) return;
        const { error } = await supabase.from('timetables').delete().eq('id', id);
        if (error) toast.error(error.message);
        else {
            toast.success('Version deleted');
            if (activeTimetable?.id === id) {
                setActiveTimetable(null);
                setEntries([]);
            }
            await fetchAll();
        }
    };

    const handleDownload = async () => {
        if (!activeTimetable || !entries.length) {
            toast.error('No timetable to download');
            return;
        }

        const filterName = viewMode === 'teacher'
            ? teachers.find(t => t.id === filterTeacherId)
                ? `${teachers.find(t => t.id === filterTeacherId).first_name}_${teachers.find(t => t.id === filterTeacherId).last_name}`
                : undefined
            : viewMode === 'class'
                ? classes.find(c => c.id === filterClassId)?.name
                : undefined;

        await downloadTimetablePdf({
            schoolName: school?.name || 'School',
            title: viewMode === 'master' ? 'Master Timetable' : viewMode === 'teacher' ? 'Teacher Timetable' : 'Class Timetable',
            subtitle: `${settings.term_name || 'Term'} ${currentYear?.name || ''}`,
            version: activeTimetable.version,
            watermarkUrl: school?.watermark_url || school?.logo_url,
            entries: displayEntries,
            viewType: viewMode,
            filterName,
            periods,
            workingDays,
            breaks: settings.breaks,
            timeSlots,
            classes,
        });
    };

    const addBreak = () => {
        if (!breakForm.name.trim()) return;
        setSettings(s => ({
            ...s,
            breaks: [...(s.breaks || []), breakForm],
        }));
        setBreakForm({ name: '', start_time: '09:20', end_time: '09:40' });
        setShowBreakModal(false);
    };

    const removeBreak = (idx: number) => {
        setSettings(s => ({
            ...s,
            breaks: (s.breaks || []).filter((_, i) => i !== idx),
        }));
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 gap-4">
                <span className="spinner" style={{ width: 40, height: 40 }} />
                <p className="text-muted">Loading timetable module...</p>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Timetable</h1>
                    <p className="page-subtitle">Configure, generate, and publish school timetables</p>
                </div>
                {activeTimetable && (
                    <div className="flex gap-2">
                        <span className="badge badge-blue">V{activeTimetable.version}</span>
                        <span className={`badge ${activeTimetable.status === 'published' ? 'badge-green' : 'badge-orange'}`}>
                            {activeTimetable.status}
                        </span>
                    </div>
                )}
            </div>

            <div className="tabs mb-4">
                <div className={`tab ${tab === 'setup' ? 'active' : ''}`} onClick={() => setTab('setup')}>
                    <Settings size={16} /> Setup
                </div>
                <div className={`tab ${tab === 'generate' ? 'active' : ''}`} onClick={() => setTab('generate')}>
                    <Play size={16} /> Generate
                </div>
                <div className={`tab ${tab === 'view' ? 'active' : ''}`} onClick={() => setTab('view')}>
                    <Eye size={16} /> Preview
                </div>
            </div>

            {tab === 'setup' && (
                <div className="grid-2">
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title"><Calendar size={18} /> Academic Scope</h3>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Academic Year</label>
                            <select
                                className="form-select"
                                value={settings.academic_year_id || ''}
                                onChange={e => {
                                    const yr = years.find(y => y.id === e.target.value);
                                    setSettings(s => ({
                                        ...s,
                                        academic_year_id: e.target.value,
                                        name: `${s.term_name} ${yr?.name || ''}`,
                                    }));
                                }}
                            >
                                {years.map(y => (
                                    <option key={y.id} value={y.id}>{y.name}{y.is_current ? ' (Current)' : ''}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Term</label>
                                <select
                                    className="form-select"
                                    value={settings.term_name}
                                    onChange={e => setSettings(s => ({
                                        ...s,
                                        term_name: e.target.value,
                                        name: `${e.target.value} ${currentYear?.name || ''}`,
                                    }))}
                                >
                                    {TERM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Timetable Name</label>
                                <input
                                    className="form-input"
                                    value={settings.name || ''}
                                    onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
                                    placeholder="e.g. Term 2 2026"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title"><Clock size={18} /> Working Days</h3>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Preset</label>
                            <select className="form-select" value={dayPreset} onChange={e => handleDayPresetChange(e.target.value)}>
                                {WORKING_DAY_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
                            </select>
                        </div>
                        <div className="tt-day-picker">
                            {DAY_LABELS.map((label, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`tt-day-btn ${workingDays.includes(idx) ? 'active' : ''}`}
                                    onClick={() => toggleCustomDay(idx)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Lesson Configuration</h3>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Lesson Duration (min)</label>
                                <input type="number" className="form-input" value={settings.lesson_duration_minutes}
                                    onChange={e => setSettings(s => ({ ...s, lesson_duration_minutes: +e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Periods per Day</label>
                                <input type="number" className="form-input" value={settings.periods_per_day}
                                    onChange={e => setSettings(s => ({ ...s, periods_per_day: +e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">School Start</label>
                                <input type="time" className="form-input" value={settings.school_start_time}
                                    onChange={e => setSettings(s => ({ ...s, school_start_time: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">School End</label>
                                <input type="time" className="form-input" value={settings.school_end_time}
                                    onChange={e => setSettings(s => ({ ...s, school_end_time: e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Min Teacher Lessons/Day</label>
                                <input type="number" className="form-input" value={settings.min_teacher_lessons_per_day}
                                    onChange={e => setSettings(s => ({ ...s, min_teacher_lessons_per_day: +e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Teacher Lessons/Day</label>
                                <input type="number" className="form-input" value={settings.max_teacher_lessons_per_day}
                                    onChange={e => setSettings(s => ({ ...s, max_teacher_lessons_per_day: +e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Min Class Lessons/Day</label>
                                <input type="number" className="form-input" value={settings.min_class_lessons_per_day}
                                    onChange={e => setSettings(s => ({ ...s, min_class_lessons_per_day: +e.target.value }))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Max Class Lessons/Day</label>
                                <input type="number" className="form-input" value={settings.max_class_lessons_per_day}
                                    onChange={e => setSettings(s => ({ ...s, max_class_lessons_per_day: +e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Break Configuration</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowBreakModal(true)}>
                                <Plus size={14} /> Add Break
                            </button>
                        </div>
                        {(settings.breaks || []).length === 0 ? (
                            <p className="text-sm text-muted p-4">No breaks configured. Lessons can fill all periods.</p>
                        ) : (
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr><th>Name</th><th>Start</th><th>End</th><th></th></tr>
                                    </thead>
                                    <tbody>
                                        {(settings.breaks || []).map((b, i) => (
                                            <tr key={i}>
                                                <td>{b.name}</td>
                                                <td>{b.start_time}</td>
                                                <td>{b.end_time}</td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => removeBreak(i)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ gridColumn: 'span 2' }}>
                        <div className="card-header">
                            <h3 className="card-title"><BookOpen size={18} /> Data Sources</h3>
                        </div>
                        <div className="grid-4">
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Classes</h3>
                                    <div className="stat-value">{classes.length}</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Teachers</h3>
                                    <div className="stat-value">{teachers.length}</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Subject Assignments</h3>
                                    <div className="stat-value">{assignments.length}</div>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-info">
                                    <h3>Versions</h3>
                                    <div className="stat-value">{timetables.length}</div>
                                </div>
                            </div>
                        </div>
                        {assignments.length === 0 && (
                            <div className="setup-nudge mt-4">
                                <AlertTriangle size={20} style={{ color: 'var(--orange-500)' }} />
                                <p className="text-sm">Add subject combinations under <strong>Staff & Teachers</strong> before generating.</p>
                            </div>
                        )}
                        <div className="flex justify-end mt-4">
                            <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
                                <Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'generate' && (
                <div className="card timetable-generate-card">
                    <div className="text-center p-8">
                        {generating ? (
                            <>
                                <div className="tt-progress-ring">
                                    <span className="tt-progress-pct">{progress}%</span>
                                </div>
                                <h3 className="mt-4">NexaLMS is generating your timetable...</h3>
                                <div className="tt-progress-bar mt-4">
                                    <div className="tt-progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                                <p className="text-sm text-muted mt-2">Solving constraint satisfaction — please wait</p>
                            </>
                        ) : (
                            <>
                                <Play size={48} style={{ color: 'var(--green-600)', margin: '0 auto' }} />
                                <h3 className="mt-4">Ready to Generate</h3>
                                <p className="text-muted mt-2 max-w-md mx-auto">
                                    The generator will place {assignments.reduce((s, a) => s + (a.lessons_per_week || 5), 0)} lessons
                                    across {classes.length} classes using backtracking constraint solving.
                                </p>
                                <div className="flex justify-center gap-3 mt-6">
                                    <button className="btn btn-secondary" onClick={saveSettings} disabled={saving}>
                                        <Save size={16} /> Save Settings First
                                    </button>
                                    <button className="btn btn-primary btn-lg" onClick={handleGenerate}>
                                        <Play size={18} /> Generate Timetable
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {timetables.length > 0 && !generating && (
                        <div className="border-t p-4">
                            <h4 className="font-semibold mb-3">Previous Versions</h4>
                            <div className="table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Version</th>
                                            <th>Name</th>
                                            <th>Status</th>
                                            <th>Generated</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timetables.map(tt => (
                                            <tr key={tt.id}>
                                                <td><strong>V{tt.version}</strong></td>
                                                <td>{tt.name}</td>
                                                <td>
                                                    <span className={`badge ${tt.status === 'published' ? 'badge-green' : 'badge-blue'}`}>
                                                        {tt.status}
                                                    </span>
                                                </td>
                                                <td>{tt.generated_at ? new Date(tt.generated_at).toLocaleString('en-KE') : '—'}</td>
                                                <td>
                                                    <button className="btn btn-ghost btn-sm" onClick={async () => {
                                                        setActiveTimetable(tt);
                                                        await loadEntries(tt.id);
                                                        setTab('view');
                                                    }}>View</button>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteVersion(tt.id)} style={{ color: 'var(--danger)' }}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'view' && (
                <>
                    {!activeTimetable || entries.length === 0 ? (
                        <div className="empty-state card">
                            <Clock size={48} style={{ color: 'var(--gray-300)' }} />
                            <h3>No timetable to preview</h3>
                            <p>Generate a timetable first, then preview it here.</p>
                            <button className="btn btn-primary mt-4" onClick={() => setTab('generate')}>Go to Generate</button>
                        </div>
                    ) : (
                        <div className="card">
                            <div className="card-header flex-wrap gap-2">
                                <div className="flex gap-2">
                                    <button className={`btn btn-sm ${viewMode === 'master' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setViewMode('master')}>Master</button>
                                    <button className={`btn btn-sm ${viewMode === 'teacher' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setViewMode('teacher')}>Teacher</button>
                                    <button className={`btn btn-sm ${viewMode === 'class' ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setViewMode('class')}>Class</button>
                                </div>
                                <div className="flex gap-2 items-center flex-wrap">
                                    {viewMode === 'teacher' && (
                                        <select className="form-select" style={{ minWidth: 180 }} value={filterTeacherId}
                                            onChange={e => setFilterTeacherId(e.target.value)}>
                                            <option value="">Select Teacher</option>
                                            {teachers.map(t => (
                                                <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                                            ))}
                                        </select>
                                    )}
                                    {viewMode === 'class' && (
                                        <select className="form-select" style={{ minWidth: 180 }} value={filterClassId}
                                            onChange={e => setFilterClassId(e.target.value)}>
                                            <option value="">Select Class</option>
                                            {classes.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <button className="btn btn-secondary btn-sm" onClick={handleDownload}>
                                        <Download size={14} /> Download PDF
                                    </button>
                                    {activeTimetable.status !== 'published' && (
                                        <button className="btn btn-primary btn-sm" onClick={handlePublish}>
                                            <CheckCircle size={14} /> Publish
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="tt-preview-header">
                                <h2>{school?.name}</h2>
                                <h3>
                                    {viewMode === 'master' ? 'Master Timetable' : viewMode === 'teacher' ? 'Teacher Timetable' : 'Class Timetable'}
                                </h3>
                                {viewMode === 'teacher' && filterTeacherId && (
                                    <p className="tt-filter-name">
                                        {teachers.find(t => t.id === filterTeacherId)?.first_name}{' '}
                                        {teachers.find(t => t.id === filterTeacherId)?.last_name}
                                    </p>
                                )}
                                {viewMode === 'class' && filterClassId && (
                                    <p className="tt-filter-name">{classes.find(c => c.id === filterClassId)?.name}</p>
                                )}
                                <p className="text-sm text-muted">{settings.term_name} {currentYear?.name} — Version V{activeTimetable.version}</p>
                            </div>

                            {(viewMode === 'master' || (viewMode === 'teacher' && filterTeacherId) || (viewMode === 'class' && filterClassId)) ? (
                                <TimetableGrid
                                    entries={displayEntries}
                                    workingDays={workingDays}
                                    periods={periods}
                                    viewType={viewMode}
                                    breaks={settings.breaks}
                                    timeSlots={timeSlots}
                                    breakSlots={breakSlots}
                                    classes={classes}
                                />
                            ) : (
                                <p className="text-center text-muted p-8">Select a {viewMode} to view their timetable.</p>
                            )}
                        </div>
                    )}
                </>
            )}

            {showBreakModal && (
                <div className="modal-overlay" onClick={() => setShowBreakModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Add Break</h3>
                            <button className="modal-close" onClick={() => setShowBreakModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Break Name</label>
                                <input className="form-input" value={breakForm.name}
                                    onChange={e => setBreakForm(b => ({ ...b, name: e.target.value }))} placeholder="Tea Break" />
                            </div>
                            <div className="grid-2">
                                <div className="form-group">
                                    <label className="form-label">Start Time</label>
                                    <input type="time" className="form-input" value={breakForm.start_time}
                                        onChange={e => setBreakForm(b => ({ ...b, start_time: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">End Time</label>
                                    <input type="time" className="form-input" value={breakForm.end_time}
                                        onChange={e => setBreakForm(b => ({ ...b, end_time: e.target.value }))} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowBreakModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={addBreak}>Add Break</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
