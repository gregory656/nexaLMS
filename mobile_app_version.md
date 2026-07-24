# Nexa School Mobile App - Paste-Ready Build Prompt

Use this entire document as the build prompt for the React Native AI coder.

## Mission

Build a production-minded mobile app named **Nexa School** from scratch using **React Native Expo + TypeScript**. The app must connect to the same Supabase backend used by the NexaLMS admin web app. It will serve **Guests, Teachers, Students, and Parents/Guardians**.

This is not a marketing app. Build the real school portal experience.

The theme should feel premium, calm, academic, and modern. Use a **deep green identity** with clean cards, dense dashboards, readable tables, offline-friendly screens, and strong mobile ergonomics.

## Backend Connection

Use this Supabase project:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xgzdscebuznishsferce.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<use-the-same-anon-key-from-the-web-env>
```

Project ref: `xgzdscebuznishsferce`

Never use the Supabase service role key in the app.

## Required Tech Stack

Use:

- Expo
- React Native
- TypeScript
- Expo Router
- Supabase JS
- TanStack Query
- Zustand or lightweight Context for app session state
- Expo SecureStore for auth/session persistence
- React Native Reanimated
- React Native SVG
- Expo FileSystem
- Expo Sharing
- Expo Notifications
- date-fns

Suggested setup:

```bash
npx create-expo-app NexaSchool --template
npx expo install expo-secure-store expo-file-system expo-sharing expo-notifications react-native-svg
npm install @supabase/supabase-js @tanstack/react-query zustand date-fns
```

## Visual Direction

App name: **Nexa School**

Colors:

- Primary deep green: `#064E3B`
- Primary green: `#047857`
- Emerald: `#10B981`
- Soft green surface: `#ECFDF5`
- Background: `#F8FAFC`
- Card: `#FFFFFF`
- Text: `#0F172A`
- Muted text: `#64748B`
- Border: `#E2E8F0`
- Warning: `#F59E0B`
- Danger: `#DC2626`
- Info: `#2563EB`

Design rules:

- Use a bottom tab layout after login.
- Use role-specific dashboards.
- Use compact cards, not oversized landing-page sections.
- Timetables must be readable from a distance: strong break rows, clear double lesson bands, bold subject names.
- Report cards must feel premium: summary stats, subject marks, graph, predictions, teacher remarks, principal remarks, dates, school username, verification code.
- Avoid clutter. Tables must scroll horizontally when needed.
- Do not let long exam names break layouts. Display short labels like `Test 1`, `Test 2`, `Test 3`, then show a mapping sheet or small subtitle with the real exam names.

## App Routes

Use Expo Router structure:

```text
app/
  _layout.tsx
  index.tsx
  (auth)/
    school-lookup.tsx
    login.tsx
    claim.tsx
    role-picker.tsx
  (guest)/
    home.tsx
    school-profile.tsx
    contact.tsx
  (student)/
    _layout.tsx
    home.tsx
    reports.tsx
    report-detail.tsx
    timetable.tsx
    fees.tsx
    learning.tsx
    assignments.tsx
    discussions.tsx
    profile.tsx
  (parent)/
    _layout.tsx
    home.tsx
    children.tsx
    reports.tsx
    timetable.tsx
    fees.tsx
    learning.tsx
    attendance.tsx
    profile.tsx
  (teacher)/
    _layout.tsx
    home.tsx
    timetable.tsx
    classes.tsx
    learning.tsx
    assignments.tsx
    submissions.tsx
    attendance.tsx
    reports.tsx
    profile.tsx
src/
  components/
    AppButton.tsx
    AppCard.tsx
    EmptyState.tsx
    MetricCard.tsx
    Screen.tsx
    StatusBadge.tsx
    TimetableGrid.tsx
    ReportCardView.tsx
  features/
    auth/
    reports/
    timetable/
    learning/
    fees/
    attendance/
  lib/
    supabase.ts
    queryClient.ts
    secureStorage.ts
    format.ts
  store/
    sessionStore.ts
  theme/
    colors.ts
    spacing.ts
    typography.ts
```

