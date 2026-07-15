import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const seedSource = fs.readFileSync('seed_marks.mjs', 'utf8');
const extractRaw = (name) => {
  const match = seedSource.match(new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`));
  if (!match) throw new Error(`Could not extract ${name} from seed_marks.mjs`);
  return match[1];
};

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const cleanCell = (value) => value.replace(/\*\*/g, '').trim();
const normalize = (value) => cleanCell(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const parseRows = (rawText, isGrade8) => rawText
  .split('\n')
  .map((row) => row.trim())
  .filter(Boolean)
  .map((row) => {
    const parts = row.split('|').map((part) => part.trim()).filter((part) => part !== '');
    const nameIndex = isGrade8 ? 1 : 0;
    const marksStart = nameIndex + 1;
    const name = cleanCell(parts[nameIndex]);
    const marks = parts.slice(marksStart, marksStart + 9).map((mark) => {
      const cleaned = cleanCell(mark);
      if (!cleaned || cleaned === 'NULL' || cleaned === '—' || cleaned === 'â€”') return null;
      const parsed = Number.parseFloat(cleaned);
      return Number.isFinite(parsed) ? parsed : null;
    });
    return { name, marks };
  });

const subjectKeys = [
  ['eng', 'english'],
  ['kisw', 'kiswahili'],
  ['math', 'mathematics'],
  ['int', 'integrated', 'intergrated', 'science'],
  ['cre', 'christian'],
  ['pre', 'pret', 'pre-tech', 'pre tech'],
  ['cas', 'creative'],
  ['agr', 'agriculture'],
  ['sst', 'social'],
];

const must = async (label, query) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
};

const findSubject = (subjects, keys) => {
  const exact = subjects.find((subject) => keys.some((key) => normalize(subject.name) === normalize(key)));
  if (exact) return exact;
  return subjects.find((subject) => keys.some((key) => normalize(subject.name).includes(normalize(key))));
};

const gradeFromScale = (gradeScales, marks) =>
  gradeScales.find((scale) => marks >= scale.min_marks && marks <= scale.max_marks);

const remarksFor = (scale, marks, firstName) => {
  if (scale?.remarks) return scale.remarks.replace('{student name}', firstName).replace('{student_name}', firstName);
  if (marks >= 80) return `Excellent work, ${firstName}! Keep it up.`;
  if (marks >= 70) return `Good performance, ${firstName}. Aim higher.`;
  if (marks >= 60) return `Fair effort, ${firstName}. More practice needed.`;
  if (marks >= 50) return `Below average, ${firstName}. Must improve.`;
  return `Needs significant improvement, ${firstName}.`;
};

const pickStudent = (students, classId, fullName) => {
  const target = normalize(fullName);
  const sameClass = students.filter((student) => student.class_id === classId);
  const exact = sameClass
    .filter((student) => normalize(`${student.first_name} ${student.last_name}`) === target)
    .sort((a, b) => Number(a.first_name.includes('*') || a.last_name.includes('*')) - Number(b.first_name.includes('*') || b.last_name.includes('*')));
  if (exact.length) return exact[0];
  return null;
};

async function main() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kivaywa@gmail.com',
    password: '999888777Ss.',
  });
  if (authError) throw authError;

  let schoolId = authData.user.user_metadata?.school_id;
  if (!schoolId) {
    const users = await must('user school lookup', supabase.from('users').select('school_id').eq('id', authData.user.id).limit(1));
    schoolId = users[0]?.school_id;
  }
  if (!schoolId) throw new Error('Could not resolve school id');

  const [classes, subjects, exams, students, gradeScales] = await Promise.all([
    must('classes', supabase.from('classes').select('id,name').eq('school_id', schoolId)),
    must('subjects', supabase.from('subjects').select('id,name').eq('school_id', schoolId)),
    must('exams', supabase.from('exams').select('id,name').eq('school_id', schoolId)),
    must('students', supabase.from('students').select('id,first_name,last_name,class_id').eq('school_id', schoolId)),
    must('grade scales', supabase.from('grade_scales').select('*').eq('school_id', schoolId).order('min_marks', { ascending: false })),
  ]);

  const grade7Class = classes.find((item) => normalize(item.name) === 'grade 7 n a');
  const grade8Class = classes.find((item) => normalize(item.name) === 'grade 8 n a');
  const grade7Exam = exams.find((item) => normalize(item.name).includes('grade 7'));
  const grade8Exam = exams.find((item) => normalize(item.name).includes('grade 8'));
  if (!grade7Class || !grade8Class || !grade7Exam || !grade8Exam) {
    throw new Error('Could not resolve Grade 7/8 classes or exams');
  }

  const subjectOrder = subjectKeys.map((keys) => findSubject(subjects, keys));
  const missingSubjects = subjectOrder.map((subject, index) => subject ? null : subjectKeys[index][0]).filter(Boolean);
  if (missingSubjects.length) throw new Error(`Missing subjects: ${missingSubjects.join(', ')}`);

  const batches = [
    { label: 'Grade 7', rows: parseRows(extractRaw('grade7Raw'), false), classId: grade7Class.id, examId: grade7Exam.id },
    { label: 'Grade 8', rows: parseRows(extractRaw('grade8Raw'), true), classId: grade8Class.id, examId: grade8Exam.id },
  ];

  const results = [];
  const createdStudents = [];
  const renamedStudents = [];

  for (const batch of batches) {
    for (const row of batch.rows) {
      if (!row.marks.some((marks) => marks != null)) continue;
      let student = pickStudent(students, batch.classId, row.name);
      const [firstName, ...lastParts] = row.name.split(/\s+/);
      const lastName = lastParts.join(' ') || firstName;

      if (!student) {
        if (APPLY) {
          const inserted = await must('create student', supabase.from('students').insert({
            school_id: schoolId,
            first_name: firstName,
            last_name: lastName,
            class_id: batch.classId,
            status: 'active',
          }).select('id,first_name,last_name,class_id'));
          student = inserted[0];
          students.push(student);
        }
        createdStudents.push(`${batch.label}: ${row.name}`);
      } else if ((student.first_name.includes('*') || student.last_name.includes('*')) && APPLY) {
        await must('clean student name', supabase.from('students').update({
          first_name: firstName,
          last_name: lastName,
        }).eq('id', student.id).select('id'));
        renamedStudents.push(`${batch.label}: ${student.first_name} ${student.last_name} -> ${row.name}`);
        student.first_name = firstName;
        student.last_name = lastName;
      } else if (student.first_name.includes('*') || student.last_name.includes('*')) {
        renamedStudents.push(`${batch.label}: ${student.first_name} ${student.last_name} -> ${row.name}`);
      }

      if (!student) continue;
      row.marks.forEach((marks, index) => {
        if (marks == null) return;
        const subject = subjectOrder[index];
        const scale = gradeFromScale(gradeScales, marks);
        results.push({
          school_id: schoolId,
          exam_id: batch.examId,
          student_id: student.id,
          subject_id: subject.id,
          class_id: batch.classId,
          marks,
          grade: scale?.grade || null,
          remarks: remarksFor(scale, marks, firstName),
        });
      });
    }
  }

  const expectedByExamClass = new Map();
  for (const result of results) {
    const key = `${result.exam_id}:${result.class_id}`;
    expectedByExamClass.set(key, (expectedByExamClass.get(key) || 0) + 1);
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Grade 7 source rows: ${batches[0].rows.length}`);
  console.log(`Grade 8 source rows: ${batches[1].rows.length}`);
  console.log(`Prepared result rows: ${results.length}`);
  console.log(`Subjects: ${subjectOrder.map((subject) => subject.name).join(' | ')}`);
  console.log(`Students to create: ${createdStudents.length}`);
  console.log(`Students to rename: ${renamedStudents.length}`);
  if (createdStudents.length) console.log(createdStudents.slice(0, 20).join('\n'));
  if (renamedStudents.length) console.log(renamedStudents.slice(0, 20).join('\n'));

  if (!APPLY) return;

  await must('remove wrong Grade 7 rows from Grade 8 exam', supabase
    .from('exam_results')
    .delete()
    .eq('school_id', schoolId)
    .eq('exam_id', grade8Exam.id)
    .eq('class_id', grade7Class.id)
    .select('id'));

  for (const batch of batches) {
    await must(`clear ${batch.label} target results`, supabase
      .from('exam_results')
      .delete()
      .eq('school_id', schoolId)
      .eq('exam_id', batch.examId)
      .eq('class_id', batch.classId)
      .select('id'));
  }

  for (let index = 0; index < results.length; index += 100) {
    const chunk = results.slice(index, index + 100);
    await must('upsert result chunk', supabase
      .from('exam_results')
      .upsert(chunk, { onConflict: 'exam_id,student_id,subject_id' })
      .select('id'));
  }

  console.log('Applied corrected Grade 7 and Grade 8 results.');
  for (const [key, count] of expectedByExamClass.entries()) {
    console.log(`${key}: ${count}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
