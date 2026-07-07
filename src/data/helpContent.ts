/**
 * Comprehensive Help Content for NexaLMS
 * Version: 1.0.0
 * Last Updated: 2025-01-07
 */

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  content: string;
  subsections?: HelpSubsection[];
  keywords?: string[];
}

export interface HelpSubsection {
  id: string;
  title: string;
  content: string;
  steps?: string[];
  tips?: string[];
  troubleshooting?: { problem: string; solution: string }[];
}

export const helpSections: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    content: `Welcome to NexaLMS - your comprehensive School Management System. This guide will help you get started with the platform and understand its core features.`,
    subsections: [
      {
        id: 'introduction',
        title: 'Introduction to NexaLMS',
        content: `NexaLMS is a powerful school management system designed to streamline administrative tasks, enhance academic management, and improve communication between students, teachers, parents, and administrators.`,
        steps: [
          'Log in to your account using your credentials',
          'Complete your school profile setup',
          'Configure academic years and terms',
          'Add classes and streams',
          'Import or add students and teachers',
          'Set up subjects and timetable'
        ],
        tips: [
          'Complete the setup wizard for optimal configuration',
          'Import data in bulk using CSV templates',
          'Set up user roles and permissions for security'
        ]
      },
      {
        id: 'system-requirements',
        title: 'System Requirements',
        content: `NexaLMS is a web-based application accessible through modern browsers.`,
        tips: [
          'Supported browsers: Chrome, Firefox, Safari, Edge (latest versions)',
          'Minimum internet connection: 5 Mbps for optimal performance',
          'Recommended screen resolution: 1366x768 or higher',
          'JavaScript must be enabled in your browser'
        ]
      },
      {
        id: 'navigation',
        title: 'Navigation Guide',
        content: `The sidebar provides quick access to all major sections of the system. Each section is organized logically to help you find features quickly.`,
        steps: [
          'Use the sidebar to navigate between sections',
          'Click on any menu item to access that feature',
          'Use the search functionality to quickly find specific features',
          'The dashboard provides an overview of key metrics'
        ]
      }
    ],
    keywords: ['start', 'begin', 'setup', 'intro', 'overview', 'navigation', 'requirements']
  },
  {
    id: 'school-setup',
    title: 'School Setup',
    icon: '🏫',
    content: `Configure your school's basic information, academic structure, and organizational settings to personalize NexaLMS for your institution.`,
    subsections: [
      {
        id: 'school-profile',
        title: 'School Profile',
        content: `Set up your school's basic information including name, logo, motto, and contact details. This information appears on reports and official documents.`,
        steps: [
          'Go to Settings > School Settings',
          'Enter school name and motto',
          'Upload school logo (recommended: 200x200px PNG)',
          'Add contact information and address',
          'Set up watermark for official documents'
        ],
        tips: [
          'Use a high-quality logo for professional appearance',
          'The motto appears on report cards and certificates',
          'Contact details are used for communication'
        ]
      },
      {
        id: 'academic-years',
        title: 'Academic Years',
        content: `Define academic years to organize your school's calendar and terms. This structure is essential for examinations, attendance, and fee management.`,
        steps: [
          'Navigate to Academics > Academic Years',
          'Click "Add Academic Year"',
          'Enter year name (e.g., "2024-2025")',
          'Set start and end dates',
          'Mark as current if active'
        ],
        tips: [
          'Create academic years before adding terms',
          'Only one year can be marked as current',
          'Historical data is preserved for reporting'
        ]
      },
      {
        id: 'terms',
        title: 'Terms Management',
        content: `Break down academic years into terms (Term 1, Term 2, Term 3) for better organization of examinations, attendance, and fee collection.`,
        steps: [
          'Go to Academics > Academic Years',
          'Select an academic year',
          'Click "Add Term"',
          'Enter term name and dates',
          'Set term number for ordering'
        ],
        tips: [
          'Terms should not overlap in dates',
          'Use consistent naming (Term 1, Term 2, etc.)',
          'Term dates affect examination scheduling'
        ]
      },
      {
        id: 'streams-classes',
        title: 'Streams and Classes',
        content: `Organize students into classes and streams based on grade levels. This structure is used for attendance, examinations, and reporting.`,
        steps: [
          'Navigate to Academics > Streams & Classes',
          'Create grade levels first (Form 1, Form 2, etc.)',
          'Add streams under each grade (East, West, North)',
          'Create classes combining grade and stream',
          'Assign class teachers to each class'
        ],
        tips: [
          'Use consistent naming conventions',
          'Assign class teachers for better management',
          'Class structure affects timetable generation'
        ]
      }
    ],
    keywords: ['school', 'setup', 'profile', 'academic', 'year', 'term', 'class', 'stream', 'grade']
  },
  {
    id: 'students',
    title: 'Students',
    icon: '👨‍🎓',
    content: `Manage student records, track academic performance, monitor attendance, and maintain comprehensive student profiles.`,
    subsections: [
      {
        id: 'add-student',
        title: 'Adding a Student',
        content: `Add individual students to the system with their personal information, academic details, and guardian information.`,
        steps: [
          'Go to Students > Add Student',
          'Enter personal details (name, date of birth, gender)',
          'Add contact information and guardian details',
          'Assign class and admission number',
          'Upload profile photo (optional)',
          'Save the student record'
        ],
        tips: [
          'Admission numbers should be unique',
          'Guardian information is essential for communication',
          'Profile photos help with identification'
        ]
      },
      {
        id: 'import-students',
        title: 'Bulk Import Students',
        content: `Import multiple students at once using a CSV template. This is the fastest way to add large numbers of students.`,
        steps: [
          'Go to Students > Import',
          'Download the CSV template',
          'Fill in student details following the template format',
          'Upload the completed CSV file',
          'Review and confirm the import',
          'Resolve any validation errors'
        ],
        tips: [
          'Follow the template format exactly',
          'Ensure admission numbers are unique',
          'Validate data before importing',
          'Keep a backup of your CSV file'
        ]
      },
      {
        id: 'edit-student',
        title: 'Editing Student Records',
        content: `Update student information as needed. Changes are logged for audit purposes.`,
        steps: [
          'Navigate to Students',
          'Search for the student',
          'Click on the student record',
          'Edit the required fields',
          'Save changes'
        ],
        tips: [
          'Class changes affect attendance and examinations',
          'Guardian updates improve communication',
          'Profile photos can be updated anytime'
        ]
      },
      {
        id: 'transfer-student',
        title: 'Student Transfer',
        content: `Handle student transfers within or out of the school. Maintain records for transferred students.`,
        steps: [
          'Open the student record',
          'Click "Transfer Student"',
          'Select transfer type (in/out)',
          'Enter transfer details and date',
          'Add notes if necessary',
          'Confirm the transfer'
        ],
        tips: [
          'Transferred students are archived, not deleted',
          'Academic records are preserved',
          'Transfer dates affect attendance calculations'
        ]
      }
    ],
    keywords: ['student', 'pupil', 'learner', 'add', 'import', 'edit', 'transfer', 'admission']
  },
  {
    id: 'teachers',
    title: 'Teachers',
    icon: '👨‍🏫',
    content: `Manage teacher profiles, assign subjects and classes, track teaching schedules, and monitor teacher performance.`,
    subsections: [
      {
        id: 'add-teacher',
        title: 'Adding a Teacher',
        content: `Create teacher profiles with their qualifications, subjects, and contact information.`,
        steps: [
          'Go to Staff > Add Teacher',
          'Enter personal and professional details',
          'Add contact information',
          'Specify subjects they can teach',
          'Assign TSC number or employee ID',
          'Save the teacher record'
        ],
        tips: [
          'Include subject specializations for timetable',
          'Contact details are essential for communication',
          'Qualification information helps in reporting'
        ]
      },
      {
        id: 'assign-subjects',
        title: 'Assigning Subjects',
        content: `Assign subjects to teachers based on their qualifications and expertise. This affects timetable generation.`,
        steps: [
          'Open teacher profile',
          'Go to Subjects section',
          'Select subjects from the list',
          'Set subject preference levels',
          'Save assignments'
        ],
        tips: [
          'Assign subjects based on qualifications',
          'Consider teacher workload',
          'Update assignments when staff changes'
        ]
      },
      {
        id: 'assign-classes',
        title: 'Assigning Classes',
        content: `Assign classes to teachers for subject teaching and class teacher responsibilities.`,
        steps: [
          'Navigate to Staff',
          'Select a teacher',
          'Go to Class Assignments',
          'Select classes for each subject',
          'Set as class teacher if applicable',
          'Save assignments'
        ],
        tips: [
          'Class teachers have additional responsibilities',
          'Balance class assignments across teachers',
          'Consider teacher expertise in class assignment'
        ]
      }
    ],
    keywords: ['teacher', 'staff', 'educator', 'instructor', 'assign', 'subject', 'class']
  },
  {
    id: 'examinations',
    title: 'Examinations',
    icon: '📝',
    content: `Create and manage examinations, upload marks, generate reports, and analyze student performance across subjects and classes.`,
    subsections: [
      {
        id: 'create-exam',
        title: 'Creating an Examination',
        content: `Set up examinations for specific terms and classes. Define subjects, marking schemes, and schedules.`,
        steps: [
          'Go to Examinations > Create Exam',
          'Enter exam name (e.g., "End of Term 1")',
          'Select academic year and term',
          'Choose participating classes',
          'Add subjects with maximum marks',
          'Set exam dates if applicable',
          'Save and publish the exam'
        ],
        tips: [
          'Publish exams to make them visible to teachers',
          'Set appropriate maximum marks per subject',
          'Exam names should be descriptive and consistent'
        ]
      },
      {
        id: 'upload-marks',
        title: 'Uploading Marks',
        content: `Enter student marks for each subject in an examination. Marks can be entered individually or imported in bulk.`,
        steps: [
          'Open the examination',
          'Select a subject',
          'Enter marks for each student',
          'Add remarks if needed',
          'Save the marks',
          'Repeat for all subjects'
        ],
        tips: [
          'Marks should be within the defined maximum',
          'Remarks provide context for performance',
          'Save frequently to avoid data loss'
        ]
      },
      {
        id: 'publish-results',
        title: 'Publishing Results',
        content: `Make examination results visible to students, parents, and teachers. Published results can be used for report cards.`,
        steps: [
          'Ensure all subject marks are entered',
          'Go to Examinations',
          'Select the exam',
          'Click "Publish Results"',
          'Confirm publication',
          'Results are now visible'
        ],
        tips: [
          'Review marks before publishing',
          'Published results cannot be easily modified',
          'Notify stakeholders when results are published'
        ]
      },
      {
        id: 'joint-exams',
        title: 'Joint School Examinations',
        content: `Collaborate with other schools for joint examinations. Compare performance across institutions.`,
        steps: [
          'Go to Examinations > Joint Exams',
          'Create or join a joint exam group',
          'Invite participating schools',
          'Set common subjects and marking',
          'Upload marks from all schools',
          'Generate comparative reports'
        ],
        tips: [
          'Coordinate exam schedules with participating schools',
          'Use consistent marking schemes',
          'Comparative analysis requires standardized data'
        ]
      },
      {
        id: 'exam-analytics',
        title: 'Examination Analytics',
        content: `Analyze examination performance with detailed reports including mean scores, grade distributions, and trends.`,
        steps: [
          'Open published examination',
          'View analytics dashboard',
          'Filter by class, subject, or student',
          'Export reports as needed',
          'Compare with previous exams'
        ],
        tips: [
          'Use analytics to identify performance trends',
          'Compare subjects to identify strengths',
          'Track individual student progress over time'
        ]
      }
    ],
    keywords: ['exam', 'test', 'assessment', 'marks', 'results', 'publish', 'analytics', 'joint']
  },
  {
    id: 'report-cards',
    title: 'Report Cards',
    icon: '📊',
    content: `Generate professional report cards for students with grades, remarks, positions, and fee balances.`,
    subsections: [
      {
        id: 'generate-report',
        title: 'Generating Report Cards',
        content: `Create report cards for individual students or entire classes based on published examination results.`,
        steps: [
          'Go to Report Cards > Generate',
          'Select examination and class',
          'Choose individual student or entire class',
          'Toggle fee balance inclusion if needed',
          'Preview the report card',
          'Download or print'
        ],
        tips: [
          'Examination must be published first',
          'Fee balance requires finance module setup',
          'Preview before bulk download'
        ]
      },
      {
        id: 'preview-report',
        title: 'Previewing Report Cards',
        content: `Review report cards before final download to ensure accuracy and completeness.`,
        steps: [
          'Select student in Generate tab',
          'View the preview card',
          'Check all details and calculations',
          'Verify grades and remarks',
          'Make adjustments if needed'
        ],
        tips: [
          'Check student information accuracy',
          'Verify position calculations',
          'Ensure logo and school details are correct'
        ]
      },
      {
        id: 'bulk-download',
        title: 'Bulk Download',
        content: `Download report cards for an entire class at once, sorted by student performance.`,
        steps: [
          'Go to Report Cards > Bulk Download',
          'Select examination and class',
          'Choose download options',
          'Click download all',
          'Files download individually'
        ],
        tips: [
          'Reports are sorted by performance (highest first)',
          'Allow time for all downloads to complete',
          'Organize downloaded files by class'
        ]
      },
      {
        id: 'report-settings',
        title: 'Report Card Settings',
        content: `Customize report card appearance including logo, watermark, and fee balance display.`,
        steps: [
          'Go to Settings > School Settings',
          'Upload school logo',
          'Set watermark if desired',
          'Configure grade scales',
          'Save settings'
        ],
        tips: [
          'Logo appears on all reports',
          'Watermark adds security to documents',
          'Grade scales determine letter grades'
        ]
      }
    ],
    keywords: ['report', 'card', 'grade', 'result', 'download', 'preview', 'bulk']
  },
  {
    id: 'attendance',
    title: 'Attendance',
    icon: '📅',
    content: `Track daily attendance for students and teachers. Generate attendance reports and identify patterns.`,
    subsections: [
      {
        id: 'student-attendance',
        title: 'Student Attendance',
        content: `Record daily student attendance by class. Mark present, absent, late, or excused.`,
        steps: [
          'Go to Attendance > Student Attendance',
          'Select date and class',
          'Mark attendance for each student',
          'Add notes for absences if needed',
          'Save the attendance record'
        ],
        tips: [
          'Attendance can be marked by class teachers',
          'Excused absences require documentation',
          'Attendance affects examination eligibility'
        ]
      },
      {
        id: 'teacher-attendance',
        title: 'Teacher Attendance',
        content: `Track teacher attendance and punctuality. Monitor staff presence and leave records.`,
        steps: [
          'Navigate to Attendance > Teacher Attendance',
          'Select date',
          'Mark attendance for each teacher',
          'Record leave or absence reasons',
          'Save the record'
        ],
        tips: [
          'Regular attendance monitoring improves accountability',
          'Leave records help in payroll calculation',
          'Attendance affects timetable coverage'
        ]
      },
      {
        id: 'attendance-reports',
        title: 'Attendance Reports',
        content: `Generate comprehensive attendance reports showing trends, patterns, and statistics.`,
        steps: [
          'Go to Attendance > Reports',
          'Select date range and class',
          'Choose report type',
          'Generate and view report',
          'Export if needed'
        ],
        tips: [
          'Identify chronic absenteeism patterns',
          'Compare attendance across classes',
          'Use reports for parent meetings'
        ]
      }
    ],
    keywords: ['attendance', 'present', 'absent', 'late', 'daily', 'tracking']
  },
  {
    id: 'timetable',
    title: 'Timetable',
    icon: '⏰',
    content: `Create and manage school timetables. Assign subjects to teachers and classes, handle conflicts, and optimize resource utilization.`,
    subsections: [
      {
        id: 'configure-timetable',
        title: 'Configuring Timetable',
        content: `Set up the timetable structure including periods, days, and break times.`,
        steps: [
          'Go to Academics > Timetable',
          'Configure periods and timing',
          'Set school days and breaks',
          'Define subject durations',
          'Save timetable settings'
        ],
        tips: [
          'Consider break times for students and teachers',
          'Balance subject distribution across the week',
          'Allow time for assemblies and activities'
        ]
      },
      {
        id: 'generate-timetable',
        title: 'Generating Timetable',
        content: `Automatically generate timetables based on teacher assignments, subject requirements, and class schedules.`,
        steps: [
          'Ensure all teacher assignments are complete',
          'Go to Timetable > Generate',
          'Select classes and term',
          'Click generate timetable',
          'Review for conflicts',
          'Resolve any conflicts manually',
          'Publish the timetable'
        ],
        tips: [
          'Check for teacher conflicts before generating',
          'Manual adjustments may be needed',
          'Save multiple timetable versions'
        ]
      },
      {
        id: 'download-timetable',
        title: 'Downloading Timetable',
        content: `Export timetables in various formats for printing and distribution.`,
        steps: [
          'Open the timetable view',
          'Select format (PDF, Excel)',
          'Choose scope (class, teacher, school)',
          'Click download',
          'Print or distribute as needed'
        ],
        tips: [
          'PDF format is best for printing',
          'Excel allows for further customization',
          'Distribute to staff and students'
        ]
      },
      {
        id: 'timetable-history',
        title: 'Version History',
        content: `Maintain historical timetables and track changes over time.`,
        steps: [
          'Go to Timetable > History',
          'View previous versions',
          'Compare versions',
          'Restore if needed',
          'Archive old timetables'
        ],
        tips: [
          'Keep records for audit purposes',
          'Compare terms to identify improvements',
          'Historical data helps in future planning'
        ]
      }
    ],
    keywords: ['timetable', 'schedule', 'period', 'class', 'teacher', 'subject', 'time']
  },
  {
    id: 'finance',
    title: 'Finance',
    icon: '💰',
    content: `Manage fee structures, track payments, maintain ledgers, and generate financial reports.`,
    subsections: [
      {
        id: 'fee-setup',
        title: 'Fee Structure Setup',
        content: `Define fee categories and amounts for different grade levels, terms, and student types.`,
        steps: [
          'Go to Finance > Fee Structure',
          'Create fee categories (Tuition, Boarding, etc.)',
          'Define fee amounts per grade level',
          'Set term-specific fees',
          'Mark optional vs required fees',
          'Save fee structure'
        ],
        tips: [
          'Use descriptive category names',
          'Consider different fee structures for boarding/day',
          'Update fees annually as needed'
        ]
      },
      {
        id: 'payments',
        title: 'Recording Payments',
        content: `Record student payments and update fee balances in real-time.`,
        steps: [
          'Go to Finance > Payments',
          'Search for student',
          'Enter payment amount',
          'Select payment method',
          'Add reference number',
          'Record the transaction'
        ],
        tips: [
          'Always include reference numbers',
          'Payment methods help in reconciliation',
          'Balances update automatically'
        ]
      },
      {
        id: 'fee-balance',
        title: 'Fee Balance Management',
        content: `Track outstanding balances for all students. Generate balance statements and follow up on payments.`,
        steps: [
          'View student fee balances',
          'Filter by balance amount',
          'Generate balance statements',
          'Send reminders to defaulters',
          'Update balances after payments'
        ],
        tips: [
          'Regular balance checks improve collection',
          'Send reminders before term deadlines',
          'Balance appears on report cards if enabled'
        ]
      },
      {
        id: 'finance-reports',
        title: 'Financial Reports',
        content: `Generate comprehensive financial reports including collection rates, payment methods, and outstanding balances.`,
        steps: [
          'Go to Finance > Reports',
          'Select report type and date range',
          'Generate the report',
          'View charts and summaries',
          'Export as PDF or CSV'
        ],
        tips: [
          'Monitor collection rates regularly',
          'Identify payment method preferences',
          'Use reports for financial planning'
        ]
      },
      {
        id: 'intasend-integration',
        title: 'IntaSend Payment Integration',
        content: `Integrate IntaSend for seamless mobile money payments and automatic fee updates.`,
        steps: [
          'Configure IntaSend API keys in settings',
          'Set up payment callbacks',
          'Test the integration',
          'Enable for student payments',
          'Monitor transaction logs'
        ],
        tips: [
          'Keep API keys secure',
          'Test with small amounts first',
          'Monitor for failed transactions'
        ]
      }
    ],
    keywords: ['fee', 'finance', 'payment', 'balance', 'money', 'cost', 'invoice', 'receipt']
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: '📈',
    content: `Access comprehensive analytics and reports across all modules. Track performance, identify trends, and make data-driven decisions.`,
    subsections: [
      {
        id: 'academic-analytics',
        title: 'Academic Performance',
        content: `Analyze student and teacher performance with detailed metrics and comparisons.`,
        steps: [
          'Go to Analytics > Academic',
          'Select examination or time period',
          'View mean scores and distributions',
          'Compare classes and subjects',
          'Identify top and bottom performers',
          'Export reports'
        ],
        tips: [
          'Use trends to identify improvement areas',
          'Compare terms to measure progress',
          'Subject analysis helps curriculum decisions'
        ]
      },
      {
        id: 'teacher-ranking',
        title: 'Teacher Performance Ranking',
        content: `Rank teachers based on their students' performance across subjects and classes.`,
        steps: [
          'Navigate to Analytics > Teachers',
          'View ranking by subject',
          'Compare class performance',
          'Analyze teaching effectiveness',
          'Identify professional development needs'
        ],
        tips: [
          'Consider class difficulty in rankings',
          'Use for recognition and improvement',
          'Combine with qualitative assessments'
        ]
      },
      {
        id: 'subject-ranking',
        title: 'Subject Performance Analysis',
        content: 'Compare performance across subjects to identify strengths and areas needing improvement.',
        steps: [
          'Go to Analytics > Subjects',
          'View subject-wise mean scores',
          'Compare pass rates',
          'Identify difficult subjects',
          'Analyze grade distributions'
        ],
        tips: [
          'Identify subjects needing intervention',
          'Compare with historical data',
          'Use for resource allocation'
        ]
      },
      {
        id: 'trend-analysis',
        title: 'Trend Analysis',
        content: `Track performance trends over time to measure improvement and identify patterns.`,
        steps: [
          'Select time period for analysis',
          'View trend graphs',
          'Compare terms or years',
          'Identify patterns',
          'Project future performance'
        ],
        tips: [
          'Long-term trends show real progress',
          'Seasonal patterns may exist',
          'Use for strategic planning'
        ]
      }
    ],
    keywords: ['analytics', 'performance', 'ranking', 'trend', 'analysis', 'statistics', 'data']
  },
  {
    id: 'announcements',
    title: 'Announcements',
    icon: '📢',
    content: `Create and manage school announcements. Schedule communications and target specific groups.`,
    subsections: [
      {
        id: 'create-announcement',
        title: 'Creating Announcements',
        content: `Create announcements for students, teachers, parents, or specific groups.`,
        steps: [
          'Go to Announcements',
          'Click "New Announcement"',
          'Enter title and content',
          'Select target audience',
          'Add attachments if needed',
          'Schedule or publish immediately',
          'Send notification'
        ],
        tips: [
          'Use clear, concise language',
          'Include relevant dates and times',
          'Target specific groups when appropriate'
        ]
      },
      {
        id: 'scheduling',
        title: 'Scheduling Announcements',
        content: `Schedule announcements to be sent at specific times for maximum impact.`,
        steps: [
          'Create announcement as usual',
          'Select "Schedule" instead of "Publish"',
          'Set date and time',
          'Confirm schedule',
          'Monitor scheduled announcements'
        ],
        tips: [
          'Schedule for optimal viewing times',
          'Consider time zones if applicable',
          'Review before scheduling'
        ]
      },
      {
        id: 'attachments',
        title: 'Managing Attachments',
        content: `Attach documents, images, or other files to announcements for additional information.`,
        steps: [
          'Create or edit announcement',
          'Click "Add Attachment"',
          'Select file from device',
          'Add description if needed',
          'Save announcement'
        ],
        tips: [
          'Keep file sizes reasonable',
          'Use common file formats',
          'Ensure attachments are relevant'
        ]
      }
    ],
    keywords: ['announcement', 'notice', 'communication', 'news', 'alert', 'schedule']
  },
  {
    id: 'roles-permissions',
    title: 'Roles & Permissions',
    icon: '🔐',
    content: `Define user roles and assign specific permissions to control access to different features and data.`,
    subsections: [
      {
        id: 'create-role',
        title: 'Creating Roles',
        content: `Create custom roles with specific permissions based on responsibilities.`,
        steps: [
          'Go to Roles & Permissions',
          'Click "Create Role"',
          'Enter role name and description',
          'Select permissions for each module',
          'Save the role'
        ],
        tips: [
          'Use descriptive role names',
          'Grant minimum necessary permissions',
          'Review roles periodically'
        ]
      },
      {
        id: 'assign-permissions',
        title: 'Assigning Permissions',
        content: `Configure what each role can view, edit, create, or delete in the system.`,
        steps: [
          'Edit a role',
          'Review each module\'s permissions',
          'Check boxes for allowed actions',
          'Save changes',
          'Assign role to users'
        ],
        tips: [
          'Group related permissions',
          'Consider data sensitivity',
          'Test permissions before deployment'
        ]
      },
      {
        id: 'user-management',
        title: 'User Management',
        content: `Create user accounts and assign roles to control system access.`,
        steps: [
          'Go to Staff or appropriate section',
          'Create user account',
          'Assign role to the user',
          'Set account permissions',
          'Send invitation email',
          'User sets their password'
        ],
        tips: [
          'Use professional email addresses',
          'Assign appropriate roles',
          'Review user access regularly'
        ]
      }
    ],
    keywords: ['role', 'permission', 'access', 'security', 'user', 'admin', 'privilege']
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: '🔧',
    content: `Common issues and their solutions. Find quick fixes for frequently encountered problems.`,
    subsections: [
      {
        id: 'login-issues',
        title: 'Login Problems',
        content: `Solutions for common login and authentication issues.`,
        troubleshooting: [
          { problem: 'Cannot log in with correct credentials', solution: 'Clear browser cache and cookies, then try again. If the issue persists, reset your password.' },
          { problem: 'Forgot password', solution: 'Click "Forgot password" on the login page and follow the instructions sent to your email.' },
          { problem: 'Account locked', solution: 'Contact your system administrator to unlock your account.' }
        ]
      },
      {
        id: 'data-issues',
        title: 'Data Display Issues',
        content: `When data is not showing correctly or appears missing.`,
        troubleshooting: [
          { problem: 'Results not showing', solution: 'Ensure the examination has been published. Unpublished results are not visible in reports.' },
          { problem: 'Students not appearing in class', solution: 'Check that students are assigned to the correct class and their status is "active".' },
          { problem: 'Old data appearing', solution: 'Clear your browser cache or try a different browser. Ensure you have selected the correct academic year and term.' }
        ]
      },
      {
        id: 'report-issues',
        title: 'Report Generation Issues',
        content: `Problems with generating or downloading reports.`,
        troubleshooting: [
          { problem: 'Report card not generating', solution: 'Ensure all subject marks are entered and the exam is published. Check that grade scales are configured.' },
          { problem: 'PDF download fails', solution: 'Check your browser download settings. Disable any download managers and try again.' },
          { problem: 'Incorrect calculations on report', solution: 'Verify that maximum marks are set correctly for each subject. Check grade scale configuration.' }
        ]
      },
      {
        id: 'performance-issues',
        title: 'System Performance',
        content: `When the system is slow or unresponsive.`,
        troubleshooting: [
          { problem: 'System is slow', solution: 'Check your internet connection. Close other browser tabs. Try during off-peak hours.' },
          { problem: 'Page not loading', solution: 'Refresh the page. Check that you have a stable internet connection. Try a different browser.' },
          { problem: 'Timeout errors', solution: 'Reduce the amount of data being processed. Try exporting smaller batches of data.' }
        ]
      }
    ],
    keywords: ['troubleshoot', 'problem', 'issue', 'error', 'fix', 'solution', 'help']
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    icon: '❓',
    content: `Quick answers to the most commonly asked questions about NexaLMS.`,
    subsections: [
      {
        id: 'general-faq',
        title: 'General Questions',
        content: `Common questions about using NexaLMS.`,
        troubleshooting: [
          { problem: 'Can I edit published results?', solution: 'Published results can be edited by administrators with appropriate permissions. Go to the exam, click "Edit Results", make changes, and republish.' },
          { problem: 'How do I regenerate report cards?', solution: 'Go to Report Cards, select the examination and class, and generate new report cards. Previous versions are not overwritten.' },
          { problem: 'How do I reset passwords?', solution: 'Users can reset their own passwords using "Forgot password" on the login page. Administrators can reset passwords from the user management section.' },
          { problem: 'Is my data secure?', solution: 'Yes, NexaLMS uses industry-standard encryption and security measures. Regular backups are performed, and access is controlled by permissions.' },
          { problem: 'Can I access NexaLMS on mobile?', solution: 'Yes, NexaLMS is responsive and works on mobile devices. However, some features are best used on a larger screen.' }
        ]
      },
      {
        id: 'technical-faq',
        title: 'Technical Questions',
        content: `Technical questions about system requirements and compatibility.`,
        troubleshooting: [
          { problem: 'What browsers are supported?', solution: 'NexaLMS supports the latest versions of Chrome, Firefox, Safari, and Edge. Internet Explorer is not supported.' },
          { problem: 'Do I need to install software?', solution: 'No, NexaLMS is entirely web-based. You only need a modern web browser and internet connection.' },
          { problem: 'How often is the system backed up?', solution: 'Data is backed up daily. Additional backups are performed before major updates. Retention periods depend on your subscription plan.' }
        ]
      }
    ],
    keywords: ['faq', 'question', 'answer', 'common', 'help', 'how-to']
  },
  {
    id: 'support',
    title: 'Contact Support',
    icon: '📞',
    content: `Get help from the NexaLMS support team through various channels.`,
    subsections: [
      {
        id: 'contact-methods',
        title: 'Ways to Contact Us',
        content: `Contact NexaLMS support through your preferred channel.`,
        steps: [
          'Phone: +254 719 637 416',
          'WhatsApp: +254 719 637 416',
          'Email: support@nexagen.co.ke',
          'Website: www.nexagen.co.ke',
          'In-app: Use the help button on any page'
        ],
        tips: [
          'Include your school name in all communications',
          'Provide screenshots when reporting issues',
          'Describe the problem in detail',
          'Mention what you were trying to do'
        ]
      },
      {
        id: 'response-times',
        title: 'Support Response Times',
        content: `Expected response times for different types of issues.`,
        tips: [
          'Critical issues: Within 2 hours',
          'High priority: Within 4 hours',
          'Normal priority: Within 24 hours',
          'Low priority: Within 48 hours'
        ]
      },
      {
        id: 'training',
        title: 'Training Resources',
        content: `Additional training materials and resources for learning NexaLMS.`,
        steps: [
          'Download this user manual',
          'Watch video tutorials (coming soon)',
          'Schedule on-site training',
          'Join webinars and workshops',
          'Access the knowledge base'
        ]
      }
    ],
    keywords: ['support', 'contact', 'help', 'phone', 'email', 'training']
  },
  {
    id: 'release-notes',
    title: 'Release Notes',
    icon: '📋',
    content: `Stay updated with the latest features, improvements, and bug fixes in NexaLMS.`,
    subsections: [
      {
        id: 'version-1-0-0',
        title: 'Version 1.0.0 - Initial Release',
        content: `The initial release of NexaLMS with comprehensive school management features.`,
        steps: [
          'Core modules: Students, Teachers, Academics, Examinations',
          'Finance management with fee tracking',
          'Attendance tracking for students and teachers',
          'Timetable generation and management',
          'Report card generation with PDF export',
          'Analytics and reporting dashboards',
          'Announcements and communication',
          'Roles and permissions system',
          'User management and authentication'
        ]
      }
    ],
    keywords: ['release', 'update', 'version', 'changelog', 'new', 'improvement']
  }
];

export const searchHelpContent = (query: string): HelpSection[] => {
  if (!query.trim()) return helpSections;
  
  const lowerQuery = query.toLowerCase();
  return helpSections.filter(section => {
    const titleMatch = section.title.toLowerCase().includes(lowerQuery);
    const contentMatch = section.content.toLowerCase().includes(lowerQuery);
    const keywordMatch = section.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
    const subsectionMatch = section.subsections?.some(sub => 
      sub.title.toLowerCase().includes(lowerQuery) ||
      sub.content.toLowerCase().includes(lowerQuery)
    );
    
    return titleMatch || contentMatch || keywordMatch || subsectionMatch;
  });
};
