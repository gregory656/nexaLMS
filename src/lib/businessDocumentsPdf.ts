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
        fileName: 'NexaGen_Technologies_Profile',
        category: 'Company Documents',
        summary: 'Comprehensive profile for school administration and decision-makers.',
        sections: [
            { heading: 'NexaGen Technologies', body: ['NexaGen Technologies is a premier software company building state-of-the-art digital infrastructure for Kenyan schools. Our flagship product, NexaLMS, is a powerful, modern, and reliable School ERP system designed for seamless student records, staff management, academics, fast PDF report cards, and dependable fee tracking.'] },
            { heading: 'Our Vision & Mission', body: ['Vision: To become the digital backbone of Kenyan education infrastructure.', 'Mission: To empower schools to run clean operations, make data-driven decisions instantly, and secure student information via world-class cloud technologies.'] },
            { heading: 'Official Payment Channels', body: ['M-PESA Number: 0719637416 - STEPHEN OTIENO', 'M-PESA Paybill: 522522, Account Number: 1339185296', 'Bank Transfer (KCB/Equity): Account 1339185396 - STEPHEN OTIENO'] },
        ],
    },
    {
        id: 'product-brochure',
        title: 'NexaLMS Brochure',
        fileName: 'NexaLMS_Brochure',
        category: 'Company Documents',
        summary: 'Revolutionary school management software built for the modern Kenyan institution.',
        sections: [
            { heading: 'The NexaLMS Revolution', body: ['NexaLMS is not just another school management system—it is a complete digital transformation platform. Built on cutting-edge cloud architecture, it replaces fragmented spreadsheets, paper files, and disconnected software with one intelligent, unified ecosystem that learns and grows with your institution.'] },
            { heading: 'Core Software Architecture', body: ['Cloud-Native Infrastructure: 99.9% uptime with automated daily backups and enterprise-grade encryption.', 'Real-Time Data Synchronization: Changes made anywhere reflect instantly across all authorized devices.', 'AI-Powered Analytics: Machine learning algorithms that identify performance trends, predict at-risk students, and optimize resource allocation automatically.'] },
            { heading: 'Academic Excellence Engine', body: ['Smart Grading System: Automated grade calculation with customizable Kenyan curriculum-aligned rubrics.', 'Performance Analytics Dashboard: Visual charts showing student progress, subject-wise performance, and comparative class analytics.', 'Exam Management Module: Create, schedule, and conduct exams with automated result processing and instant PDF report card generation featuring personalized student insights.'] },
            { heading: 'Financial Intelligence Suite', body: ['Fee Structure Automation: Dynamic fee setup with automatic balance calculations and payment tracking.', 'Integrated Payment Gateway: Seamless M-PESA and bank payment integration with real-time reconciliation.', 'Financial Reporting: Comprehensive income statements, fee collection analytics, and default prediction alerts.'] },
            { heading: 'Administrative Command Center', body: ['Digital Admissions Portal: Paperless student enrollment with automated admission number generation and guardian linking.', 'Smart Attendance System: Biometric or mobile-based attendance with automated absenteeism alerts and pattern analysis.', 'AI Timetable Generator: Conflict-free timetable creation that optimizes teacher allocation and classroom utilization automatically.'] },
            { heading: 'Why NexaLMS Wins', body: ['Zero Installation Required: Access from any device with a browser—no expensive hardware or IT maintenance needed.', 'Unlimited Scalability: From 50 to 50,000 students, the system performs consistently without degradation.', 'Kenyan Curriculum Native: Built specifically for 8-4-4 and CBC systems with local compliance and reporting standards.'] },
        ],
    },
    {
        id: 'pricing-sheet',
        title: 'Official Pricing Sheet',
        fileName: 'Pricing_Sheet',
        category: 'Sales Documents',
        summary: 'Transparent, per-student monthly pricing matrix.',
        sections: [
            { heading: 'Starter Plan - KES 5', body: ['Per active student/month.', 'Focus: Digital admissions, student/guardian records, teacher management, and daily attendance tracing.'] },
            { heading: 'Standard Plan - KES 7', body: ['Per active student/month.', 'Focus: Includes STARTER features PLUS Exams Management, automated Grading, dynamic PDF Report Cards, and AI-assisted Timetable generation.'] },
            { heading: 'Premium Plan - KES 10', body: ['Per active student/month.', 'Focus: Includes STANDARD features PLUS complete Finance tracking, fee structures, comprehensive Analytics, and Priority VIP Support.'] },
            { heading: 'Note', body: ['Only currently active, enrolled students are billed. Alumni, dropped, and transferred profiles remain accessible for free.'] },
        ],
    },
    {
        id: 'service-agreement',
        title: 'Master Service Agreement',
        fileName: 'NexaGen_Service_Agreement',
        category: 'Legal Documents',
        summary: 'Official implementation and support binding contract.',
        sections: [
            { heading: '1. Agreement Scope & Parties involved', body: ['This Agreement is entered into by and between NexaGen Technologies ("Provider") and the undersigned School ("Client") for the licensing and support of the NexaLMS cloud software.'] },
            { heading: '2. Subscription & Renewal Terms', body: ['The initial contract term is valid for the agreed academic year(s). The contract can be renewed automatically after a period of 3 years or the originally agreed term unless terminated by either party with a 60-day notice.'] },
            { heading: '3. Service Level & Support', body: ['NexaGen provides 99.9% uptime, regular automated backups, security patching, and technical support via phone, email, and live training sessions to ensure smooth school operations.'] },
            { heading: '4. Agreement & Signatures', body: ['Agreed to execute this software deployment under the terms stipulated above.', '', '_________________________________________________', 'NexaGen Technologies Representative', '', '_________________________________________________', 'Authorized School Principal / Head Teacher', '', 'Date: ________________________  Seal/Rubber Stamp: ________________'] },
        ],
    },
    {
        id: 'founding-partner',
        title: 'Founding Partner Program',
        fileName: 'Founding_Partner_Offer',
        category: 'Sales Documents',
        summary: 'Exclusive pilot offer for the first 10 pioneering schools.',
        sections: [
            { heading: 'The Founding Partner Offer', body: ['NexaGen Technologies is offering an exclusive grant to the first 10 schools that adopt NexaLMS. The selected 10 schools will receive the platform completely FREE for an agreed pilot period (up to 1 full academic year).'] },
            { heading: 'Mutual Benefits', body: ['In exchange for this free deployment, training, and premium support, the partner school agrees to provide ongoing feedback, act as a reference for future schools, and allow NexaGen to use anonymized statistics as case studies.'] },
            { heading: 'Acceptance', body: ['_________________________________________________', 'School Principal Signature', '', 'Date: ________________________  Rubber Stamp: ________________'] },
        ],
    },
    {
        id: 'privacy-policy',
        title: 'Data Privacy Policy',
        fileName: 'Privacy_Policy',
        category: 'Legal Documents',
        summary: 'Strict data handling and Kenya Data Protection Act compliance.',
        sections: [
            { heading: 'Data Ownership & Protection', body: ['The School retains full ownership of all inputted student, staff, and financial data. NexaGen acts solely as the Data Processor. All data is securely encrypted at rest and in transit.'] },
            { heading: 'Compliance', body: ['Operations strictly align with the Kenya Data Protection Act. We do not sell, rent, or expose school data to unauthorized third parties.'] },
            { heading: 'Signature of Acknowledgement', body: ['_________________________________________________', 'Head of Institution', '', 'Date: ________________________  Rubber Stamp: ________________'] },
        ],
    },
];

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * 5.5;
}