## Core Tables

Read and write against these tables from the existing NexaLMS database:

- `schools`
- `users`
- `students`
- `guardians`
- `teachers`
- `classes`
- `streams`
- `grade_levels`
- `subjects`
- `teacher_subject_assignments`
- `class_teacher_assignments`
- `exams`
- `exam_results`
- `grade_scales`
- `report_cards`
- `timetable_settings`
- `timetables`
- `timetable_entries`
- `attendance_sessions`
- `attendance_records`
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

Important fields added for mobile/report work:

- `schools.principal_name`
- `schools.mobile_username`
- `class_teacher_assignments.teacher_id`
- `report_cards.report_version`
- `report_cards.verification_code`
- `report_cards.closing_date`
- `report_cards.opening_date`
- `report_cards.upcoming_events`
- `report_cards.prediction`
- `report_cards.multi_exam_payload`
- `timetable_entries.duration_periods`
- `timetable_entries.is_double_lesson`
- `timetable_settings.double_lessons`

## Authentication And Account Claiming

Build login around school username first.

Step 1: School Lookup

- User enters `@schoolusername`, for example `@nexacademy`.
- Query:

```ts
const { data: school } = await supabase
  .from('schools')
  .select('*')
  .eq('mobile_username', username.toLowerCase())
  .maybeSingle();
```

- Save selected school in SecureStore.
- Show school name, logo, motto, and login options.

Step 2: Choose Portal

Options:

- Teacher
- Student
- Parent / Guardian
- Guest

Step 3: Claim/Login Rules

Student first-time claim:

- Inputs: school username, admission number, report card verification code.
- Check `students` by `school_id` and `admission_number`.
- Check latest `report_cards.verification_code` for that student if available.
- If valid, create/link an auth identity. If direct Supabase auth creation is not available client-side, mark this as pending and show “Ask admin to activate mobile access.”
- After active login, student should use proper Supabase Auth session.

Parent first-time claim:

- Inputs: school username, guardian phone, student admission number or report code.
- Query guardian/student relationship. If the schema does not yet have guardian-student link, create a local placeholder interface and document required table:

```sql
guardian_student_links(
  id uuid primary key,
  school_id uuid,
  guardian_id uuid,
  student_id uuid,
  relationship text
)
```

Teacher first-time claim:

- Inputs: school username, TSC number or phone number.
- Query `teachers` by `school_id` and `tsc_number` or `phone`.
- If `teachers.user_id` exists, allow Supabase login.
- If not, show “Mobile account not activated. Ask admin to link your staff account.”

Returning login:

- Use Supabase Auth email/password or magic link.
- Persist session with SecureStore.

Role detection:

- Query `users` by `auth.uid()`.
- Query `teachers.user_id`.
- Query `students.user_id` when available.
- Query guardian links when available.
- If multiple roles exist, show Role Picker.

## Guest Experience

Guest screens:

- School profile
- Contact school
- Public announcements placeholder
- Login/claim CTA

Guest home content:

- School logo
- School name
- Motto
- Phone/email/address
- App username
- “Continue as Teacher”
- “Continue as Student”
- “Continue as Parent”

## Student Experience

Student bottom tabs:

- Home
- Reports
- Timetable
- Learning
- Profile

Student Home:

- Greeting
- School and class
- Next lesson card from published timetable
- Latest report card summary
- Fee balance card
- Pending assignments/homework
- Upcoming school events from latest report card or announcements

Student Reports:

- List report cards by newest.
- If `report_cards` rows are not fully populated yet, build report views from `exam_results`.
- Show:
  - Exam name
  - Term/year
  - Mean
  - Grade
  - Position
  - Report version
  - Verification code

Student Report Detail:

- Premium report view, mobile-native.
- Header: school name, username, student, class, admission number.
- Summary: total, mean, grade, rank, class size.
- Multi-test table:
  - Columns: Subject, Test 1, Test 2, Test 3, Avg, Dev.
  - Never use long exam names as table headers.
  - Show mapping below: `Test 1 = End Term 1 2026`.
