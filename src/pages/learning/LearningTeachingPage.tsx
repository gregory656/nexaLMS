import { BookOpen, ClipboardList, FileText, GraduationCap, MessageSquare, Upload, Users } from 'lucide-react';

const modules = [
    { name: 'Lesson Plans', icon: ClipboardList, desc: 'Schemes, lesson objectives, activities, assessment notes.' },
    { name: 'Lessons', icon: BookOpen, desc: 'Teacher lesson records linked to class, subject, term, and timetable.' },
    { name: 'Lesson Resources', icon: FileText, desc: 'Files, links, videos, worksheets, and teacher attachments.' },
    { name: 'Assignments', icon: ClipboardList, desc: 'Class assignments with due dates and grading status.' },
    { name: 'Assignment Submissions', icon: Upload, desc: 'Student upload records for teacher review.' },
    { name: 'Discussions', icon: MessageSquare, desc: 'Class or course discussion threads.' },
    { name: 'Discussion Replies', icon: MessageSquare, desc: 'Replies from teachers and students.' },
    { name: 'Homework', icon: ClipboardList, desc: 'Short tasks issued by teachers after lessons.' },
    { name: 'Homework Submissions', icon: Upload, desc: 'Student homework responses and attachments.' },
    { name: 'Learning Materials', icon: FileText, desc: 'Reusable notes and materials for mobile and web learners.' },
    { name: 'Courses', icon: GraduationCap, desc: 'Subject/course containers for future mobile app delivery.' },
    { name: 'Course Enrollments', icon: Users, desc: 'Student and teacher access mapping per course.' },
];

export default function LearningTeachingPage() {
    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Learning & Teaching</h1>
                    <p className="page-subtitle">Teacher and student learning workflows ready for web and mobile expansion.</p>
                </div>
            </div>

            <div className="grid-3">
                {modules.map(item => (
                    <div className="card" key={item.name} style={{ padding: '1rem' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <item.icon size={18} style={{ color: 'var(--green-700)' }} />
                            <h3 className="card-title" style={{ margin: 0 }}>{item.name}</h3>
                        </div>
                        <p className="text-sm text-muted">{item.desc}</p>
                        <span className="badge badge-blue">Schema ready</span>
                    </div>
                ))}
            </div>
        </>
    );
}
