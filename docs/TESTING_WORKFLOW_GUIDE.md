## Environment Setup
- Backend: `cd backend && python scripts/init_db.py` to initialize local DB with seed roles and sample data.
- Frontend: Start the app and login as teacher, HOD, principal, and student test users.

## Prerequisites
- Subject assignment exists for the teacher with valid `semester_id` and `academic_year_id`.
- Students enrolled in the same semester and academic year.
- Roles assigned: Teacher, HOD, Principal/Admin, Student.

## Test Scenarios
- Create Draft Marks
  - Navigate to Internal Marks Entry, select subject assignment and component.
  - Enter marks and notes for several students; verify validation messages for invalid inputs.
  - Confirm `marksData.items` reflects entered drafts.
- Auto-Save Behavior
  - Modify marks and wait for debounce; verify saving indicator updates then “All changes saved”.
  - Confirm backend receives create-or-update based on existing mark IDs; no duplicate errors.
- Save All (Ctrl+S)
  - Use keyboard shortcut; ensure all current marks are persisted.
  - Verify successful toast and `marksData.items` updated.
- Bulk Upload CSV/XLSX
  - Export template; fill sample data; upload file.
  - Validate rows processed, errors reported, and retry works.
- Submit and Approval Flow
  - Click “Submit All for Approval”; as HOD, open submitted list and approve some marks; reject others.
  - Ensure teacher sees updated workflow states and can amend rejected.
- Freeze and Publish
  - As Principal, freeze approved marks; as HOD/Principal, publish.
  - Verify students can view published marks.
- Keyboard Shortcuts
  - Test Ctrl+U, Ctrl+E, F1, Tab, Shift+Tab, arrows, Enter; verify they operate on latest state.

## Expected Outcomes
- Draft entries visible in teacher view; correct workflow badges per student.
- Submitted marks appear in HOD/principal lists without manual refresh after bulk submit.
- Rejected marks show reason and return to Draft upon teacher edits.
- Frozen marks cannot be edited; publish exposes marks to students.

## Known Issues
- Large classes can cause heavy DOM rendering; pagination mitigates; row virtualization is planned for future work.
- Network errors during auto-save are silently logged; user-initiated actions show toasts.

## Regression Checklist
- Create, update, and list marks return `{items, total}`.
- Bulk submit invalidates `['internal-marks','submitted']` queries and default key `(0,100,department)`.
- Keyboard shortcuts use latest handlers; help modal toggles reliably.
- Auto-save and Save All choose correct endpoint based on mark existence.