- Subject table:
  - Subject
  - Marks
  - Grade
  - Dev arrow
  - Subject TR remarks
  - Teacher
- Graph:
  - Subject performance bars
  - Student vs class average where available
- Prediction:
  - Show projected next mean and strongest/focus areas.
- Remarks:
  - Class TR remarks in quoted card.
  - Principal remarks in quoted card.
  - Show class TR name and principal name.
- Footer:
  - Closing day
  - Opening day
  - Upcoming events
  - Report version
  - Verification code

Student Timetable:

- Query latest published timetable:

```ts
const { data: timetable } = await supabase
  .from('timetables')
  .select('*')
  .eq('school_id', schoolId)
  .eq('status', 'published')
  .order('version', { ascending: false })
  .limit(1)
  .maybeSingle();
```

- Query `timetable_entries` for student class.
- Render by day and time.
- Breaks must be visible.
- Double lessons must show:
  - Subject
  - Teacher
  - `Double Lesson`
  - Time from/to

Student Learning:

- Courses
- Materials
- Assignments
- Assignment submission
- Homework
- Homework submission
- Discussions
- Discussion replies

## Parent Experience

Parent bottom tabs:

- Home
- Children
- Reports
- Fees
- Profile

Parent Home:

- Child switcher at top.
- Same academic view as student for selected child.
- Fee balance more prominent.
- Attendance summary.
- Upcoming events.

Parent Reports:

- Same as student report screens.
- Parent can download/share report if PDF export is implemented.

Parent Fees:

- Fee balance
- Last update date
- Payment history if finance payment table exists
- If payment table is unclear, show fee balance from `students.fee_balance`.

Parent Learning:

- Read-only assignments/homework status for child.
- No submission editing unless explicitly allowed.

## Teacher Experience

Teacher bottom tabs:

- Home
- Timetable
- Classes
- Learning
- Profile

Teacher Home:

- Today lessons
- Double lesson highlights
- Classes taught
- Pending submissions
- Duty roster placeholder
- Quick actions:
  - Add lesson note
  - Create assignment
  - Review submissions
  - Mark attendance

Teacher Timetable:

- Query published timetable entries by `teacher_id`.
- Display week grid.
- Breaks visible.
- Double lessons visible with time from/to.
- Allow share/download as image or PDF later.

Teacher Classes:

- Classes from:
  - `teacher_subject_assignments`
  - `class_teacher_assignments`
- Show subject, class, lessons per week.
- If class TR, show badge `Class TR`.

Teacher Learning:

- Courses assigned to teacher.
- Lesson plans.
- Lessons.
- Learning materials upload/link.
- Assignments.
- Homework.
- Discussions.

Teacher Assignments:

- Create assignment:
  - Course
  - Class
  - Title
  - Instructions
  - Due date
  - Max score
  - Status draft/published
- Review submissions:
  - Student
  - Submitted at
  - File/text
  - Score
  - Feedback

Teacher Attendance:

- Select class.
- Select date.
- Mark present/absent/late.
- Save to attendance tables.

Teacher Reports:

- For class TRs only:
  - View class report summary.
  - See students, mean, rank, focus areas.
  - Read report card remarks.

## Learning Module Behavior

Course:

- A course links school, subject, class, teacher.
- Students enroll through `course_enrollments`.
- Teachers see courses where `teacher_id` matches.
- Students see courses where enrollment matches or class matches.

Materials:

- File URL or external URL.
- Show title, type, date.
- Open external links.
- Download files using Expo FileSystem.

Assignments/Homework:

- Teacher creates.
- Student submits.
- Parent views status.
- Teacher scores and comments.

Discussions:

- Course thread.
- Students and teachers can reply.
- Parent read-only unless allowed later.

## Data Access Helpers

Create helpers:

