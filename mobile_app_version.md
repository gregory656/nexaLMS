# NexaLMS Mobile App Version Blueprint

Project ref: `xgzdscebuznishsferce`  
Supabase URL: `https://xgzdscebuznishsferce.supabase.co`  
Suggested stack: React Native with Expo, TypeScript, Supabase JS, React Navigation, TanStack Query, Expo SecureStore.

## 1. Goal

Build a deep green themed mobile app for four audiences:

- Guests: public school profile, contact, announcements, demo access.
- Teachers: timetable, classes, subjects, learning content, assignments, submissions, duty roster, attendance, report-card support.
- Students: report cards, timetable, fee balance, learning materials, assignments, homework, discussions.
- Parents/Guardians: same learner view as students, plus fee balance and child switching when a parent has more than one learner.

The mobile app must read and write the same Supabase database as the admin web app. Admin actions on the web must appear in mobile immediately after sync or refresh.

## 2. Authentication Model

Use Supabase Auth for long-term reliability. Do not store raw admission numbers, TSC numbers, or phone numbers as plain passwords if this becomes production. For first release, support invitation or claim-code login.

Recommended login flow:

1. School username: each school has `schools.mobile_username`, generated from the first part of the school email, for example `@nexacademy`.
2. User identity:
   - Student: admission number.
   - Parent: phone number linked in guardians.
   - Teacher: TSC number, phone number, or email.
3. First-time verification:
   - Student enters school username + admission number + report card verification code.
   - Teacher enters school username + TSC/phone + OTP or admin-issued invite.
   - Parent enters school username + phone + OTP or learner report code.
4. After claim, create or link a Supabase Auth user and store the relation in `users`, `teachers`, `students`, or a future `guardian_user_links` table.

Practical Expo implementation:

- Use email/password or magic-link Supabase Auth for teachers and parents where possible.
- Use SecureStore for session persistence.
- Add an `app_profiles` table later if the mobile app needs profiles separate from admin users.

## 3. Role Detection

After login, query:

- `users` by `auth.uid()`.
- `teachers.user_id` for teacher profile.
- `students.user_id` if student accounts are added.
- guardian link table for parent-child mapping.

If a user has multiple roles, show a role picker after login.

## 4. Database Tables Mobile Will Use

Core existing tables:

- `schools`: school name, logo, theme, `principal_name`, `mobile_username`.
- `students`: student profile, class, admission number, fee balance.
- `guardians`: parent/guardian details.
- `teachers`: teacher profiles, TSC, phone, linked user.
- `classes`, `streams`, `grade_levels`: class identity.
- `subjects`: subject list.
- `teacher_subject_assignments`: teacher subject/class workload.
- `class_teacher_assignments`: class TR for report cards and class ownership.
- `exams`, `exam_results`, `grade_scales`, `report_cards`: results and reports.
- `timetable_settings`, `timetables`, `timetable_entries`: published timetable.
- `attendance_sessions`, `attendance_records`: attendance.
- `fees`, `fee_payments` or current finance tables: fee balance views.

New learning tables from migration `00010_report_cards_learning_mobile.sql`:

- `courses`
- `course_enrollments`
- `lesson_plans`
- `lessons`
- `learning_materials`
- `assignments`
- `assignment_submissions`
- `homework`
- `homework_submissions`
- `discussions`
- `discussion_replies`

## 5. App Screens

Guest screens:

- Welcome
- School lookup by `@schoolusername`
- School profile
- Contact school
- Public announcements/events
- Login / claim account

Teacher screens:

- Home dashboard: today timetable, pending submissions, classes, duty notes.
- Timetable: published teacher timetable, downloadable/shareable PDF or image.
- My Classes: class list from `teacher_subject_assignments` and `class_teacher_assignments`.
- Learning & Teaching:
  - Lesson plans
  - Lessons
  - Lesson resources
  - Assignments
  - Assignment submissions
  - Homework
  - Homework submissions
  - Discussions and replies
  - Courses
