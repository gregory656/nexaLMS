import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('#'))
    .map((line) => {
      const index = line.indexOf('=');
      return [line.slice(0, index), line.slice(index + 1)];
    })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const normalize = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const isGradeTarget = (className) => ['grade 7', 'grade 8', 'grade 9']
  .some((grade) => normalize(className).includes(grade));

const isPreSubject = (subject) => {
  const value = normalize(`${subject.name || ''} ${subject.code || ''}`);
  return value.includes('pre') || value.includes('technical') || value.includes('pret');
};

const cbcScales = [
  ['EE1', 90, 100, 8, 'Exceeding expectations'],
  ['EE2', 75, 89, 7, 'Exceeding expectations'],
  ['ME1', 58, 74, 6, 'Meeting expectations'],
  ['ME2', 42, 57, 5, 'Meeting expectations'],
  ['AE2', 31, 40, 4, 'Approaching expectations'],
  ['AE1', 21, 30, 3, 'Approaching expectations'],
  ['BE2', 11, 20, 2, 'Below expectations'],
  ['BE1', 1, 10, 1, 'Below expectations'],
];

const cbcGradeNames = new Set(cbcScales.map(([grade]) => grade));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const must = async (label, queryFactory) => {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const { data, error } = await (typeof queryFactory === 'function' ? queryFactory() : queryFactory);
    if (!error) return data || [];
    lastError = error;
    if (!/fetch failed|timeout|network/i.test(error.message || String(error))) break;
    await sleep(1000 * attempt);
  }
  throw new Error(`${label}: ${lastError?.message || lastError}`);
};

const fetchAll = async (label, makeQuery, pageSize = 1000) => {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
};

const gradeFromScale = (gradeScales, marks) =>
  gradeScales.find((scale) => Number(marks) >= Number(scale.min_marks) && Number(marks) <= Number(scale.max_marks));

const remarksFor = (scale, marks, firstName) => {
  if (scale?.remarks) return scale.remarks.replace('{student name}', firstName).replace('{student_name}', firstName);
  if (marks >= 75) return `Strong performance, ${firstName}. Keep improving.`;
  if (marks >= 58) return `Good progress, ${firstName}. Maintain consistent practice.`;
  if (marks >= 42) return `Fair effort, ${firstName}. More revision will help.`;
  return `More support and regular practice will help, ${firstName}.`;
};

