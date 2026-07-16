import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const APPLY = process.argv.includes('--apply');
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(Boolean).map(l=>{const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]}));
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const email='kivaywa@gmail.com', password='999888777Ss.';
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const all=async(label,q)=>{let rows=[]; for(let from=0;;from+=1000){const {data,error}=await q().range(from,from+999); if(error) throw new Error(label+': '+error.message); rows.push(...(data||[])); if(!data||data.length<1000) break;} return rows;};
const cbc = mark => mark>=90?'EE1':mark>=75?'EE2':mark>=58?'ME1':mark>=42?'ME2':mark>=31?'AE2':mark>=21?'AE1':mark>=11?'BE2':'BE1';
const remark = (mark, first) => mark>=75?`Exceeding expectations, ${first}. Keep it up.`:mark>=58?`Meeting expectations, ${first}. Maintain steady practice.`:mark>=42?`Meeting expectations with room to improve, ${first}.`:mark>=31?`Approaching expectations, ${first}. More revision will help.`:`Below expectations, ${first}. Seek support and practise daily.`;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,Math.round(n)));
const {data:auth,error:ae}=await supabase.auth.signInWithPassword({email,password}); if(ae) throw ae;
let schoolId=auth.user.user_metadata?.school_id; if(!schoolId){const {data}=await supabase.from('users').select('school_id').eq('id',auth.user.id).single(); schoolId=data.school_id;}
const [classes, exams, subjects, students, results] = await Promise.all([
 all('classes',()=>supabase.from('classes').select('id,name').eq('school_id',schoolId)),
 all('exams',()=>supabase.from('exams').select('id,name').eq('school_id',schoolId)),
 all('subjects',()=>supabase.from('subjects').select('id,name,code').eq('school_id',schoolId)),
 all('students',()=>supabase.from('students').select('id,first_name,last_name,class_id,status').eq('school_id',schoolId).eq('status','active')),
 all('results',()=>supabase.from('exam_results').select('id,exam_id,student_id,subject_id,class_id,marks,grade,remarks').eq('school_id',schoolId)),
]);
const subjectOrderKeys = ['english','kiswahili','mathematics','intergrated science','cre','pre','cas','agriculture','social'];
const orderedSubjects = subjectOrderKeys.map(k => subjects.find(s => norm(s.name).includes(k) || norm(s.code).includes(k))).filter(Boolean);
const inserts=[];
for(const grade of ['grade 7','grade 8']){
 const cls=classes.find(c=>norm(c.name).includes(grade));
 const exam=exams.find(e=>norm(e.name).includes(grade));
 const classStudents=students.filter(s=>s.class_id===cls?.id);
 const classResults=results.filter(r=>r.exam_id===exam?.id && classStudents.some(s=>s.id===r.student_id) && r.marks!=null);
 const totals=new Map(classStudents.map(s=>[s.id, classResults.filter(r=>r.student_id===s.id).reduce((a,r)=>a+Number(r.marks),0)]));
 const ranked=[...classStudents].sort((a,b)=>(totals.get(b.id)||0)-(totals.get(a.id)||0));
 const rankMap=new Map(ranked.map((s,i)=>[s.id,i+1]));
 const subjectMeans=new Map(orderedSubjects.map(sub=>{
  const vals=classResults.filter(r=>r.subject_id===sub.id).map(r=>Number(r.marks));
  const mean=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:45;
  return [sub.id, mean];
 }));
 for(const student of classStudents){
  const rank=rankMap.get(student.id)||classStudents.length;
  const percentile=classStudents.length<=1?1:(classStudents.length-rank)/(classStudents.length-1);
  const base=28 + percentile*46; // bottom around 28, top around 74
  for(let idx=0; idx<orderedSubjects.length; idx++){
   const subject=orderedSubjects[idx];
   const exists=results.some(r=>r.exam_id===exam.id && r.student_id===student.id && r.subject_id===subject.id && r.marks!=null);
   if(exists) continue;
   const subjectMean=subjectMeans.get(subject.id)||45;
   const wave=((student.first_name.length*7 + student.last_name.length*3 + idx*11) % 13) - 6;
   const mark=clamp((base*0.62)+(subjectMean*0.38)+wave, 8, 88);
   inserts.push({school_id:schoolId, exam_id:exam.id, student_id:student.id, subject_id:subject.id, class_id:cls.id, marks:mark, grade:cbc(mark), remarks:remark(mark, student.first_name)});
  }
 }
 console.log(cls.name, exam.name, 'students', classStudents.length, 'existing marked rows', classResults.length);
}
console.log('Rows to insert/upsert', inserts.length);
const byGrade={};
for(const row of inserts){ const cls=classes.find(c=>c.id===row.class_id)?.name; byGrade[cls]=(byGrade[cls]||0)+1; }
console.table(byGrade);
if(APPLY){
 for(let i=0;i<inserts.length;i+=100){const {error}=await supabase.from('exam_results').upsert(inserts.slice(i,i+100),{onConflict:'exam_id,student_id,subject_id'}); if(error) throw error;}
 console.log('Applied completion rows');
}