- Attendance: mark lesson/class attendance.
- Report support: see class report summaries and class TR remarks where permitted.
- Profile.

Student screens:

- Home dashboard: next lesson, fee balance, latest result, pending work.
- My Report Cards: list `report_cards` and exam results, open report PDF/HTML view.
- Results: subject marks, trend arrows, predictions.
- Timetable: published class timetable.
- Fees: balance and recent payments.
- Learning:
  - Courses
  - Materials
  - Assignments
  - Submit assignment
  - Homework
  - Discussions
- Profile.

Parent screens:

- Child switcher.
- Child dashboard.
- Report cards and results.
- Fee balance and payments.
- Timetable.
- Assignments/homework overview.
- Attendance summary.
- School events and announcements.

## 6. Report Card Mobile Behavior

The web admin generates report-card data and PDFs. Mobile should show:

- Student identity, class, exam, term.
- Subject table with marks, grade, development arrow: `0`, up, down.
- Subject TR remarks.
- Class TR remarks, class TR name, signature placeholder if PDF.
- Principal remarks, principal name, signature placeholder if PDF.
- Parent signature placeholder in PDF.
- Closing day, opening day, upcoming events.
- Prediction text.
- Multi-exam section when `report_cards.multi_exam_payload` exists.
- Verification code as report-card access code.

Report-card codes can be used to claim student/parent access, but after claim the app should create a real authenticated session.

## 7. Admin Web Actions And Mobile Effects

- Admin creates teacher in Staff: teacher can be linked to mobile login after `teachers.user_id` exists.
- Admin assigns Class TR: mobile teacher sees class ownership; report cards show the assigned name.
- Admin sets principal in Class TRs: new report cards and mobile school profile can display it.
- Admin creates exams/results: student/parent result screens update.
- Admin generates report cards: mobile report-card list updates.
- Admin publishes timetable: teacher/student timetable screens use the latest `timetables.status = 'published'`.
- Admin configures double lessons/breaks: mobile timetable must render break bands and double lessons.
- Admin adds learning materials/assignments later: mobile course screens update from learning tables.

Use TanStack Query cache keys by `school_id`, `student_id`, `teacher_id`, `class_id`, and `published timetable id`. Enable pull-to-refresh on every screen.

## 8. Expo Project Structure

Suggested folders:

```text
app/
  auth/
  guest/
  teacher/
  student/
  parent/
src/
  components/
  features/
    auth/
    timetable/
    reports/
    learning/
    fees/
  lib/
    supabase.ts
    queryClient.ts
  theme/
    colors.ts
```

Theme:

- Primary: deep green `#064e3b`
- Secondary: emerald `#10b981`
- Background: near white `#f8fafc`
- Text: `#0f172a`
- Warning: amber `#f59e0b`
- Danger: red `#dc2626`

## 9. Build Order

1. Create Expo TypeScript app.
2. Install Supabase, navigation, query, secure storage.
3. Add Supabase client using the same project URL and anon key.
4. Build school lookup and auth claim screens.
5. Build role detection.
6. Build student/parent dashboard first.
7. Build report cards and timetable.
8. Build teacher timetable and classes.
9. Build learning module screens.
10. Add offline caching for timetable, report cards, and materials.
11. Add push notifications for new assignments, results, fees, and events.
12. Test RLS with real teacher, student, and parent accounts.

## 10. Important Security Notes

- Never put the Supabase service role key in the mobile app.
- Use only anon key client-side.
- Enforce RLS policies for student/parent/teacher access before launch.
- Avoid permanent passwords based only on admission number, TSC, or phone. Use them only for claiming, then force OTP or password setup.
- Report-card verification codes should expire or rotate after account claim.

## 11. Minimum Mobile MVP

Ship first:

- School lookup
- Login/claim
- Student/parent dashboard
- Report cards
- Fee balance
- Timetable with breaks and double lessons
- Teacher timetable

Then add:

- Assignments/homework/materials
- Submissions
- Discussions
- Attendance
- Push notifications