export async function generateBusinessDocumentPdf(documentItem: BusinessDocument) {
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

    // Glitering seal/watermark layer
    doc.setTextColor(240, 248, 245);
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    doc.text('NEXAGEN', pageWidth / 2, pageHeight / 2, { align: 'center', angle: -45 });

    // Header block
    doc.setFillColor(15, 23, 42); // Premium dark slate
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFillColor(16, 185, 129); // Green accent line
    doc.rect(0, 40, pageWidth, 2, 'F');

    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text(documentItem.title, margin, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(`Official ${documentItem.category}`, margin, 30);

    doc.setTextColor(0);
    y = 55;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    y = addWrappedText(doc, documentItem.summary, margin, y, pageWidth - margin * 2) + 8;

    documentItem.sections.forEach(section => {
        if (y > 240) {
            footer();
            doc.addPage();
            y = 25;

            // Reapply watermark on new pages
            doc.setTextColor(245, 250, 248);
            doc.setFontSize(80);
            doc.setFont('helvetica', 'bold');
            doc.text('NEXAGEN', pageWidth / 2, pageHeight / 2, { align: 'center', angle: -45 });
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(4, 120, 87);
        doc.text(section.heading, margin, y);
        y += 6;

        // Add a subtle line under headings
        doc.setDrawColor(209, 250, 229);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + 40, y);
        y += 4;

        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        section.body.forEach(line => {
            if (line.includes('_________________________________________________') || line.includes('Signature') || line.includes('Rubber Stamp')) {
                // Signature lines formatting
                y += 2;
                doc.setFont('helvetica', 'bold');
                y = addWrappedText(doc, line, margin, y, pageWidth - margin * 2) + 2;
                doc.setFont('helvetica', 'normal');
            } else {
                y = addWrappedText(doc, line, margin, y, pageWidth - margin * 2) + 3;
            }
        });
        y += 5;
    });

    // Add seal or fancy finish line if it's a contract
    if (documentItem.category === 'Legal Documents' || documentItem.category === 'Sales Documents') {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 30;
        }
        y += 10;
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1);
        doc.line(margin, y, pageWidth - margin, y); // The glittering line equivalent
        y += 6;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100);
        doc.text('This document is a binding expression of intent generated securely by NexaLMS.', pageWidth / 2, y, { align: 'center' });
    }

    footer();
    return doc;
}

export async function downloadBusinessDocument(documentItem: BusinessDocument) {
    const doc = await generateBusinessDocumentPdf(documentItem);
    downloadPdf(doc, documentItem.fileName);
}