```ts
getSchoolByUsername(username)
getCurrentUserProfile()
getTeacherProfile(userId)
getStudentProfile(userId)
getChildrenForGuardian(userId)
getPublishedTimetable(schoolId)
getClassTimetable(timetableId, classId)
getTeacherTimetable(timetableId, teacherId)
getStudentReportCards(studentId)
getStudentExamResults(studentId)
getCoursesForTeacher(teacherId)
getCoursesForStudent(studentId, classId)
```

Use TanStack Query for all server data. Cache keys must include school and role identifiers:

```ts
['school', username]
['student', studentId]
['reports', studentId]
['timetable', schoolId, classId]
['teacher-timetable', teacherId]
['courses', role, id]
```

## Offline Strategy

Cache these for offline read:

- Selected school
- Session
- Student profile
- Latest report cards
- Published timetable
- Fee balance
- Learning materials metadata

Use SecureStore only for session/sensitive tiny values. Use normal async storage or query persistence for non-sensitive cached data if added.

When offline:

- Show cached timetable.
- Show cached report card.
- Disable submissions with clear state.

## Notifications

Prepare notification categories:

- New report card published
- New assignment
- Homework due soon
- Fee balance updated
- Timetable updated
- Upcoming opening/closing day

Do not implement server push unless backend functions exist. Build client permission and placeholder subscription layer.

## Report Card Rendering Rules

Implement `ReportCardView` carefully:

- Never overlap text.
- Use horizontal scroll for wide tables.
- Long exam names must not be table headers.
- Use `Test 1`, `Test 2`, `Test 3` headers.
- Put long exam names in small mapping rows.
- Put class TR and principal remarks inside separate quoted cards.
- Put closing/opening/events in footer section.
- Show school app username clearly.
- Use development arrows:
  - Flat: `0`
  - Up: upward arrow icon
  - Down: downward arrow icon
- If no previous data, show flat.

## Timetable Rendering Rules

Build `TimetableGrid`:

- Day selector pills.
- Rows ordered by start time.
- Break row:
  - Full width green-tinted band.
  - Break name large.
  - Time below.
- Double lesson:
  - Larger lesson block.
  - Label `Double Lesson`.
  - Show time from/to.
- Normal lesson:
  - Subject bold.
  - Teacher/class smaller.
- If no lesson, show light empty slot.

## RLS And Security Expectations

The current web app is admin-first. Before production mobile launch, confirm RLS:

- Students only read their own student row, reports, results, timetable, courses.
- Parents only read linked children.
- Teachers only read their assigned classes/courses/submissions.
- Guests only read public school profile.
- Writes to submissions only allowed for the owning student.
- Writes to assignments/materials only allowed for teachers/admin.

If RLS blocks a screen, build UI error states and document which policy is missing.

## First Build Milestone

Implement in this order:

1. Project scaffold and theme.
2. Supabase client and session persistence.
3. School lookup by `schools.mobile_username`.
4. Guest school profile.
5. Auth/claim screens.
6. Role detection and role picker.
7. Student dashboard.
8. Student report list and report detail.
9. Student timetable.
10. Parent child switcher and parent dashboard.
11. Teacher dashboard.
12. Teacher timetable.
13. Learning module course/material/assignment screens.
14. Submission screens.
15. Attendance screens.
16. Offline cached timetable/report.
17. Notification placeholders.

## Quality Bar

The app is only acceptable when:

- It launches without TypeScript errors.
- School lookup works with `@username`.
- Student can see report cards, fee balance, and timetable.
- Parent can switch children and see reports/fees.
- Teacher can see timetable/classes.
- Timetable shows breaks and double lessons clearly.
- Report card detail does not overlap even with long exam names.
- Empty states exist for every module.
- Loading and error states exist for every query.
- Pull-to-refresh works on dashboards and lists.

## Final Note For The AI Builder

Do not build a shallow demo. Build the actual app architecture, screens, data hooks, and reusable components. Where backend policies or missing relationship tables block full functionality, create the UI, add TODO comments with the exact required table/policy, and keep the app stable.
