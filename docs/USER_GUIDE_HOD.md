# HOD User Guide – DSABA LMS

## Responsibilities
- Department-level management: users, subjects, assignments, marks approval, analytics and reports.

## Key Pages
- Dashboard: department KPIs (`frontend/src/pages/HOD/HODAnalytics.tsx`).
- CO/PO Attainment Dashboard: analyze outcome attainment (`frontend/src/pages/HOD/COPOAttainmentDashboard.tsx`).
- Marks Approval: approve/reject internal marks (`frontend/src/pages/HOD/MarksApproval.tsx`).
- Report Management: generate department reports (`frontend/src/pages/HOD/HODReportManagement.tsx`).
- Semester Publishing: manage semester publishing (`frontend/src/pages/HOD/SemesterPublishing.tsx`).
- Users/Subjects: manage department users and subjects.

## Workflows
- Approve Internal Marks: navigate to Marks Approval → review → approve/reject; state transitions recorded in audit.
- Generate Reports: select type and filters; export as PDF/CSV.
- Analyze Attainment: configure filters by academic year/semester and review CO/PO thresholds.

## Permissions
- Requires HOD role; UI gated via role guard and permissions.