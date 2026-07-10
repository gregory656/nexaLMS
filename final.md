---

1. Examinations Module

This becomes the heart of the system.

Sidebar

Examinations
├── Dashboard
├── Exam Setup
├── Subject Setup
├── Marks Entry
├── Bulk Upload Results
├── Publish Results
├── Analytics
├── Student Search
├── Joint School Ranking
├── School Ranking
├── Class Ranking
├── Subject Analysis
├── Teacher Analysis
├── Grade Distribution
├── Download Centre
├── Archived Exams


---

Exam Setup

Create an exam.

Fields:

Academic Year

Term

Exam Name

Opening Date

Closing Date

Total Marks

Grade Scale

Joint School? (Yes/No)

Ranking Method

Publish Immediately? (No)



---

Marks Entry

Support:

Manual Entry

Excel Upload

CSV Upload


Choose:

School

↓

Class

↓

Subject

↓

Teacher

↓

Upload

Show validation before import:

Missing Admission Number

Duplicate Student

Unknown Student

Wrong Subject

Wrong Marks


---

Publish Results

After validation:

Preview

↓

Publish

↓

Lock Results

Once locked, editing requires permission.


---

Analytics

This is where NexaLMS stands out.

Generate and permanently store an analytics snapshot for every published exam.

Possible analytics include:

Student

Position in School

Position in Class

Position in Stream

Total Marks

Mean Score

Mean Grade

Subject Grades

GPA (if applicable)

Highest Subject

Weakest Subject

Most Improved

Biggest Drop

Attendance vs Performance

Previous Term Comparison

Previous Year Comparison

Grade Trend

Performance Trend



---

Subject

Highest Score

Lowest Score

Mean

Median

Mode

Standard Deviation

Pass Rate

Fail Rate

Grade Distribution

Gender Comparison

Stream Comparison

Teacher Comparison



---

Teacher

Best Performing Teacher

Highest Mean

Lowest Mean

Average Improvement

Pass Rate

Distinction Rate

Students Improved

Students Declined



---

Class

Best Class

Lowest Class

Mean

Overall Grade

Subject Rankings

Performance Trend



---

School

Mean Score

Mean Grade

KCSE Projection (if applicable)

Pass Rate

Overall Ranking

Stream Comparison

Department Comparison



---

Gender (Mixed Schools)

Best Boy

Best Girl

Top 10 Boys

Top 10 Girls

Mean Boys

Mean Girls

Subject Comparison


For boys-only schools, omit girl rankings. For girls-only schools, omit boy rankings. For mixed schools, generate both.


---

Joint School Ranking

During exam setup:

Was this a Joint Examination?

YES

↓

Select Schools

↓

Generate Combined Ranking

Outputs:

Overall Joint Position

School Position

Class Position

Stream Position



---

Download Centre

Allow downloading:

School Analysis PDF

Teacher Analysis PDF

Subject Analysis PDF

Student Reports

Top 100

Bottom 100

Most Improved

Complete Analytics Booklet

Bulk downloads:

Download All Student Reports

Download All Teacher Reports

Download School Analytics

Download Subject Analytics


---

2. Report Cards

Sidebar

Report Cards
├── Generate
├── Preview
├── Student Report
├── Class Reports
├── School Reports
├── Bulk Download
├── Templates
├── Published Reports

Each report should include:

School logo

Watermark

Student photo

Admission number

Class

Stream

Subjects

Marks

Grades

Teacher remarks

Principal remarks

Attendance summary

Fee balance (optional)

QR code for verification (future enhancement)



---

Graphs

Every report should show trends.

Examples:

Line graph:

Term 1

Term 2

Term 3

Current

Subject performance chart.

Pie chart:

A

B

C

D

E

Radar chart:

Math

English

Science

Kiswahili

History

Performance trend over previous exams.


---

3. Attendance

Sidebar

Attendance
├── Dashboard
├── Student Attendance
├── Teacher Attendance
├── Attendance Reports
├── Trends
├── Late Arrivals
├── Absentees
├── Bulk Attendance

Analytics:

Daily Attendance

Weekly

Monthly

Attendance %

Chronic Absentees

Most Punctual Class

Most Punctual Student



---

4. Fee Management

Sidebar

Finance
├── Dashboard
├── Fee Structure
├── Invoices
├── Payments
├── Payment Verification
├── Outstanding Balances
├── Receipts
├── Discounts
├── Scholarships
├── Refunds
├── Reports

Support:

IntaSend