async function main() {
  const email = env.SEED_EMAIL || env.VITE_SEED_EMAIL || 'kivaywa@gmail.com';
  const password = env.SEED_PASSWORD || env.VITE_SEED_PASSWORD || '999888777Ss.';
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
  if (authError) throw authError;

  let schoolId = authData.user.user_metadata?.school_id;
  if (!schoolId) {
    const users = await must('user school lookup', () => supabase.from('users').select('school_id').eq('id', authData.user.id).limit(1));
    schoolId = users[0]?.school_id;
  }
  if (!schoolId) throw new Error('Could not resolve school id');

  const [classes, subjects, exams, students, results, gradeScales] = await Promise.all([
    must('classes', () => supabase.from('classes').select('id,name').eq('school_id', schoolId)),
    must('subjects', () => supabase.from('subjects').select('id,name,code').eq('school_id', schoolId)),
    must('exams', () => supabase.from('exams').select('id,name').eq('school_id', schoolId)),
    must('students', () => supabase.from('students').select('id,first_name,last_name,class_id,status').eq('school_id', schoolId).eq('status', 'active')),
    fetchAll('exam_results', () => supabase.from('exam_results').select('id,exam_id,student_id,subject_id,class_id,marks,grade,remarks').eq('school_id', schoolId)),
    must('grade scales', () => supabase.from('grade_scales').select('*').eq('school_id', schoolId).order('min_marks', { ascending: false })),
  ]);

  const legacyScales = gradeScales.filter((scale) => !cbcGradeNames.has(scale.grade));
  const existingCbc = new Map(gradeScales.filter((scale) => cbcGradeNames.has(scale.grade)).map((scale) => [scale.grade, scale]));

  const targetClasses = classes.filter((item) => isGradeTarget(item.name));
  const preSubjects = subjects.filter(isPreSubject);
  const canonicalPre = preSubjects.find((subject) => normalize(subject.name).includes('pre technical'))
    || preSubjects.find((subject) => normalize(subject.name).includes('pre'))
    || preSubjects[0];

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Target classes: ${targetClasses.map((item) => item.name).join(' | ') || 'none'}`);
  console.log(`PRE subjects: ${preSubjects.map((item) => `${item.name} (${item.id})`).join(' | ') || 'none'}`);
  if (!canonicalPre) throw new Error('No PRE/Pre-Technical subject found');

  const updates = [];
  const copies = [];
  const coverageRows = [];

  for (const classItem of targetClasses) {
    const classStudents = students.filter((student) => student.class_id === classItem.id);
    const classExamIds = [...new Set(results
      .filter((result) => result.class_id === classItem.id || classStudents.some((student) => student.id === result.student_id))
      .map((result) => result.exam_id))];

    for (const examId of classExamIds) {
      const exam = exams.find((item) => item.id === examId);
      const examClassResults = results.filter((result) => result.exam_id === examId && classStudents.some((student) => student.id === result.student_id));
      const preRows = examClassResults.filter((result) => preSubjects.some((subject) => subject.id === result.subject_id) && result.marks != null);
      const canonicalRows = examClassResults.filter((result) => result.subject_id === canonicalPre.id && result.marks != null);

      coverageRows.push({
        className: classItem.name,
        examName: exam?.name || examId,
        students: classStudents.length,
        preRows: canonicalRows.length,
        allPreLikeRows: preRows.length,
      });

      if (canonicalRows.length === 0 && preRows.length > 0) {
        for (const source of preRows) {
          if (source.subject_id === canonicalPre.id) continue;
          const exists = examClassResults.some((result) => result.student_id === source.student_id && result.subject_id === canonicalPre.id);
          if (exists) continue;
          const student = students.find((item) => item.id === source.student_id);
          const scale = gradeFromScale(gradeScales, source.marks);
          copies.push({
            school_id: schoolId,
            exam_id: source.exam_id,
            student_id: source.student_id,
            subject_id: canonicalPre.id,
            class_id: classItem.id,
            marks: source.marks,
            grade: scale?.grade || source.grade || null,
            remarks: source.remarks || remarksFor(scale, Number(source.marks), student?.first_name || 'Learner'),
          });
        }
      }

      for (const result of examClassResults) {
        if (result.marks == null) continue;
        const student = students.find((item) => item.id === result.student_id);
        const scale = cbcScales
          .map(([grade, min_marks, max_marks, points, remarks]) => ({ grade, min_marks, max_marks, points, remarks }))
          .find((item) => Number(result.marks) >= Number(item.min_marks) && Number(result.marks) <= Number(item.max_marks));
        if (!scale) continue;
        if (result.grade === scale.grade && result.remarks) continue;
        updates.push({
          id: result.id,
          grade: scale.grade,
          remarks: result.remarks || remarksFor(scale, Number(result.marks), student?.first_name || 'Learner'),
        });
      }
    }
  }

  console.table(coverageRows);
  console.log(`Legacy grade-scale rows to remove: ${legacyScales.map((item) => item.grade).join(', ') || 'none'}`);
  console.log(`CBC grade-scale rows to upsert: ${cbcScales.length}`);
  console.log(`Grade/remark rows to repair: ${updates.length}`);
  console.log(`PRE rows to copy from duplicate PRE subjects: ${copies.length}`);

  if (!APPLY) return;

  for (const legacy of legacyScales) {
    await must('delete legacy grade scale', () => supabase
      .from('grade_scales')
      .delete()
      .eq('id', legacy.id)
      .select('id'));
  }

  for (const [grade, min_marks, max_marks, points, remarks] of cbcScales) {
    const existing = existingCbc.get(grade);
    const payload = { school_id: schoolId, grade, min_marks, max_marks, points, remarks };
    if (existing) {
      await must('update CBC grade scale', () => supabase
        .from('grade_scales')
        .update(payload)
        .eq('id', existing.id)
        .select('id'));
    } else {
      await must('insert CBC grade scale', () => supabase
        .from('grade_scales')
        .insert(payload)
        .select('id'));
    }
  }

  for (const update of updates) {
    await must('update result grade', () => supabase
      .from('exam_results')
      .update({ grade: update.grade, remarks: update.remarks })
      .eq('id', update.id)
      .select('id'));
  }

  for (let index = 0; index < copies.length; index += 100) {
    await must('copy PRE rows', () => supabase
      .from('exam_results')
      .upsert(copies.slice(index, index + 100), { onConflict: 'exam_id,student_id,subject_id' })
      .select('id'));
  }

  console.log('Applied Grade 7/8/9 grade repairs and safe PRE copies.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
