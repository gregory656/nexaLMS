-- Fix attendance session types to allow lesson-specific sessions
ALTER TABLE attendance_sessions 
DROP CONSTRAINT attendance_sessions_session_type_check;

ALTER TABLE attendance_sessions 
ADD CONSTRAINT attendance_sessions_session_type_check 
CHECK (session_type IN ('morning','afternoon','full_day','lesson_1','lesson_2','lesson_3','lesson_4','lesson_5','lesson_6','lesson_7','lesson_8'));
