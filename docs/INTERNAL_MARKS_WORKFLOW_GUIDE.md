stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: Teacher submits for approval
    Submitted --> Approved: HOD approves
    Submitted --> Rejected: HOD rejects with reason
    Rejected --> Draft: Teacher corrects and re-submits
    Approved --> Frozen: Principal freezes
    Frozen --> Published: HOD/Principal publishes
    Published --> [*]: Final state

    note right of Draft
        Teacher: Create, Update, Delete, Submit
    end note

    note right of Submitted
        HOD/Principal/Admin: Approve, Reject
    end note

    note right of Approved
        Principal/Admin: Freeze
    end note

    note right of Rejected
        Teacher: Update, Re-submit
    end note

    note right of Frozen
        HOD/Principal/Admin: Publish
    end note

    note right of Published
        All: View only
    end note

## Overview
This guide describes the internal marks workflow, roles involved, and how the frontend and backend collaborate to manage marks from draft to publication.

## Workflow States
- Draft: Teacher creates or updates marks; editable.
- Submitted: Teacher submits marks for approval; awaiting HOD review.
- Approved: HOD approves submitted marks; ready for freezing/publishing.
- Rejected: HOD rejects with reason; teacher corrects and re-submits.
- Frozen: Principal freezes approved marks; locked from edits.
- Published: Final state; marks visible, read-only.

## Role-Based Permissions
- Teacher: Create, update, submit; correct rejected marks; view all for owned assignments.
- HOD: View submitted; approve or reject; publish when appropriate.
- Principal/Admin: Freeze approved marks; publish; view all.
- Student: View published marks.

## API Endpoints
- `POST /internal-marks`: Create mark.
- `GET /internal-marks`: List marks; supports filters `student_id`, `subject_assignment_id`, `semester_id`, `academic_year_id`, `workflow_state`.
- `GET /internal-marks/{id}`: Get mark by ID.
- `PUT /internal-marks/{id}`: Update marks and notes; allowed in Draft/Rejected.
- `POST /internal-marks/{id}/submit`: Submit for approval.
- `POST /internal-marks/{id}/approve`: Approve submitted mark.
- `POST /internal-marks/{id}/reject`: Reject with reason.
- `POST /internal-marks/{id}/freeze`: Freeze approved mark.
- `POST /internal-marks/{id}/publish`: Publish mark.
- `GET /internal-marks/submitted/list`: List submitted marks (HOD/Principal) with pagination and optional `department_id`.
- `POST /internal-marks/bulk-submit`: Submit all draft marks for a subject assignment.

## Frontend Features
- Internal Marks Entry UI for teachers with per-student rows, validation, and bulk actions.
- Auto-save with debounce; bulk save; bulk submit; CSV/XLSX template export and upload.
- Keyboard shortcuts: Ctrl+S save all, Ctrl+U upload, Ctrl+E export, F1 help, arrows/tab/enter navigation.
- Pagination for large classes; virtualization planned but deferred pending dependency adoption.

## Testing Guide Overview
- Unit and integration tests cover create, submit, approve, reject, freeze, publish, and bulk submit.
- Manual testing scenarios are detailed in `docs/TESTING_WORKFLOW_GUIDE.md`.

## Troubleshooting
- Duplicate mark errors: Ensure update endpoint is used for existing mark IDs.
- Cache issues: Frontend invalidates `internal-marks` queries after mutations; refresh if stale.
- Permission errors: Verify user roles and subject assignment ownership.