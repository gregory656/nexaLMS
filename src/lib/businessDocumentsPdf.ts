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
        summary: 'Enterprise software solutions transforming educational institutions across Kenya.',
        sections: [
            { heading: 'About NexaGen Technologies', body: ['NexaGen Technologies is a premier software engineering firm specializing in cloud-based enterprise solutions for the education sector. Founded with a vision to digitize and modernize institutional operations, we deliver cutting-edge platforms that streamline administration, enhance decision-making, and secure critical data through world-class cloud infrastructure.'] },
            { heading: 'Our Flagship Solution', body: ['NexaLMS represents the pinnacle of educational technology innovation—a comprehensive digital ecosystem that unifies student information management, academic operations, financial tracking, and institutional analytics into one seamless, intelligent platform. Built for scalability, security, and ease of use, it serves institutions ranging from 50 to 50,000 learners without performance degradation.'] },
            { heading: 'Technical Excellence', body: ['Cloud-Native Architecture: 99.9% uptime with automated failover and geographic redundancy.', 'Enterprise Security: AES-256 encryption at rest and in transit, compliant with Kenya Data Protection Act.', 'Real-Time Processing: Sub-second data synchronization across all authorized devices and users.', 'AI-Powered Insights: Machine learning algorithms for predictive analytics and intelligent resource optimization.'] },
            { heading: 'Our Vision & Mission', body: ['Vision: To become the digital backbone of Kenyan education infrastructure.', 'Mission: To empower institutions to run clean, data-driven operations through world-class cloud technologies while ensuring complete data sovereignty and security.'] },
            { heading: 'Official Payment Channels', body: ['M-PESA Number: 0719637416 - STEPHEN OTIENO', 'M-PESA Paybill: 522522, Account Number: 1339185296', 'Bank Transfer (KCB/Equity): Account 1339185296 - STEPHEN OTIENO'] },
        ],
    },
    {
        id: 'product-brochure',
        title: 'NexaLMS Brochure',
        fileName: 'NexaLMS_Brochure',
        category: 'Company Documents',
        summary: 'Revolutionary school management software built for the modern Kenyan institution.',
        sections: [
            { heading: 'The NexaLMS Revolution', body: ['NexaLMS is a complete digital transformation platform engineered for educational institutions. Built on cutting-edge cloud architecture, it replaces fragmented spreadsheets, paper files, and disconnected software with one intelligent, unified ecosystem that learns and grows with your institution.'] },
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
        summary: 'Transparent, scalable pricing designed for educational institutions of all sizes.',
        sections: [
            { heading: 'Starter Plan - KES 5 per student/month', body: ['Core Digital Infrastructure: Student enrollment, guardian management, and staff administration.', 'Attendance Management: Daily attendance tracking with absenteeism alerts and pattern analysis.', 'Basic Reporting: Standard reports on enrollment, attendance, and staff allocation.', 'Technical Support: Email support during business hours (8 AM - 5 PM EAT).', 'Data Security: Full encryption, automated daily backups, and 99.9% uptime guarantee.'] },
            { heading: 'Standard Plan - KES 7 per student/month', body: ['All Starter Features Plus:', 'Academic Suite: Complete examination management, automated grading, and curriculum-aligned rubrics.', 'Dynamic Report Cards: Instant PDF generation with personalized student analytics and performance insights.', 'Timetable Intelligence: AI-powered conflict-free scheduling with automatic teacher and room optimization.', 'Enhanced Analytics: Subject-wise performance tracking, class comparisons, and trend analysis.', 'Priority Support: Phone and email support with 24-hour response time.'] },
            { heading: 'Premium Plan - KES 10 per student/month', body: ['All Standard Features Plus:', 'Financial Intelligence: Complete fee management, automated balance calculations, and payment tracking.', 'Payment Integration: Seamless M-PESA and bank payment gateway with real-time reconciliation.', 'Advanced Analytics: Predictive modeling for at-risk student identification and resource optimization.', 'Custom Integrations: API access for third-party system integration and custom reporting.', 'VIP Support: Dedicated account manager, 24/7 emergency support, and on-site training sessions.'] },
            { heading: 'Implementation & Onboarding', body: ['Free Setup: Complete system configuration, data migration, and staff training included.', 'Training Sessions: Comprehensive onboarding for administrators, teachers, and support staff.', 'Ongoing Support: Regular system updates, security patches, and feature enhancements at no extra cost.'] },
            { heading: 'Billing Terms', body: ['Only currently active, enrolled students are billed monthly.', 'Alumni, dropped, and transferred profiles remain accessible at no charge.', 'Annual contracts available with discounted pricing for prepayment.', 'No hidden fees, no long-term lock-in, cancel with 30-day notice.'] },
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
        summary: 'Exclusive pilot program for pioneering institutions to shape the future of educational technology.',
        sections: [
            { heading: 'The Founding Partner Opportunity', body: ['NexaGen Technologies is seeking 10 pioneering institutions to become Founding Partners in our mission to transform educational operations across Kenya. Selected partners will receive the complete NexaLMS platform at no cost for an entire academic year, including full implementation, training, and premium support.'] },
            { heading: 'Partner Benefits', body: ['Zero Cost Deployment: Complete platform access including Premium features for 12 months.', 'Priority Implementation: Dedicated implementation team with expedited setup and data migration.', 'Comprehensive Training: On-site training for administrators, teachers, and IT staff.', 'Feature Influence: Direct input on future platform development and feature prioritization.', 'Lifetime Discount: 20% discount on all future subscriptions after the pilot period.', 'Marketing Recognition: Featured as a founding partner in our marketing materials and case studies.'] },
            { heading: 'Partner Commitments', body: ['Active Usage: Full implementation across relevant departments with consistent platform utilization.', 'Feedback Loop: Regular feedback sessions to help improve platform functionality and user experience.', 'Reference Status: Willingness to serve as a reference for prospective partner institutions.', 'Case Study Participation: Allow anonymized usage statistics and success metrics for marketing purposes.', 'Annual Review: Participation in annual review to assess partnership renewal and expansion.'] },
            { heading: 'Selection Criteria', body: ['Institution Size: 200+ students preferred for meaningful pilot data.', 'Technology Readiness: Basic internet infrastructure and willingness to adopt digital solutions.', 'Leadership Commitment: Strong administrative support for digital transformation initiatives.', 'Geographic Diversity: Selection across different regions to ensure representative testing.'] },
            { heading: 'Application Process', body: ['Expression of Interest: Submit formal request with institution profile and current challenges.', 'Discovery Call: Virtual meeting to assess fit and discuss implementation requirements.', 'Agreement Signing: Execution of founding partner agreement with mutual commitments.', 'Implementation Kickoff: Dedicated onboarding team assigned with timeline and milestones.'] },
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

// Quotation Types
export type QuotationItem = {
    description: string;
    amount: number;
};

export type Quotation = {
    id: string;
    quotationNumber: string;
    dateIssued: string;
    validUntil: string;
    preparedBy: string;
    referenceNumber?: string;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
    schoolInfo: {
        name: string;
        principalName: string;
        address: string;
        email: string;
        phone: string;
    };
    items: QuotationItem[];
    normalAmount: number;
    discountAmount: number;
    finalAmount: number;
    terms: string[];
};

export async function generateQuotationPdf(quotation: Quotation) {
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

    // Watermark
    doc.setTextColor(245, 250, 248);
    doc.setFontSize(80);
    doc.setFont('helvetica', 'bold');
    doc.text('NEXAGEN', pageWidth / 2, pageHeight / 2, { align: 'center', angle: -45 });

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 45, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 45, pageWidth, 2, 'F');

    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('QUOTATION', margin, 22);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('NexaGen Technologies', margin, 30);
    doc.setFontSize(9);
    doc.text('Official Business Proposal', margin, 36);

    // Quotation details in header
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text(`Quotation No: ${quotation.quotationNumber}`, pageWidth - margin, 22, { align: 'right' });
    doc.text(`Date: ${quotation.dateIssued}`, pageWidth - margin, 28, { align: 'right' });
    doc.text(`Valid Until: ${quotation.validUntil}`, pageWidth - margin, 34, { align: 'right' });

    doc.setTextColor(0);
    y = 55;

    // School Information
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87);
    doc.text('SCHOOL INFORMATION', margin, y);
    y += 6;

    doc.setDrawColor(209, 250, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`School Name: ${quotation.schoolInfo.name}`, margin, y); y += 5;
    doc.text(`Principal: ${quotation.schoolInfo.principalName}`, margin, y); y += 5;
    doc.text(`Address: ${quotation.schoolInfo.address}`, margin, y); y += 5;
    doc.text(`Email: ${quotation.schoolInfo.email}`, margin, y); y += 5;
    doc.text(`Phone: ${quotation.schoolInfo.phone}`, margin, y); y += 8;

    if (quotation.referenceNumber) {
        doc.text(`Reference: ${quotation.referenceNumber}`, margin, y); y += 8;
    }

    // Pricing Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87);
    doc.text('PRICING DETAILS', margin, y);
    y += 6;

    doc.setDrawColor(209, 250, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 5;

    // Table header
    doc.setFillColor(240, 249, 245);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Description', margin + 2, y + 5);
    doc.text('Amount (KES)', pageWidth - margin - 2, y + 5, { align: 'right' });
    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    quotation.items.forEach((item, index) => {
        if (index % 2 === 0) {
            doc.setFillColor(255, 255, 255);
        } else {
            doc.setFillColor(248, 250, 252);
        }
        doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
        doc.setTextColor(51, 65, 85);
        doc.text(item.description, margin + 2, y + 5);
        doc.text(item.amount.toLocaleString(), pageWidth - margin - 2, y + 5, { align: 'right' });
        y += 7;
    });

    y += 5;

    // Summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Normal Setup & Training Fee: KES ${quotation.normalAmount.toLocaleString()}`, margin, y); y += 5;
    doc.setTextColor(220, 38, 38);
    doc.text(`Founding Partner Discount: KES ${quotation.discountAmount.toLocaleString()}`, margin, y); y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(4, 120, 87);
    doc.text(`Amount Payable: KES ${quotation.finalAmount.toLocaleString()} (One-Time Only)`, margin, y); y += 8;

    // Note
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    const note = 'This one-time implementation fee covers system setup, onboarding, initial configuration, administrator account creation, branding, and staff training. It is payable only once during the initial deployment of NexaLMS.';
    y = addWrappedText(doc, note, margin, y, pageWidth - margin * 2) + 8;

    // Subscription Charges Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87);
    doc.text('SUBSCRIPTION CHARGES', margin, y);
    y += 6;

    doc.setDrawColor(209, 250, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const subscriptionNote = 'Subscription charges are governed separately under the Service Agreement and are not included in this quotation unless specifically stated.';
    y = addWrappedText(doc, subscriptionNote, margin, y, pageWidth - margin * 2) + 8;

    // Terms
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87);
    doc.text('TERMS AND CONDITIONS', margin, y);
    y += 6;

    doc.setDrawColor(209, 250, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    quotation.terms.forEach(term => {
        y = addWrappedText(doc, `• ${term}`, margin, y, pageWidth - margin * 2) + 3;
    });
    y += 5;

    // Check if we need a new page for signatures
    if (y > pageHeight - 80) {
        footer();
        doc.addPage();
        y = 25;

        // Reapply watermark
        doc.setTextColor(245, 250, 248);
        doc.setFontSize(80);
        doc.setFont('helvetica', 'bold');
        doc.text('NEXAGEN', pageWidth / 2, pageHeight / 2, { align: 'center', angle: -45 });
    }

    // Acceptance Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(4, 120, 87);
    doc.text('ACCEPTANCE', margin, y);
    y += 6;

    doc.setDrawColor(209, 250, 229);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + 40, y);
    y += 8;

    // Left side - School Representative
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Accepted By - School Representative', margin, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Name: _______________________', margin, y); y += 5;
    doc.text('Designation: __________________', margin, y); y += 5;
    doc.text('Signature: ____________________', margin, y); y += 5;
    doc.text('Date: ________________________', margin, y); y += 8;

    // School Stamp Box
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, 50, 30);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('School Rubber Stamp', margin + 25, y + 15, { align: 'center' });
    y += 35;

    // Right side - NexaGen Representative
    const rightX = pageWidth - margin - 60;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('Prepared By - NexaGen Technologies', rightX, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text('Representative', rightX, y); y += 5;
    doc.text('Name: _______________________', rightX, y); y += 5;
    doc.text('Signature: ____________________', rightX, y); y += 5;
    doc.text('Date: ________________________', rightX, y); y += 8;

    // Footer line
    y += 5;
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text('This quotation is valid for 30 days from the date of issue.', pageWidth / 2, y, { align: 'center' });

    footer();
    return doc;
}

export async function downloadQuotationPdf(quotation: Quotation) {
    const doc = await generateQuotationPdf(quotation);
    const fileName = `Quotation_${quotation.schoolInfo.name.replace(/\s+/g, '_')}_${quotation.quotationNumber}`;
    downloadPdf(doc, fileName);
}
