import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

if (fs.existsSync('.env')) {
    const envText = fs.readFileSync('.env', 'utf8');
    for (const line of envText.split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
}

const url = process.env.VITE_SUPABASE_URL || 'https://xgzdscebuznishsferce.supabase.co';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const email = process.env.DEMO_EMAIL || 'admin@gmail.com';
const password = process.env.DEMO_PASSWORD || '999888777Ss.';

if (!anonKey) {
    console.error('Missing VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.');
    process.exit(1);
}

const supabase = createClient(url, anonKey);

const firstNamesMale = ['Brian', 'Kevin', 'Felix', 'David', 'James', 'Brian', 'Collins', 'Mark', 'Samuel', 'Ian', 'Victor', 'Ryan', 'Dennis', 'Elvis', 'Allan', 'Joseph', 'Lewis', 'Caleb', 'Moses', 'Noah'];
const firstNamesFemale = ['Mary', 'Achieng', 'Sharon', 'Mercy', 'Faith', 'Grace', 'Winnie', 'Diana', 'Esther', 'Joy', 'Brenda', 'Lilian', 'Naomi', 'Sarah', 'Ruth', 'Ivy', 'Michelle', 'Ann', 'Purity', 'Cynthia'];
const surnames = ['Otieno', 'Ochieng', 'Mwangi', 'Wanjiru', 'Auma', 'Odhiambo', 'Njoroge', 'Atieno', 'Kiptoo', 'Cherono', 'Mutua', 'Wambua', 'Maina', 'Omondi', 'Nyambura', 'Were', 'Oduor', 'Kamau', 'Awino', 'Chebet'];
const subjectsSeed = [
    ['Mathematics', 'MATH', 6],
    ['English', 'ENG', 5],
    ['Kiswahili', 'KIS', 5],
    ['Biology', 'BIO', 4],
    ['Chemistry', 'CHEM', 4],
    ['Physics', 'PHY', 4],
    ['History', 'HIST', 3],
    ['Geography', 'GEO', 3],
    ['CRE', 'CRE', 3],
    ['Business Studies', 'BUS', 3],
];
const departmentNames = ['Languages', 'Mathematics', 'Sciences', 'Humanities', 'Technical'];
const houseSeed = [
    ['Kifaru', '#10b981'],
    ['Simba', '#3b82f6'],
    ['Chui', '#f59e0b'],
    ['Twiga', '#ef4444'],
];
const gradeSeed = [
    ['Form 1', 1],
    ['Form 2', 2],
    ['Form 3', 3],
    ['Form 4', 4],
    ['Form 5', 5],
];
const streamSeed = ['East', 'West', 'North'];
const gradeScaleSeed = [
    ['A', 80, 100, 12, 'Excellent work, {student name}. Keep it up.'],
    ['B', 70, 79, 10, 'Good performance, {student name}. Aim higher.'],
    ['C', 60, 69, 8, 'Fair effort, {student name}. More practice will help.'],
    ['D', 50, 59, 6, 'Below average, {student name}. Improvement is needed.'],
    ['E', 0, 49, 2, 'Needs serious support, {student name}.'],
];

function chunk(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    return chunks;
}

async function failOn(error, label) {
    if (error) {
        console.error(`Failed at ${label}:`, error.message || error);
        process.exit(1);
    }
}

async function getOrCreate(table, match, payload) {
    const { data: existing, error: selectError } = await supabase.from(table).select('*').match(match).maybeSingle();
    await failOn(selectError, `${table} select`);
    if (existing) return existing;

    const { data, error } = await supabase.from(table).insert({ ...match, ...payload }).select().single();
    await failOn(error, `${table} insert`);
    return data;
}

function gradeFor(marks) {
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    if (marks >= 50) return 'D';
    return 'E';
}

function remarkFor(marks, name) {
    if (marks >= 80) return `Excellent work, ${name}. Keep it up.`;
    if (marks >= 70) return `Good performance, ${name}. Aim higher.`;
    if (marks >= 60) return `Fair effort, ${name}. More practice will help.`;
    if (marks >= 50) return `Below average, ${name}. Improvement is needed.`;
    return `Needs serious support, ${name}.`;
}

function marksFor(studentIndex, subjectIndex, classIndex) {
    const base = 48 + ((studentIndex * 7 + subjectIndex * 9 + classIndex * 5) % 47);
    return Math.max(32, Math.min(96, base));
}

async function main() {
    console.log(`Signing in as ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    await failOn(authError, 'sign in');

    const userId = authData.user.id;
    const { data: appUser, error: userError } = await supabase
        .from('users')
        .select('*, schools(*)')
        .eq('id', userId)
        .single();
    await failOn(userError, 'load app user');

    let school = appUser.schools;
    if (!school) {
        const created = await getOrCreate('schools', { email: 'demo.nexalms@gmail.com' }, {
            name: 'Nexa Demo Academy',
            phone: '+254719637416',
            county: 'Nairobi',
            school_type: 'secondary',
            curriculum: '844',
            is_setup_complete: true,
        });
        school = created;
        const { error } = await supabase.from('users').update({ school_id: school.id, is_admin: true }).eq('id', userId);
        await failOn(error, 'attach school to user');
    }

    console.log(`Seeding school: ${school.name} (${school.id})`);
    const schoolId = school.id;

    const { error: schoolUpdateError } = await supabase.from('schools').update({
        is_setup_complete: true,
        phone: school.phone || '+254719637416',
        county: school.county || 'Nairobi',
        website: school.website || 'https://nexagen.co.ke',
    }).eq('id', schoolId);
    await failOn(schoolUpdateError, 'school update');

    const plans = [
        ['Starter', 'starter', 5, ['Student Management', 'Teachers', 'Attendance']],
        ['Standard', 'standard', 7, ['Everything in Starter', 'Exams', 'Report Cards', 'Timetable']],
        ['Premium', 'premium', 10, ['Everything in Standard', 'Finance', 'Analytics', 'Priority Support']],
    ];
    for (const [name, plan_type, price_per_student, features] of plans) {
        const { data: plan } = await supabase.from('subscription_plans').select('id').eq('name', name).maybeSingle();
        const payload = { plan_type, price_per_student, features, is_active: true, description: `${name} NexaLMS package` };
        const result = plan
            ? await supabase.from('subscription_plans').update(payload).eq('id', plan.id)
            : await supabase.from('subscription_plans').insert({ name, ...payload });
        if (result.error) {
            console.warn(`Subscription plan DB update skipped for ${name}: ${result.error.message}`);
        }
    }

    const academicYear = await getOrCreate('academic_years', { school_id: schoolId, name: '2026 Academic Year' }, {
        start_date: '2026-01-05',
        end_date: '2026-11-20',
        is_current: true,
    });
    await supabase.from('academic_years').update({ is_current: false }).eq('school_id', schoolId).neq('id', academicYear.id);
    await supabase.from('academic_years').update({ is_current: true }).eq('id', academicYear.id);

    const terms = [];
    for (const term of [
        ['Term 1', 1, '2026-01-05', '2026-04-03'],
        ['Term 2', 2, '2026-05-04', '2026-08-07'],
        ['Term 3', 3, '2026-09-01', '2026-11-20'],
    ]) {
        terms.push(await getOrCreate('terms', { school_id: schoolId, academic_year_id: academicYear.id, name: term[0] }, {
            term_number: term[1],
            start_date: term[2],
            end_date: term[3],
            is_current: term[0] === 'Term 2',
        }));
    }
    const currentTerm = terms[1];

    const departments = [];
    for (const name of departmentNames) {
        departments.push(await getOrCreate('departments', { school_id: schoolId, name }, { description: `${name} department` }));
    }

    const grades = [];
    for (const [name, level_order] of gradeSeed) {
        grades.push(await getOrCreate('grade_levels', { school_id: schoolId, name }, { level_order }));
    }

    const streams = [];
    for (const name of streamSeed) {
        streams.push(await getOrCreate('streams', { school_id: schoolId, name }, { capacity: 45 }));
    }

    const classes = [];
    for (const grade of grades) {
        for (const stream of streams) {
            classes.push(await getOrCreate('classes', {
                school_id: schoolId,
                grade_level_id: grade.id,
                stream_id: stream.id,
                academic_year_id: academicYear.id,
            }, {
                name: `${grade.name} ${stream.name}`,
                capacity: 45,
            }));
        }
    }

    const houses = [];
    for (const [name, color] of houseSeed) {
        houses.push(await getOrCreate('houses', { school_id: schoolId, name }, { color, motto: `${name} leads with courage` }));
    }

    const subjects = [];
    for (let i = 0; i < subjectsSeed.length; i++) {
        const [name, code, lessons_per_week] = subjectsSeed[i];
        subjects.push(await getOrCreate('subjects', { school_id: schoolId, name }, {
            code,
            lessons_per_week,
            is_compulsory: true,
            category: i < 3 ? 'Core' : 'Elective',
            department_id: departments[i % departments.length].id,
        }));
    }

    for (const [grade, min_marks, max_marks, points, remarks] of gradeScaleSeed) {
        const existing = await supabase.from('grade_scales').select('id').eq('school_id', schoolId).eq('grade', grade).maybeSingle();
        if (existing.data) {
            await supabase.from('grade_scales').update({ min_marks, max_marks, points, remarks }).eq('id', existing.data.id);
        } else {
            await supabase.from('grade_scales').insert({ school_id: schoolId, grade, min_marks, max_marks, points, remarks });
        }
    }

    const teachers = [];
    for (let i = 0; i < 20; i++) {
        const gender = i % 2 === 0 ? 'male' : 'female';
        const first_name = gender === 'male' ? firstNamesMale[i % firstNamesMale.length] : firstNamesFemale[i % firstNamesFemale.length];
        const last_name = surnames[(i * 3) % surnames.length];
        const tsc_number = `NXATSC${String(i + 1).padStart(4, '0')}`;
        const existing = await supabase.from('teachers').select('*').eq('school_id', schoolId).eq('tsc_number', tsc_number).maybeSingle();
        if (existing.data) {
            teachers.push(existing.data);
        } else {
            const { data, error } = await supabase.from('teachers').insert({
                school_id: schoolId,
                first_name,
                last_name,
                email: `teacher${i + 1}@demo.gmail.com`,
                phone: `+254700${String(100000 + i).slice(0, 6)}`,
                gender,
                tsc_number,
                id_number: `30${String(100000 + i)}`,
                qualification: i % 3 === 0 ? 'B.Ed Arts' : i % 3 === 1 ? 'B.Ed Science' : 'Diploma in Education',
                specialization: subjects[i % subjects.length].name,
                employment_date: '2024-01-08',
                employment_type: 'permanent',
                status: 'active',
                department_id: departments[i % departments.length].id,
            }).select().single();
            await failOn(error, 'teacher insert');
            teachers.push(data);
        }
    }

    for (let i = 0; i < classes.length; i++) {
        const teacher = teachers[i % teachers.length];
        await supabase.from('classes').update({ class_teacher_id: teacher.id }).eq('id', classes[i].id);
        await supabase.from('teacher_class_assignments').upsert({
            school_id: schoolId,
            teacher_id: teacher.id,
            class_id: classes[i].id,
            academic_year_id: academicYear.id,
            is_class_teacher: true,
        }, { onConflict: 'teacher_id,class_id,academic_year_id' });
    }

    const assignmentRows = [];
    classes.forEach((cls, classIndex) => {
        subjects.forEach((subject, subjectIndex) => {
            const teacher = teachers[(classIndex + subjectIndex) % teachers.length];
            assignmentRows.push({
                school_id: schoolId,
                teacher_id: teacher.id,
                subject_id: subject.id,
                class_id: cls.id,
                academic_year_id: academicYear.id,
                lessons_per_week: subject.lessons_per_week || 4,
            });
        });
    });
    for (const rows of chunk(assignmentRows, 400)) {
        const { error } = await supabase.from('teacher_subject_assignments').upsert(rows, { onConflict: 'teacher_id,subject_id,class_id,academic_year_id' });
        await failOn(error, 'teacher subject assignments');
    }

    const guardianKeys = Array.from({ length: 300 }, (_, i) => `NXAG${String(i + 1).padStart(4, '0')}`);
    const { data: existingGuardians } = await supabase.from('guardians').select('*').eq('school_id', schoolId).in('national_id', guardianKeys);
    const guardianByKey = new Map((existingGuardians || []).map(g => [g.national_id, g]));
    const missingGuardians = guardianKeys.filter(key => !guardianByKey.has(key)).map((key, i) => ({
        school_id: schoolId,
        first_name: i % 2 === 0 ? 'Peter' : 'Jane',
        last_name: surnames[i % surnames.length],
        email: `guardian${i + 1}@demo.gmail.com`,
        phone: `+254711${String(200000 + i).slice(0, 6)}`,
        relationship: i % 2 === 0 ? 'father' : 'mother',
        occupation: i % 3 === 0 ? 'Business Owner' : i % 3 === 1 ? 'Teacher' : 'Farmer',
        address: 'Nairobi, Kenya',
        national_id: key,
    }));
    for (const rows of chunk(missingGuardians, 400)) {
        if (!rows.length) continue;
        const { data, error } = await supabase.from('guardians').insert(rows).select();
        await failOn(error, 'guardian insert');
        data.forEach(g => guardianByKey.set(g.national_id, g));
    }

    const admissionNumbers = Array.from({ length: 300 }, (_, i) => `NXA-DEMO-${String(i + 1).padStart(4, '0')}`);
    const { data: existingStudents } = await supabase.from('students').select('*').eq('school_id', schoolId).in('admission_number', admissionNumbers);
    const studentByAdm = new Map((existingStudents || []).map(s => [s.admission_number, s]));
    const missingStudents = [];

    for (let i = 0; i < 300; i++) {
        const admission = admissionNumbers[i];
        if (studentByAdm.has(admission)) continue;
        const gender = i % 2 === 0 ? 'male' : 'female';
        const first_name = gender === 'male' ? firstNamesMale[i % firstNamesMale.length] : firstNamesFemale[i % firstNamesFemale.length];
        const last_name = surnames[(i * 7) % surnames.length];
        const cls = classes[Math.floor(i / 20) % classes.length];
        missingStudents.push({
            school_id: schoolId,
            admission_number: admission,
            first_name,
            last_name,
            other_names: i % 5 === 0 ? 'Nexa' : null,
            gender,
            date_of_birth: `${2010 + (i % 5)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
            class_id: cls.id,
            house_id: houses[i % houses.length].id,
            guardian_id: guardianByKey.get(guardianKeys[i])?.id,
            status: 'active',
            admission_date: '2026-01-10',
            previous_school: i % 4 === 0 ? 'Nexa Junior School' : 'Green Valley Primary',
            medical_info: i % 17 === 0 ? 'Asthma - inhaler available' : null,
            special_needs: i % 29 === 0 ? 'Needs front-row seating' : null,
            religion: i % 3 === 0 ? 'Christian' : 'Muslim',
            fee_balance: 0,
            fee_balance_updated_at: new Date().toISOString(),
        });
    }
    for (const rows of chunk(missingStudents, 300)) {
        if (!rows.length) continue;
        const { data, error } = await supabase.from('students').insert(rows).select();
        await failOn(error, 'student insert');
        data.forEach(s => studentByAdm.set(s.admission_number, s));
    }

    const students = admissionNumbers.map(adm => studentByAdm.get(adm)).filter(Boolean);
    const studentUpdateTasks = students.map((student, i) => {
        const cls = classes[Math.floor(i / 20) % classes.length];
        const guardian = guardianByKey.get(guardianKeys[i]);
        student.class_id = cls.id;
        student.house_id = houses[i % houses.length].id;
        student.guardian_id = guardian?.id;
        return () => supabase.from('students').update({
            class_id: cls.id,
            house_id: houses[i % houses.length].id,
            guardian_id: guardian?.id,
            status: 'active',
        }).eq('id', student.id);
    });
    for (const tasks of chunk(studentUpdateTasks, 30)) {
        await Promise.all(tasks.map(task => task()));
    }

    const studentGuardianRows = students
        .map((student, i) => {
            const guardian = guardianByKey.get(guardianKeys[i]);
            return guardian?.id ? { student_id: student.id, guardian_id: guardian.id, is_primary: true } : null;
        })
        .filter(Boolean);
    for (const rows of chunk(studentGuardianRows, 400)) {
        const { error } = await supabase.from('student_guardians').upsert(rows, { onConflict: 'student_id,guardian_id' });
        await failOn(error, 'student guardian links');
    }

    const examType = await getOrCreate('exam_types', { school_id: schoolId, name: 'End Term' }, { weight: 100 });
    const exam = await getOrCreate('exams', {
        school_id: schoolId,
        name: 'End Term 2 2026 Demo Exam',
        exam_type_id: examType.id,
        term_id: currentTerm.id,
        academic_year_id: academicYear.id,
    }, {
        start_date: '2026-07-01',
        end_date: '2026-07-05',
        status: 'published',
    });
    await supabase.from('exams').update({ status: 'published' }).eq('id', exam.id);

    const resultRows = [];
    students.forEach((student, studentIndex) => {
        const classIndex = Math.floor(studentIndex / 20) % classes.length;
        subjects.forEach((subject, subjectIndex) => {
            const marks = marksFor(studentIndex, subjectIndex, classIndex);
            const teacher = teachers[(classIndex + subjectIndex) % teachers.length];
            resultRows.push({
                exam_id: exam.id,
                student_id: student.id,
                subject_id: subject.id,
                class_id: student.class_id || classes[classIndex].id,
                marks,
                grade: gradeFor(marks),
                remarks: remarkFor(marks, student.first_name),
                teacher_id: teacher.id,
                school_id: schoolId,
            });
        });
    });
    for (const rows of chunk(resultRows, 500)) {
        const { error } = await supabase.from('exam_results').upsert(rows, { onConflict: 'exam_id,student_id,subject_id' });
        await failOn(error, 'exam results');
    }

    const reportRows = students.map(student => {
        const studentResults = resultRows.filter(r => r.student_id === student.id);
        const total = studentResults.reduce((sum, r) => sum + r.marks, 0);
        const average = total / studentResults.length;
        return {
            school_id: schoolId,
            student_id: student.id,
            class_id: student.class_id,
            term_id: currentTerm.id,
            academic_year_id: academicYear.id,
            total_marks: total,
            average,
            grade: gradeFor(average),
            class_size: 20,
            teacher_remarks: remarkFor(average, student.first_name),
            principal_remarks: average >= 70 ? 'Very good performance.' : 'More effort and support recommended.',
            is_published: true,
        };
    });
    for (const rows of chunk(reportRows, 300)) {
        const { error } = await supabase.from('report_cards').upsert(rows, { onConflict: 'student_id,term_id,academic_year_id' });
        await failOn(error, 'report cards');
    }

    const tuition = await getOrCreate('fee_categories', { school_id: schoolId, name: 'Tuition' }, { description: 'Term tuition fee' });
    const activity = await getOrCreate('fee_categories', { school_id: schoolId, name: 'Activity' }, { description: 'Activity and clubs fee' });
    const feeCategories = [tuition, activity];
    for (const grade of grades) {
        for (const category of feeCategories) {
            const amount = category.name === 'Tuition' ? 28000 + grade.level_order * 1500 : 3500;
            const { data: existingFee } = await supabase
                .from('fee_structures')
                .select('id')
                .eq('school_id', schoolId)
                .eq('grade_level_id', grade.id)
                .eq('academic_year_id', academicYear.id)
                .eq('term_id', currentTerm.id)
                .eq('fee_category_id', category.id)
                .maybeSingle();
            if (existingFee) {
                await supabase.from('fee_structures').update({ amount, is_optional: false }).eq('id', existingFee.id);
            } else {
                await supabase.from('fee_structures').insert({
                    school_id: schoolId,
                    grade_level_id: grade.id,
                    academic_year_id: academicYear.id,
                    term_id: currentTerm.id,
                    fee_category_id: category.id,
                    amount,
                    is_optional: false,
                });
            }
        }
    }

    await supabase.from('fee_ledger').delete().eq('school_id', schoolId).like('reference_number', 'CHG-NXA-DEMO-%');
    await supabase.from('fee_ledger').delete().eq('school_id', schoolId).like('reference_number', 'PAY-NXA-DEMO-%');

    const ledgerRows = [];
    const balanceUpdates = [];
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        const cls = classes.find(c => c.id === student.class_id) || classes[Math.floor(i / 20) % classes.length];
        const grade = grades.find(g => g.id === cls.grade_level_id) || grades[0];
        const charge = 28000 + grade.level_order * 1500 + 3500;
        const paid = Math.round(charge * (0.35 + (i % 9) * 0.07));
        const balance = Math.max(charge - paid, 0);
        ledgerRows.push({
            school_id: schoolId,
            student_id: student.id,
            amount: charge,
            transaction_type: 'charge',
            description: 'Term 2 fee charge',
            payment_method: null,
            reference_number: `CHG-${student.admission_number}`,
            recorded_by: userId,
        });
        ledgerRows.push({
            school_id: schoolId,
            student_id: student.id,
            amount: paid,
            transaction_type: 'payment',
            description: 'Term 2 part payment',
            payment_method: i % 3 === 0 ? 'mpesa' : i % 3 === 1 ? 'bank' : 'cash',
            reference_number: `PAY-${student.admission_number}`,
            recorded_by: userId,
        });
        balanceUpdates.push(() => supabase.from('students').update({ fee_balance: balance, fee_balance_updated_at: new Date().toISOString() }).eq('id', student.id));
    }
    for (const tasks of chunk(balanceUpdates, 30)) {
        await Promise.all(tasks.map(task => task()));
    }
    for (const rows of chunk(ledgerRows, 500)) {
        const { error } = await supabase.from('fee_ledger').insert(rows);
        await failOn(error, 'fee ledger');
    }

    const attendanceDates = ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-06', '2026-07-07'];
    for (const date of attendanceDates) {
        for (const cls of classes) {
            const { data: session, error } = await supabase.from('attendance_sessions').upsert({
                school_id: schoolId,
                class_id: cls.id,
                date,
                session_type: 'morning',
                taken_by: userId,
            }, { onConflict: 'class_id,date,session_type' }).select().single();
            await failOn(error, 'attendance session');
            const classStudents = students.filter(s => s.class_id === cls.id);
            const attendanceRows = classStudents.map((student, idx) => ({
                session_id: session.id,
                student_id: student.id,
                status: idx % 23 === 0 ? 'absent' : idx % 19 === 0 ? 'late' : 'present',
                reason: idx % 23 === 0 ? 'Sick off' : null,
                school_id: schoolId,
            }));
            if (attendanceRows.length) {
                const { error: attError } = await supabase.from('student_attendance').upsert(attendanceRows, { onConflict: 'session_id,student_id' });
                await failOn(attError, 'student attendance');
            }
        }
    }

    for (const date of attendanceDates) {
        const { data: session, error } = await supabase.from('teacher_attendance_sessions').upsert({
            school_id: schoolId,
            date,
            session_type: 'full_day',
            taken_by: userId,
        }, { onConflict: 'school_id,date,session_type' }).select().single();
        await failOn(error, 'teacher attendance session');
        const rows = teachers.map((teacher, idx) => ({
            session_id: session.id,
            teacher_id: teacher.id,
            status: idx % 17 === 0 ? 'late' : 'present',
            reason: idx % 17 === 0 ? 'Morning traffic' : null,
            school_id: schoolId,
        }));
        const { error: teacherAttError } = await supabase.from('teacher_attendance').upsert(rows, { onConflict: 'session_id,teacher_id' });
        await failOn(teacherAttError, 'teacher attendance');
    }

    const settingsPayload = {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        term_name: 'Term 2',
        name: 'Term 2 2026 Demo Timetable',
        working_days: [0, 1, 2, 3, 4],
        lesson_duration_minutes: 40,
        periods_per_day: 7,
        school_start_time: '08:00',
        school_end_time: '15:30',
        min_teacher_lessons_per_day: 1,
        max_teacher_lessons_per_day: 6,
        min_class_lessons_per_day: 4,
        max_class_lessons_per_day: 7,
        breaks: [
            { name: 'Tea Break', start_time: '09:20', end_time: '09:40' },
            { name: 'Lunch', start_time: '11:40', end_time: '12:30' },
        ],
    };
    const existingSettings = await supabase.from('timetable_settings').select('id').eq('school_id', schoolId).eq('academic_year_id', academicYear.id).eq('term_name', 'Term 2').maybeSingle();
    if (existingSettings.data) await supabase.from('timetable_settings').update(settingsPayload).eq('id', existingSettings.data.id);
    else await supabase.from('timetable_settings').insert(settingsPayload);

    await supabase.from('timetables').update({ is_active: false, status: 'archived' }).eq('school_id', schoolId).eq('status', 'published');
    const timetable = await getOrCreate('timetables', {
        school_id: schoolId,
        academic_year_id: academicYear.id,
        term_id: currentTerm.id,
        name: 'Published Demo Timetable',
    }, {
        term_name: 'Term 2',
        version: 1,
        status: 'published',
        is_active: true,
        generated_at: new Date().toISOString(),
        generated_by: userId,
        settings_snapshot: settingsPayload,
    });
    await supabase.from('timetables').update({ status: 'published', is_active: true, term_name: 'Term 2' }).eq('id', timetable.id);
    await supabase.from('timetable_entries').delete().eq('timetable_id', timetable.id);

    const times = [
        ['08:00', '08:40'],
        ['08:40', '09:20'],
        ['09:40', '10:20'],
        ['10:20', '11:00'],
        ['11:00', '11:40'],
        ['12:30', '13:10'],
        ['13:10', '13:50'],
    ];
    const timetableRows = [];
    classes.forEach((cls, classIndex) => {
        for (let day = 0; day < 5; day++) {
            for (let period = 1; period <= 7; period++) {
                const subject = subjects[(classIndex + day + period) % subjects.length];
                const teacher = teachers[(classIndex + day + period) % teachers.length];
                timetableRows.push({
                    timetable_id: timetable.id,
                    class_id: cls.id,
                    subject_id: subject.id,
                    teacher_id: teacher.id,
                    day_of_week: day,
                    period_number: period,
                    start_time: times[period - 1][0],
                    end_time: times[period - 1][1],
                    room: `${cls.name.replace(/\s+/g, '-')}-${period}`,
                    school_id: schoolId,
                });
            }
        }
    });
    for (const rows of chunk(timetableRows, 500)) {
        const { error } = await supabase.from('timetable_entries').insert(rows);
        await failOn(error, 'timetable entries');
    }

    console.log('Demo seed complete.');
    console.log(`Students: ${students.length}`);
    console.log(`Teachers: ${teachers.length}`);
    console.log(`Classes: ${classes.length}`);
    console.log(`Subjects: ${subjects.length}`);
    console.log(`Exam results: ${resultRows.length}`);
    console.log(`Fee ledger entries inserted this run: ${ledgerRows.length}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
