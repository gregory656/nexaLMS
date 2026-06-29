# Phase 3 Notes

## Completed

- Fixed the Staff page Supabase relationship error by removing the invalid embedded `user_roles -> teachers` select. Staff now loads from `teachers`, then roles are attached through each teacher `user_id`.
- Staff records created from the dashboard now appear correctly in the Staff sidebar/page.
- Added functional staff removal from the desktop three-dot action menu.
- Updated the dashboard welcome area to use the admin full name, a glitter-style heading, and a shiny styled date line.
- Changed Recent Students and Recent Staff into compact dashboard cards with See More/See Less buttons so large schools do not flood the dashboard.
- School Settings now opens the school setup/profile editor and updates the existing school record instead of creating a new school.
- Dashboard School Profile has an Edit Profile button that routes to School Settings.
- Uploaded school logo/badge is used in the sidebar brand avatar and the top-right header avatar.
- Sidebar brand text now displays the school name instead of hard-coded NexaLMS.
- Academic Calendar/dashboard academic-year control now reads real `academic_years` records.
- Added an Academic Years module for creating a new academic year and optionally promoting students.
- Promotion keeps stream placement, moves each learner to the next grade, and moves highest-grade learners into Alumni.
- Added an Alumni dashboard grouped/filterable by academic year.
- Added a Departments module for subject categories, edit/delete, default department seeding, and HOD assignment from staff.
- Subjects now require an existing department/category and use that department list in the dropdown.
- Subjects now support edit and delete actions.
- Removed visible test login and disabled public account creation. Signup now explains that accounts are database-created.
- Added Forgot Password flow that checks the app `users` table first, then asks Supabase Auth to send a reset email.
- Added `nexagen.png` to the auth card visual.
- Made top-right profile/settings dropdown actions route to School Settings.

## Follow-up Fixes

- Styled the auth-card badge image so the full badge is visible at a smaller size.
- Fixed the password visibility eye icon by overriding the generic input-icon SVG positioning.
- Improved login bootstrap by fetching the user profile and school in one embedded request when available.
- Changed the dashboard greeting to avoid showing the raw email when the admin name is missing.
- Dashboard recent Students and Staff now show one row by default, with See More and See Less controls.
- Added dashboard in-memory caching so returning to the dashboard keeps the previous view visible while fresh data reloads.
- Updated academic-year copy to say biggest grade level and lowest grade level instead of naming a specific class.
- Added admin-selectable grade controls for the level promoted to Alumni and the level left open for admissions.
- Fixed Departments by removing the fragile embedded `departments -> teachers` select and mapping HOD staff separately.

## Database Migration

Applied migration:

- `supabase/migrations/00003_phase3_academic_years_alumni.sql`

This migration adds:

- `public.alumni`
- Alumni indexes for school, academic year, and student lookup
- RLS policy for authenticated app access
- `updated_at` support for `departments`

The migration was pushed successfully to the linked remote Supabase database using `supabase.exe db push`.

## Academic Year Promotion Rule

When creating a new academic year with promotion enabled:

- The previous current academic year is marked not current.
- The new academic year becomes current.
- Class groups are generated for every grade and stream combination in the new year.
- Students in the highest grade are archived into Alumni for the previous academic year and marked `graduated`.
- Students below the highest grade keep their stream and move to the next grade.
- The smallest grade is left empty for new admissions.

## Notes

- Promotion depends on correct `grade_levels.level_order`; the highest detected grade level is promoted to Alumni unless the admin overrides it.
- The auth card uses `src/assets/nexagen.png` because that is the available uploaded asset in this workspace.
- The production build passes with `npm.cmd run build`. Vite reports only the existing large chunk warning.
