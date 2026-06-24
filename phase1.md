For a serious school ERP / Zeraki-like platform, think beyond the first release. Include entities you may not implement immediately, but account for in the domain model now.

Core System

School
Campus/Branch
AcademicYear
Term/Semester
User
Role
Permission
UserRole
AuditLog
Notification
SystemSetting
Subscription
SubscriptionPlan


---

Student Management

Student
StudentProfile
StudentStatus
StudentAdmission
StudentTransfer
StudentExit
StudentDocument
StudentMedicalRecord
StudentDisciplineRecord
StudentAchievement
StudentClubMembership
StudentHouse
StudentEmergencyContact
StudentTransportAssignment
StudentDevice


---

Parent / Guardian Management

Parent
Guardian
ParentStudentRelationship
ParentContact


---

Teacher Management

Teacher
TeacherProfile
TeacherQualification
TeacherCertification
TeacherEmployment
TeacherContract
TeacherAttendance
TeacherLeave
TeacherDiscipline
TeacherPayrollProfile
TeacherSubjectAssignment
TeacherClassAssignment


---

Staff Management

Staff
StaffDepartment
StaffAttendance
StaffLeave
StaffPayrollProfile
StaffContract


---

Academic Structure

Department
Faculty
GradeLevel
Class
Stream
Subject
SubjectCategory
SubjectCombination
Curriculum
CurriculumUnit
AcademicCalendar
AcademicEvent


---

Teaching & Learning

LessonPlan
Lesson
LessonResource
Assignment
AssignmentSubmission
Homework
HomeworkSubmission
LearningMaterial
Course
CourseEnrollment
Discussion
DiscussionReply


---

Attendance

StudentAttendance
AttendanceSession
AttendanceReason
AttendanceReport


---

Examination System

Exam
ExamType
ExamSchedule
ExamPaper
ExamSubject
ExamResult
ExamScore
ExamGrade
GradeScale
Ranking
MeritList
ExamRemark


---

Report Cards & Analytics

ReportCard
ReportCardEntry
StudentPerformance
SubjectPerformance
TeacherPerformance
ClassPerformance
SchoolPerformance
AnalyticsSnapshot


---

Timetable

Timetable
TimetableEntry
Room
Building
Period
TimeSlot
RoomAssignment
TeacherSchedule
ClassSchedule


---

Finance

FeeCategory
FeeStructure
FeeItem
Invoice
InvoiceItem
Payment
PaymentMethod
PaymentTransaction
Receipt
Refund
Discount
Scholarship
Bursary
Fine
FinancialAccount
FinancialTransaction


---

Library

Book
BookCategory
BookCopy
BookIssue
BookReservation
LibraryFine
Author
Publisher


---

Transport

Vehicle
Route
Stop
Driver
TransportAssignment
TransportFee


---

Hostel / Boarding

Hostel
Dormitory
RoomAllocation
BedAllocation
BoardingFee


---

Communication

Announcement
Message
Conversation
SMSLog
EmailLog
PushNotification
NotificationPreference


---

Discipline

DisciplineCase
DisciplineAction
DisciplineCategory
DisciplineEvidence


---

Health

MedicalRecord
MedicalCondition
Medication
ClinicVisit
Immunization
HealthIncident


---

Events

Event
EventAttendance
EventRegistration
Competition
CompetitionResult


---

Clubs & Activities

Club
ClubMember
ClubActivity
SportsTeam
TeamMember
TeamFixture


---

Inventory & Assets

Asset
AssetCategory
AssetAssignment
AssetMaintenance
InventoryItem
InventoryCategory
InventoryTransaction
Supplier
PurchaseOrder


---

Human Resource (Advanced)

Payroll
SalaryComponent
SalaryPayment
Deduction
Allowance
TaxRecord
LeaveType
LeaveRequest
LeaveApproval
PerformanceReview


---

Admissions

Application
Applicant
AdmissionExam
AdmissionResult
AdmissionOffer
Enrollment


---

Alumni

Alumni
AlumniContact
AlumniEmployment
AlumniContribution


---

Documents

Document
DocumentCategory
DocumentVersion
DocumentShare


---

AI & Analytics (Future)

PredictionModel
StudentRiskPrediction
PerformanceForecast
Recommendation
LearningInsight


---

Billing (SaaS Side)

These are for your business, not the school.

Tenant
Subscription
Plan
PlanFeature
UsageRecord
Invoice
Payment
Coupon
Trial


---

Minimum Viable Set (What I'd actually start with)

If you're building Version 1:

School
User
Role
Permission

Student
Parent
Teacher

AcademicYear
Term
Class
Stream
Subject

Exam
ExamResult
GradeScale

ReportCard

Attendance

FeeStructure
Invoice
Payment
Receipt

Timetable
TimetableEntry

Announcement

AuditLog

That core set is enough to support most schools while remaining manageable. The next step is to convert these entities into an ERD and identify which are independent roots (e.g., School, User, Student, Teacher, Subject) versus dependent entities (e.g., ExamResult, InvoiceItem, TimetableEntry). That classification will drive a stable PostgreSQL schema.