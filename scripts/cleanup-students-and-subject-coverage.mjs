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

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const normalize = (value) => String(value || '')
  .replace(/\*+/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

const cleanName = (student) => {
  const full = `${student.first_name || ''} ${student.last_name || ''}`.replace(/\*+/g, '').trim().replace(/\s+/g, ' ');
  const [firstName, ...lastParts] = full.split(/\s+/);
  return { first_name: firstName || student.first_name, last_name: lastParts.join(' ') || student.last_name || firstName };
};

const must = async (label, query) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
};

const resultKey = (result) => `${result.exam_id}|${result.subject_id}`;

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

  const [classes, students, results, subjects, exams] = await Promise.all([
    must('classes', supabase.from('classes').select('id,name').eq('school_id', schoolId)),
    must('students', supabase.from('students').select('*').eq('school_id', schoolId)),
    must('exam_results', supabase.from('exam_results').select('*').eq('school_id', schoolId).range(0, 20000)),
    must('subjects', supabase.from('subjects').select('id,name').eq('school_id', schoolId)),
    must('exams', supabase.from('exams').select('id,name').eq('school_id', schoolId)),
  ]);

  const className = (id) => classes.find((item) => item.id === id)?.name || 'No class';
  const groups = new Map();
  for (const student of students.filter((item) => item.status === 'active')) {
    const key = `${student.class_id}|${normalize(`${student.first_name} ${student.last_name}`)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(student);
  }

  const duplicateGroups = [...groups.values()].filter((group) => group.length > 1);
  let duplicateDeletes = 0;
  let resultMoves = 0;
  let resultDeletes = 0;
  let nameUpdates = 0;

  for (const group of duplicateGroups) {
    const ranked = [...group].sort((a, b) => {
      const aResults = results.filter((result) => result.student_id === a.id);
      const bResults = results.filter((result) => result.student_id === b.id);
      const aScore = aResults.length * 10 + (a.admission_number ? 3 : 0) - (String(a.first_name + a.last_name).includes('*') ? 5 : 0);
      const bScore = bResults.length * 10 + (b.admission_number ? 3 : 0) - (String(b.first_name + b.last_name).includes('*') ? 5 : 0);
      return bScore - aScore;
    });
    const keeper = ranked[0];
    const clean = cleanName(keeper);
    if ((keeper.first_name !== clean.first_name || keeper.last_name !== clean.last_name) && APPLY) {
      await must('clean keeper name', supabase.from('students').update(clean).eq('id', keeper.id).select('id'));
    }
    if (keeper.first_name !== clean.first_name || keeper.last_name !== clean.last_name) nameUpdates++;

    const keeperResults = results.filter((result) => result.student_id === keeper.id);
    const keeperKeys = new Set(keeperResults.map(resultKey));

    for (const duplicate of ranked.slice(1)) {
      const duplicateResults = results.filter((result) => result.student_id === duplicate.id);
      for (const result of duplicateResults) {
        if (keeperKeys.has(resultKey(result))) {
          resultDeletes++;
          if (APPLY) await must('delete duplicate result', supabase.from('exam_results').delete().eq('id', result.id).select('id'));
        } else {
          resultMoves++;
          keeperKeys.add(resultKey(result));
          if (APPLY) await must('move duplicate result', supabase.from('exam_results').update({ student_id: keeper.id }).eq('id', result.id).select('id'));
        }
      }
      duplicateDeletes++;
      if (APPLY) await must('delete duplicate student', supabase.from('students').delete().eq('id', duplicate.id).select('id'));
    }
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const coverageRows = [];
  const freshStudents = APPLY
    ? await must('students after cleanup', supabase.from('students').select('*').eq('school_id', schoolId).eq('status', 'active'))
    : students.filter((item) => item.status === 'active');
  const freshResults = APPLY
    ? await must('results after cleanup', supabase.from('exam_results').select('*').eq('school_id', schoolId).range(0, 20000))
    : results;

  for (const exam of exams) {
    const examResults = freshResults.filter((result) => result.exam_id === exam.id);
    const classIdsWithResults = new Set(examResults.map((result) => result.class_id));
    for (const classId of classIdsWithResults) {
      for (const student of freshStudents.filter((item) => item.class_id === classId)) {
        const studentResults = examResults.filter((result) => result.student_id === student.id && result.class_id === classId);
        if (!studentResults.length) continue;
        const existing = new Set(studentResults.map((result) => result.subject_id));
        for (const subjectId of subjectIds) {
          if (!existing.has(subjectId)) {
            coverageRows.push({
              school_id: schoolId,
              exam_id: exam.id,
              student_id: student.id,
              subject_id: subjectId,
              class_id: classId,
              marks: 0,
              grade: null,
              remarks: 'No mark recorded',
            });
          }
        }
      }
    }
  }

  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}`);
  console.log(`Active students before: ${students.filter((item) => item.status === 'active').length}`);
  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Duplicate student deletes: ${duplicateDeletes}`);
  console.log(`Result moves: ${resultMoves}`);
  console.log(`Result deletes: ${resultDeletes}`);
  console.log(`Name cleanups: ${nameUpdates}`);
  console.log(`Missing subject rows to add: ${coverageRows.length}`);
  duplicateGroups.slice(0, 12).forEach((group) => {
    console.log(`${className(group[0].class_id)}: ${group.map((student) => `${student.first_name} ${student.last_name}`).join(' | ')}`);
  });

  if (!APPLY) return;

  for (let index = 0; index < coverageRows.length; index += 100) {
    await must('insert coverage rows', supabase.from('exam_results').upsert(coverageRows.slice(index, index + 100), {
      onConflict: 'exam_id,student_id,subject_id',
    }).select('id'));
  }

  const finalStudents = await must('final students', supabase.from('students').select('id,status').eq('school_id', schoolId).eq('status', 'active'));
  console.log(`Active students after: ${finalStudents.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