Manual Payment

Bank

M-PESA


Downloads:

Receipt

Statement

Fee Balance Report

Defaulters List


Analytics:

Total Collected

Outstanding

Monthly Collection

Class Collection

Collection Trend



---

5. Roles & Permissions

Sidebar

Roles
├── Users
├── Roles
├── Permissions
├── Departments
├── Login History
├── Audit Logs

Roles:

Super Admin

School Admin

Principal

Deputy

Bursar

Exams Officer

Teacher

Class Teacher

Parent

Student


Permissions should be action-based (e.g., exam.create, report.publish, finance.view) rather than page-based.


---

6. Announcements

Sidebar

Announcements
├── New Announcement
├── Published
├── Scheduled
├── Drafts
├── Archive

Target audience:

Whole School

Teachers

Parents

Students

Class

Stream

Department


Options:

Attach PDF

Attach Image

Schedule publish

Pin announcement

Expiry date



---

PDF Generation

Every generated PDF should use a common service with:

School logo

Watermark

Header

Footer

Generated timestamp

Generated by

Version

QR verification (optional)

Consistent margins and typography


This ensures all reports, analytics, timetables, and financial documents have the same branding and quality.


---

Priority Order to Meet Your Deadline

1. Roles & Permissions (everything depends on this)


2. Examinations (data entry and publishing)


3. Analytics Engine (compute and store snapshots after publishing)


4. Report Cards (consume analytics and exam data)


5. Attendance


6. Fee Management


7. Announcements



The critical architectural decision is this: analytics should never be recalculated every time someone opens a report. When an exam is published, calculate all rankings, means, graphs, trends, teacher performance, subject statistics, and improvement metrics once, save those results as an immutable analytics snapshot, and have report cards and dashboards read from that snapshot. This makes downloads fast, keeps reports consistent, and avoids ranking changes unless a new exam version is published.
Her is the analytics how it would look for given whatever we'll have 
Use a prompt that focuses on the design language, layout, visual hierarchy, and charts, not the football content itself.


---

Prompt for your AI Coder

> Build a premium analytics dashboard for my EdTech system using React + Vite + Tailwind CSS + Recharts.

Use the attached reference images only as UI/UX inspiration, not for content.

Design Style

Modern enterprise analytics dashboard.

Dark navy background (#07142B to #0C1F45 gradient).

Electric blue accents.

Cyan highlights.

White typography.

Purple/blue futuristic glow.

Rounded cards (16px radius).

Glassmorphism with subtle blur.

Smooth hover animations.

Professional look similar to Microsoft, Power BI, Stripe Analytics and modern SaaS dashboards.


Layout

Create an Analytics Sidebar with multiple sections:

Performance Overview

Student Performance

Subject Analysis

Class Comparison

Attendance Analysis

Fee Collection Analysis

Teacher Performance

Trend Analysis

Predictions

Reports


Each section should open into a rich analytics page.

Analytics Components

Include:

Interactive Bar Charts

Line Charts

Pie Charts

Donut Charts

Area Charts

Radar Charts

Heatmaps

KPI Cards

Progress Bars

Percentage Indicators

Distribution Graphs

Comparison Charts

Trend Indicators

Ranking Tables


Statistics Style

Use the same visual approach as the reference:

Large colorful percentage bars

Multiple datasets compared side by side

Legends with different colors

Smooth chart animations

Hover tooltips

Rounded bars

Grid lines

Professional spacing


Components

Create reusable React components:

AnalyticsLayout
AnalyticsCard
StatsCard
ComparisonChart
PercentageBar
SubjectPerformanceChart
AttendanceChart
FeeAnalyticsChart
StudentRankingTable
FilterPanel
ExportButton

Filters

Add filters for:

School

Grade

Stream

Subject

Exam

Academic Year

Term

Date Range


Features

Responsive design

Dark mode

Export PDF

Export Excel

Download charts as PNG

Print report

Animated counters

Loading skeletons

Empty states

Search

Pagination


Technical Stack

React 19

Vite

Tailwind CSS

Recharts

Framer Motion

Lucide React Icons

React Router


Code Quality

Component-based architecture

Clean folder structure

Type-safe props

Reusable components

Responsive from mobile to desktop

Accessible UI


The final result should resemble a premium analytics platform used by educational institutions, inspired by the attached screenshots' visual style, colors, charts, and statistics presentation, while displaying EdTech data instead of football statistics. The interface should feel polished enough for a commercial SaaS product.