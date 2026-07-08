import type { LucideIcon } from 'lucide-react';
import {
    BarChart3, BookOpen, CalendarClock, CheckCircle, ClipboardCheck,
    FileText, GraduationCap, Headphones, Landmark, LockKeyhole,
    Mail, Megaphone, Phone, School, ShieldCheck, Users
} from 'lucide-react';

export type SitePage = {
    slug: string;
    label: string;
    title: string;
    eyebrow: string;
    description: string;
    icon: LucideIcon;
    bullets: string[];
};

export const pricingPlans = [
    {
        name: 'Starter',
        price: 5,
        description: 'For schools starting digital administration.',
        features: ['Student Management', 'Teachers', 'Attendance'],
    },
    {
        name: 'Standard',
        price: 7,
        description: 'For schools ready to digitize academics.',
        features: ['Everything in Starter', 'Exams', 'Report Cards', 'Timetable'],
    },
    {
        name: 'Premium',
        price: 10,
        description: 'For schools that want complete operational visibility.',
        features: ['Everything in Standard', 'Finance', 'Analytics', 'Priority Support'],
    },
];

export const sitePages: SitePage[] = [
    {
        slug: 'features',
        label: 'Features',
        title: 'Everything a school needs in one calm dashboard',
        eyebrow: 'Operations',
        description: 'NexaLMS connects daily school work from admission to reporting so administrators, teachers, and principals can act from the same source of truth.',
        icon: BarChart3,
        bullets: ['Student and guardian records', 'Teacher and role management', 'Attendance and duty rosters', 'Exams, analytics, and report cards', 'Finance and fee balances', 'Timetable generation and PDF downloads'],
    },
    {
        slug: 'pricing',
        label: 'Pricing',
        title: 'Simple per-student pricing',
        eyebrow: 'Plans',
        description: 'Only active students are counted. Alumni, transferred, and inactive profiles are excluded from monthly billing.',
        icon: Landmark,
        bullets: pricingPlans.map(plan => `${plan.name}: KES ${plan.price} per student per month`),
    },
    {
        slug: 'about',
        label: 'About',
        title: 'Built for Kenyan schools by NexaGen Technologies',
        eyebrow: 'Company',
        description: 'NexaGen Technologies builds practical software for schools that need clear records, faster reporting, and confidence when handling student data.',
        icon: School,
        bullets: ['Kenya-focused school workflows', 'PDF-ready reports and documents', 'Support-led onboarding', 'Founding partner pilot program for early schools'],
    },
    {
        slug: 'contact',
        label: 'Contact',
        title: 'Talk to NexaGen',
        eyebrow: 'Sales and support',
        description: 'Book a demo, request a proposal, or ask for onboarding guidance using the official NexaGen contacts.',
        icon: Phone,
        bullets: ['Phone and WhatsApp: +254 719 637 416', 'M-PESA: 0719637416 - STEPHEN OTIENO', 'Paybill: 522522, Account: 1339185296', 'Bank Transfer: 1339185396 - STEPHEN OTIENO'],
    },
    {
        slug: 'privacy-policy',
        label: 'Privacy',
        title: 'Privacy Policy',
        eyebrow: 'Data protection',
        description: 'NexaLMS processes school data only to provide the service, support users, maintain records, and improve reliability.',
        icon: ShieldCheck,
        bullets: ['Student, guardian, staff, academic, attendance, and finance records are processed for school operations', 'Access is role-based and school-scoped', 'Data protection practices are aligned with Kenya Data Protection Act expectations', 'Schools retain ownership of their school data'],
    },
    {
        slug: 'terms-of-service',
        label: 'Terms',
        title: 'Terms of Service',
        eyebrow: 'Usage',
        description: 'These terms define acceptable use, account security, intellectual property, updates, liability, and subscription responsibilities.',
        icon: FileText,
        bullets: ['Keep accounts secure', 'Use the platform for lawful school operations', 'Do not resell or reverse engineer the software', 'Subscription access depends on active payment status'],
    },
    {
        slug: 'cookie-policy',
        label: 'Cookies',
        title: 'Cookie Policy',
        eyebrow: 'Browser storage',
        description: 'NexaLMS may use essential browser storage for authentication, security, preferences, and reliable application behavior.',
        icon: LockKeyhole,
        bullets: ['Essential session storage', 'Preference storage', 'Security and reliability checks', 'No unnecessary tracking is required for the school dashboard'],
    },
    {
        slug: 'data-processing-notice',
        label: 'Data Notice',
        title: 'Data Processing Notice',
        eyebrow: 'DPA summary',
        description: 'Schools control their data. NexaGen processes it to operate NexaLMS and provide support during an active subscription.',
        icon: ClipboardCheck,
        bullets: ['Student information', 'Parent and guardian contacts', 'Staff records', 'Academic marks and report cards', 'Finance and attendance records'],
    },
    {
        slug: 'support',
        label: 'Support',
        title: 'Support that keeps rollout moving',
        eyebrow: 'Help',
        description: 'Support covers onboarding, training, usage questions, configuration help, and issue escalation.',
        icon: Headphones,
        bullets: ['Quick start support', 'Administrator guidance', 'Teacher guidance', 'PDF and report download help', 'Priority support on Premium'],
    },
    {
        slug: 'documentation',
        label: 'Documentation',
        title: 'Documents schools ask for before buying',
        eyebrow: 'Readiness',
        description: 'NexaLMS includes company, sales, legal, implementation, payment, support, security, and marketing document packs.',
        icon: BookOpen,
        bullets: ['Company profile and brochure', 'Proposal and quotation templates', 'License, service agreement, privacy policy, terms, DPA, and NDA', 'Onboarding forms and go-live checklist', 'Security and support guides'],
    },
];

export const homepageHighlights = [
    { icon: GraduationCap, title: 'Students', text: 'Admissions, classes, guardians, leaders, alumni, and profile records.' },
    { icon: Users, title: 'Teachers', text: 'Staff profiles, roles, subject assignments, attendance, and duty rosters.' },
    { icon: CalendarClock, title: 'Timetable', text: 'Generate, preview, publish, and download master, teacher, or class timetables.' },
    { icon: Megaphone, title: 'Demo Ready', text: 'A complete demo database helps schools see analytics and reports immediately.' },
    { icon: CheckCircle, title: 'PDF First', text: 'Report cards, finance reports, documents, and timetables download cleanly.' },
    { icon: Mail, title: 'Support', text: 'Structured support documents and onboarding workflow for every signed school.' },
];
