import jsPDF from 'jspdf';
import { downloadPdf } from './pdf';

export type BusinessDocument = {
    id: string;
    title: string;
    fileName: string;
    category: string;
    summary: string;
    sections: Array<{
        heading: string;
        body: string[];
    }>;
};

export const businessDocuments: BusinessDocument[] = [
    {
        id: 'company-profile',
        title: 'Company Profile',
        fileName: 'Company_Profile',
        category: 'Company Documents',
        summary: 'A concise profile for school decision makers.',
        sections: [
            { heading: 'NexaGen Technologies', body: ['NexaGen Technologies builds practical digital systems for Kenyan schools. NexaLMS is our flagship school ERP for student records, staff management, academics, attendance, finance, timetables, report cards, and analytics.'] },
            { heading: 'Mission', body: ['To help schools run cleaner operations, make faster decisions, and protect student information through reliable cloud software.'] },
            { heading: 'Contacts', body: ['M-PESA: 0719637416 - STEPHEN OTIENO', 'Paybill: 522522, Account: 1339185296', 'Bank Transfer Account: 1339185396 - STEPHEN OTIENO'] },
        ],
    },
    {
        id: 'product-brochure',
        title: 'Product Brochure',
        fileName: 'Product_Brochure',
        category: 'Company Documents',
        summary: 'Feature-focused brochure for school visits.',
        sections: [
            { heading: 'What NexaLMS Does', body: ['NexaLMS centralizes student registration, teachers, guardians, subjects, attendance, exams, report cards, fees, timetables, and school analytics in one secure dashboard.'] },
            { heading: 'Why Schools Choose It', body: ['Fast PDF downloads, realistic academic reports, finance visibility, role-based access, and a setup flow designed for Kenyan school operations.'] },
        ],
    },
    {
        id: 'service-catalogue',
        title: 'Service Catalogue',
        fileName: 'Service_Catalogue',
        category: 'Company Documents',
        summary: 'Services offered before and after sale.',
        sections: [
            { heading: 'Core Services', body: ['NexaLMS setup, school onboarding, user training, data import, report card configuration, timetable setup, and ongoing support.'] },
            { heading: 'Optional Services', body: ['Custom reports, historical data cleanup, school branding, on-site training, and premium rollout support.'] },
        ],
    },
    {
        id: 'pricing-sheet',
        title: 'Pricing Sheet',
        fileName: 'Pricing_Sheet',
        category: 'Company Documents',
        summary: 'Clear per-student monthly pricing.',
        sections: [
            { heading: 'Starter', body: ['KES 5 per active student per month. Includes student management, teachers, and attendance.'] },
            { heading: 'Standard', body: ['KES 7 per active student per month. Includes Starter plus exams, report cards, and timetable.'] },
            { heading: 'Premium', body: ['KES 10 per active student per month. Includes Standard plus finance, analytics, and priority support.'] },
        ],
    },
    {
        id: 'quotation',
        title: 'Quotation Template',
        fileName: 'Quotation',
        category: 'Sales Documents',
        summary: 'Pricing quotation template for schools.',
        sections: [
            { heading: 'Quotation Items', body: ['Modules included, number of students/users, subscription period, selected plan, VAT if applicable, validity period, and total payable amount.'] },
            { heading: 'Payment Details', body: ['M-PESA: 0719637416 - STEPHEN OTIENO', 'Paybill: 522522, Account: 1339185296', 'Bank Transfer: 1339185396 - STEPHEN OTIENO'] },
        ],
    },
    {
        id: 'proposal',
        title: 'Proposal',
        fileName: 'Proposal',
        category: 'Sales Documents',
        summary: 'School proposal structure.',
        sections: [
            { heading: 'School Challenges', body: ['Manual records, delayed reports, scattered fee tracking, inconsistent attendance records, and limited analytics.'] },
            { heading: 'NexaLMS Solution', body: ['A unified school management system with implementation, training, and support delivered through a structured onboarding plan.'] },
            { heading: 'Timeline', body: ['Needs assessment, proposal, quotation, contract, invoice, onboarding, data import, training, go live, support, and renewal.'] },
        ],
    },
    {
        id: 'demo-checklist',
        title: 'Demonstration Checklist',
        fileName: 'Demonstration_Checklist',
        category: 'Sales Documents',
        summary: 'Consistent demo flow for every school.',
        sections: [
            { heading: 'Demo Steps', body: ['Login, dashboard, student registration, teacher management, attendance, exams, analytics, report cards, timetable, finance, announcements, and PDF downloads.'] },
            { heading: 'Demo Goal', body: ['Every school should see the same polished journey and understand the value before pricing is discussed.'] },
        ],
    },
    {
        id: 'legal-compliance',
        title: 'Legal Compliance Pack',
        fileName: 'Legal_Compliance',
        category: 'Legal Documents',
        summary: 'Legal and data protection overview.',
        sections: [
            { heading: 'Included Documents', body: ['Software License Agreement, Service Agreement, Privacy Policy, Terms of Service, Data Processing Agreement, and Non-Disclosure Agreement.'] },
            { heading: 'Kenya Data Protection Alignment', body: ['NexaLMS documentation explains collected data, purpose, access controls, retention, security safeguards, user rights, and contact details.'] },
        ],
    },
    {
        id: 'software-license',
        title: 'Software License Agreement',
        fileName: 'Software_License_Agreement',
        category: 'Legal Documents',
        summary: 'License terms for school use.',
        sections: [
            { heading: 'License Scope', body: ['The school receives a limited, non-transferable subscription license to use NexaLMS for internal school administration.'] },
            { heading: 'Restrictions', body: ['The school may not resell, reverse engineer, copy, or distribute the software outside the licensed institution.'] },
        ],
    },
    {
        id: 'service-agreement',
        title: 'Service Agreement',
        fileName: 'Service_Agreement',
        category: 'Legal Documents',
        summary: 'Main implementation and support contract.',
        sections: [
            { heading: 'Agreement Scope', body: ['Parties, modules included, subscription duration, payment schedule, support, training, responsibilities, confidentiality, termination, data ownership, and dispute resolution.'] },
            { heading: 'Support', body: ['Support covers ordinary usage questions, configuration help, and issue escalation during the active subscription period.'] },
        ],
    },
    {
        id: 'privacy-policy',
        title: 'Privacy Policy',
        fileName: 'Privacy_Policy',
        category: 'Legal Documents',
        summary: 'Privacy notice for schools and users.',
        sections: [
            { heading: 'Data Collected', body: ['School profile data, student records, guardian contacts, staff records, attendance, marks, fees, and audit information required to operate NexaLMS.'] },
            { heading: 'Protection', body: ['Access is role-based, records are school-scoped, and operational controls support confidentiality and responsible data handling.'] },
        ],
    },
    {
        id: 'terms-of-service',
        title: 'Terms of Service',
        fileName: 'Terms_of_Service',
        category: 'Legal Documents',
        summary: 'Acceptable use and platform terms.',
        sections: [
            { heading: 'Acceptable Use', body: ['Users must keep accounts secure, enter lawful school data, avoid misuse, and respect intellectual property.'] },
            { heading: 'Updates and Liability', body: ['NexaGen may update the service to improve reliability, security, and functionality during the subscription.'] },
        ],
    },
    {
        id: 'data-processing-agreement',
        title: 'Data Processing Agreement',
        fileName: 'Data_Processing_Agreement',
        category: 'Legal Documents',
        summary: 'Processing commitments for school data.',
        sections: [
            { heading: 'Processing Role', body: ['The school controls the data. NexaGen processes student, parent, staff, academic, and finance records to provide NexaLMS.'] },
            { heading: 'Safeguards', body: ['Access controls, school isolation, backups, and support processes are used to reduce data risk.'] },
        ],
    },
    {
        id: 'nda',
        title: 'Non-Disclosure Agreement',
        fileName: 'Non_Disclosure_Agreement',
        category: 'Legal Documents',
        summary: 'Confidential discussion protection.',
        sections: [
            { heading: 'Confidential Information', body: ['Covers school processes, pricing discussions, implementation materials, product details, and non-public operational information.'] },
            { heading: 'Obligation', body: ['Each party agrees to use confidential information only for evaluating, implementing, or supporting NexaLMS.'] },
        ],
    },
    {
        id: 'onboarding-form',
        title: 'School Onboarding Form',
        fileName: 'School_Onboarding_Form',
        category: 'Implementation Documents',
        summary: 'Information needed to start setup.',
        sections: [
            { heading: 'School Information', body: ['School name, KNEC code, type, county, principal, deputy, ICT contact, official contacts, address, logo, and motto.'] },
            { heading: 'Academic Structure', body: ['Classes, streams, subjects, academic year, terms, departments, and teacher-subject assignments.'] },
        ],
    },
    {
        id: 'data-import-template',
        title: 'Data Import Template',
        fileName: 'Data_Import_Template',
        category: 'Implementation Documents',
        summary: 'Spreadsheet template guide.',
        sections: [
            { heading: 'Import Sheets', body: ['Students, teachers, subjects, classes, guardians, and fee structures. Each sheet should use consistent IDs or names for matching.'] },
            { heading: 'Validation', body: ['Confirm class names, admission numbers, guardian phone numbers, and required columns before upload.'] },
        ],
    },
    {
        id: 'go-live-checklist',
        title: 'Go-Live Checklist',
        fileName: 'Go_Live_Checklist',
        category: 'Implementation Documents',
        summary: 'Final launch checklist.',
        sections: [
            { heading: 'Checklist', body: ['School profile completed, teachers imported, students imported, subjects configured, timetable generated, exams configured, users trained, and backup verified.'] },
        ],
    },
    {
        id: 'payment-documents',
        title: 'Payment Documents',
        fileName: 'Payment_Documents',
        category: 'Payment Documents',
        summary: 'Invoices, receipts, and renewal notes.',
        sections: [
            { heading: 'Accepted Methods', body: ['M-PESA, bank transfer, card, and supported mobile money channels.'] },
            { heading: 'Issue After Payment', body: ['Official invoice, payment receipt, and subscription renewal reminder.'] },
        ],
    },
    {
        id: 'support-guides',
        title: 'Support Guides',
        fileName: 'Support_Guides',
        category: 'Support Documents',
        summary: 'Manuals and role-specific guides.',
        sections: [
            { heading: 'Included Guides', body: ['User Manual, Quick Start Guide, Administrator Guide, Teacher Guide, and Support Contact Sheet.'] },
            { heading: 'Teacher Focus', body: ['Attendance, marks entry, announcements, timetables, and report downloads.'] },
        ],
    },
    {
        id: 'security-document',
        title: 'Security Document',
        fileName: 'Security_Document',
        category: 'Security Documents',
        summary: 'Security practices for school confidence.',
        sections: [
            { heading: 'Controls', body: ['Password policy, backups, encryption, role-based access, audit logs, and disaster recovery planning.'] },
            { heading: 'Confidence Message', body: ['Security documentation helps schools understand how NexaLMS protects sensitive student and staff information.'] },
        ],
    },
    {
        id: 'marketing-material',
        title: 'Marketing Material Checklist',
        fileName: 'Marketing_Material_Checklist',
        category: 'Marketing Material',
        summary: 'Printed and digital sales assets.',
        sections: [
            { heading: 'Prepare', body: ['Roll-up banner, flyer, tri-fold brochure, presentation slides, demo account, demo database, and a 1-2 minute promotional video.'] },
            { heading: 'School Visit Folder', body: ['Company profile, brochure, proposal template, quotation template, sample contract, sample report card, sample timetable, analytics sample, business cards, and contact sheet.'] },
        ],
    },
    {
        id: 'founding-partner',
        title: 'Founding Partner Program',
        fileName: 'Founding_Partner_Program',
        category: 'Sales Documents',
        summary: 'Pilot offer for the first 10 schools.',
        sections: [
            { heading: 'Offer', body: ['Select 10 schools for onboarding, training, and priority support in exchange for feedback and a reference after successful deployment.'] },
            { heading: 'Why It Works', body: ['It lowers resistance, creates testimonials, and gives future schools real reports, analytics, and case studies to review.'] },
        ],
    },
];

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * 5.5;
}

export function generateBusinessDocumentPdf(documentItem: BusinessDocument) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    let y = 18;

    const footer = () => {
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text('NexaGen Technologies | NexaLMS', margin, pageHeight - 10);
        doc.text('www.nexagen.co.ke | +254 719 637 416', pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.setTextColor(0);
    };

    doc.setFillColor(5, 150, 105);
    doc.rect(0, 0, pageWidth, 34, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(documentItem.title, margin, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(documentItem.category, margin, 26);
    doc.setTextColor(0);
    y = 46;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    y = addWrappedText(doc, documentItem.summary, margin, y, pageWidth - margin * 2) + 5;

    documentItem.sections.forEach(section => {
        if (y > 250) {
            footer();
            doc.addPage();
            y = 18;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(4, 120, 87);
        doc.text(section.heading, margin, y);
        y += 7;
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        section.body.forEach(line => {
            y = addWrappedText(doc, line, margin, y, pageWidth - margin * 2) + 3;
        });
        y += 2;
    });

    footer();
    return doc;
}

export function downloadBusinessDocument(documentItem: BusinessDocument) {
    const doc = generateBusinessDocumentPdf(documentItem);
    downloadPdf(doc, documentItem.fileName);
}
