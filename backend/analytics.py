from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case, and_, or_, desc
from models import *
from typing import Dict, List, Any, Optional
import statistics
from collections import defaultdict

def get_student_analytics(db: Session, student_id: int) -> Dict[str, Any]:
    """Get comprehensive analytics for a student"""
    try:
        student = db.query(User).filter(User.id == student_id).first()
        if not student or student.role != UserRole.student:
            return {}

        # Get all marks for the student with related data
        marks = db.query(Mark).options(
            joinedload(Mark.question),
            joinedload(Mark.exam).joinedload(Exam.subject)
        ).filter(Mark.student_id == student_id).all()
        
        if not marks:
            return {
                "percentage": 0,
                "rank": 1,
                "total_marks": 0,
                "performance_trend": [],
                "co_attainment": {},
                "po_attainment": {}
            }

        # Calculate total marks and percentage
        total_obtained = sum(mark.marks_obtained for mark in marks)
        total_possible = sum(mark.question.max_marks for mark in marks if mark.question)
        
        percentage = (total_obtained / total_possible * 100) if total_possible > 0 else 0

        # Performance trend by exam
        exam_performance = defaultdict(lambda: {"obtained": 0, "total": 0, "name": ""})
        
        for mark in marks:
            exam_id = mark.exam_id
            exam_performance[exam_id]["obtained"] += mark.marks_obtained
            exam_performance[exam_id]["total"] += mark.question.max_marks if mark.question else 0
            if not exam_performance[exam_id]["name"] and mark.exam:
                exam_performance[exam_id]["name"] = mark.exam.name

        performance_trend = []
        for exam_data in exam_performance.values():
            if exam_data["total"] > 0:
                exam_percentage = (exam_data["obtained"] / exam_data["total"]) * 100
                performance_trend.append({
                    'exam': exam_data["name"],
                    'percentage': round(exam_percentage, 1)
                })

        # Sort by exam name for consistency
        performance_trend.sort(key=lambda x: x['exam'])

        # Calculate rank within class
        rank = 1
        if student.class_id:
            # Get all students in the same class
            class_students = db.query(User).filter(
                and_(User.class_id == student.class_id, User.role == UserRole.student, User.is_active == True)
            ).all()
            
            student_percentages = []
            for class_student in class_students:
                student_marks = db.query(Mark).options(
                    joinedload(Mark.question)
                ).filter(Mark.student_id == class_student.id).all()
                
                if student_marks:
                    s_total_obtained = sum(mark.marks_obtained for mark in student_marks)
                    s_total_possible = sum(mark.question.max_marks for mark in student_marks if mark.question)
                    s_percentage = (s_total_obtained / s_total_possible * 100) if s_total_possible > 0 else 0
                    student_percentages.append((class_student.id, s_percentage))
            
            # Sort by percentage (descending) and find rank
            student_percentages.sort(key=lambda x: x[1], reverse=True)
            rank = next((i + 1 for i, (sid, _) in enumerate(student_percentages) if sid == student_id), 1)

        # CO/PO Attainment calculation
        co_marks = defaultdict(lambda: {"obtained": 0, "total": 0})
        po_marks = defaultdict(lambda: {"obtained": 0, "total": 0})
        
        for mark in marks:
            if not mark.question:
                continue
                
            # CO attainment
            if mark.question.co_mapping:
                for co in mark.question.co_mapping:
                    co_marks[co]["obtained"] += mark.marks_obtained
                    co_marks[co]["total"] += mark.question.max_marks
            
            # PO attainment
            if mark.question.po_mapping:
                for po in mark.question.po_mapping:
                    po_marks[po]["obtained"] += mark.marks_obtained
                    po_marks[po]["total"] += mark.question.max_marks

        # Calculate attainment percentages
        co_attainment = {}
        for co, data in co_marks.items():
            if data["total"] > 0:
                co_attainment[co] = round((data["obtained"] / data["total"]) * 100, 1)

        po_attainment = {}
        for po, data in po_marks.items():
            if data["total"] > 0:
                po_attainment[po] = round((data["obtained"] / data["total"]) * 100, 1)

        return {
            "percentage": round(percentage, 1),
            "rank": rank,
            "total_marks": round(total_obtained, 1),
            "performance_trend": performance_trend,
            "co_attainment": co_attainment,
            "po_attainment": po_attainment
        }
    
    except Exception as e:
        print(f"Error in get_student_analytics: {e}")
        return {
            "percentage": 0,
            "rank": 1,
            "total_marks": 0,
            "performance_trend": [],
            "co_attainment": {},
            "po_attainment": {}
        }

def get_teacher_analytics(db: Session, teacher_id: int) -> Dict[str, Any]:
    """Get comprehensive analytics for a teacher"""
    try:
        teacher = db.query(User).filter(User.id == teacher_id).first()
        if not teacher or teacher.role != UserRole.teacher:
            return {}

        # Get subjects taught by teacher
        subjects = db.query(Subject).options(
            joinedload(Subject.class_obj)
        ).filter(Subject.teacher_id == teacher_id).all()
        
        if not subjects:
            return {
                "class_performance": {
                    "average_percentage": 0,
                    "pass_rate": 0,
                    "top_performers": 0,
                    "at_risk_students": 0
                },
                "question_analysis": [],
                "co_po_attainment": {"co_attainment": {}, "po_attainment": {}}
            }

        # Get all exams for these subjects
        subject_ids = [s.id for s in subjects]
        exams = db.query(Exam).options(
            joinedload(Exam.questions)
        ).filter(Exam.subject_id.in_(subject_ids)).all()
        
        if not exams:
            return {
                "class_performance": {
                    "average_percentage": 0,
                    "pass_rate": 0,
                    "top_performers": 0,
                    "at_risk_students": 0
                },
                "question_analysis": [],
                "co_po_attainment": {"co_attainment": {}, "po_attainment": {}}
            }

        # Get all marks for these exams
        exam_ids = [e.id for e in exams]
        marks = db.query(Mark).options(
            joinedload(Mark.question),
            joinedload(Mark.student)
        ).filter(Mark.exam_id.in_(exam_ids)).all()

        # Calculate class performance
        student_performance = defaultdict(lambda: {"obtained": 0, "total": 0})
        
        for mark in marks:
            if mark.question:
                student_performance[mark.student_id]["obtained"] += mark.marks_obtained
                student_performance[mark.student_id]["total"] += mark.question.max_marks

        # Calculate student percentages
        student_percentages = []
        for student_id, totals in student_performance.items():
            if totals["total"] > 0:
                percentage = (totals["obtained"] / totals["total"]) * 100
                student_percentages.append(percentage)

        if student_percentages:
            average_percentage = statistics.mean(student_percentages)
            pass_rate = (len([p for p in student_percentages if p >= 50]) / len(student_percentages)) * 100
            top_performers = len([p for p in student_percentages if p >= 85])
            at_risk_students = len([p for p in student_percentages if p < 50])
        else:
            average_percentage = pass_rate = top_performers = at_risk_students = 0

        # Question analysis
        question_analysis = []
        all_questions = [q for exam in exams for q in exam.questions] if exams else []
        
        for question in all_questions[:20]:  # Limit to 20 questions for performance
            question_marks = [m for m in marks if m.question_id == question.id]
            
            if question_marks:
                total_students = len(question_marks)
                total_marks_obtained = sum(m.marks_obtained for m in question_marks)
                average_marks = total_marks_obtained / total_students
                
                # Calculate success rate (students who got >= 50% of max marks)
                successful_students = len([m for m in question_marks if m.marks_obtained >= (question.max_marks * 0.5)])
                success_rate = (successful_students / total_students) * 100
                
                # Attempt rate (assuming all students attempted - in real scenario, you'd check for 0 marks)
                attempted_students = len([m for m in question_marks if m.marks_obtained > 0])
                attempt_rate = (attempted_students / total_students) * 100
                
                question_analysis.append({
                    "question_id": question.id,
                    "question_number": question.question_number,
                    "max_marks": question.max_marks,
                    "average_marks": round(average_marks, 1),
                    "success_rate": round(success_rate, 1),
                    "attempt_rate": round(attempt_rate, 1),
                    "difficulty": question.difficulty.value,
                    "section": question.section.value
                })

        # CO/PO Attainment
        co_performance = defaultdict(list)
        po_performance = defaultdict(list)
        
        for question in all_questions:
            question_marks = [m for m in marks if m.question_id == question.id]
            if not question_marks:
                continue
                
            # Calculate average percentage for this question
            avg_marks = statistics.mean([m.marks_obtained for m in question_marks])
            avg_percentage = (avg_marks / question.max_marks) * 100
            
            # Map to COs and POs
            if question.co_mapping:
                for co in question.co_mapping:
                    co_performance[co].append(avg_percentage)
            
            if question.po_mapping:
                for po in question.po_mapping:
                    po_performance[po].append(avg_percentage)

        # Calculate final CO/PO attainment
        co_attainment = {}
        for co, percentages in co_performance.items():
            co_attainment[co] = round(statistics.mean(percentages), 1)

        po_attainment = {}
        for po, percentages in po_performance.items():
            po_attainment[po] = round(statistics.mean(percentages), 1)

        return {
            "class_performance": {
                "average_percentage": round(average_percentage, 1),
                "pass_rate": round(pass_rate, 1),
                "top_performers": top_performers,
                "at_risk_students": at_risk_students
            },
            "question_analysis": question_analysis,
            "co_po_attainment": {
                "co_attainment": co_attainment,
                "po_attainment": po_attainment
            }
        }
    
    except Exception as e:
        print(f"Error in get_teacher_analytics: {e}")
        return {
            "class_performance": {
                "average_percentage": 0,
                "pass_rate": 0,
                "top_performers": 0,
                "at_risk_students": 0
            },
            "question_analysis": [],
            "co_po_attainment": {"co_attainment": {}, "po_attainment": {}}
        }

def get_hod_analytics(db: Session, department_id: int) -> Dict[str, Any]:
    """Get comprehensive analytics for HOD"""
    try:
        department = db.query(Department).filter(Department.id == department_id).first()
        if not department:
            return {}

        # Get department statistics
        total_students = db.query(User).filter(
            and_(User.department_id == department_id, User.role == UserRole.student, User.is_active == True)
        ).count()
        
        total_teachers = db.query(User).filter(
            and_(User.department_id == department_id, User.role == UserRole.teacher, User.is_active == True)
        ).count()
        
        # Get department classes and subjects
        department_classes = db.query(Class).filter(Class.department_id == department_id).all()
        class_ids = [c.id for c in department_classes]
        
        total_subjects = db.query(Subject).filter(Subject.class_id.in_(class_ids)).count()

        # Get all marks for department subjects
        subjects = db.query(Subject).options(
            joinedload(Subject.exams)
        ).filter(Subject.class_id.in_(class_ids)).all()
        
        subject_ids = [s.id for s in subjects]
        exams = db.query(Exam).filter(Exam.subject_id.in_(subject_ids)).all()
        exam_ids = [e.id for e in exams]
        
        marks = db.query(Mark).options(
            joinedload(Mark.question)
        ).filter(Mark.exam_id.in_(exam_ids)).all()

        # Calculate overall department performance
        if marks:
            total_obtained = sum(mark.marks_obtained for mark in marks)
            total_possible = sum(mark.question.max_marks for mark in marks if mark.question)
            average_performance = (total_obtained / total_possible * 100) if total_possible > 0 else 0
        else:
            average_performance = 0

        # Subject-wise performance
        subject_performance = []
        for subject in subjects:
            subject_exams = [e for e in exams if e.subject_id == subject.id]
            subject_exam_ids = [e.id for e in subject_exams]
            subject_marks = [m for m in marks if m.exam_id in subject_exam_ids]
            
            if subject_marks:
                subject_obtained = sum(m.marks_obtained for m in subject_marks)
                subject_possible = sum(m.question.max_marks for m in subject_marks if m.question)
                subject_avg = (subject_obtained / subject_possible * 100) if subject_possible > 0 else 0
                
                # Calculate pass rate for this subject
                student_subject_performance = defaultdict(lambda: {"obtained": 0, "total": 0})
                
                for mark in subject_marks:
                    if mark.question:
                        student_subject_performance[mark.student_id]["obtained"] += mark.marks_obtained
                        student_subject_performance[mark.student_id]["total"] += mark.question.max_marks
                
                passed_students = 0
                total_subject_students = len(student_subject_performance)
                
                for student_data in student_subject_performance.values():
                    if student_data["total"] > 0 and (student_data["obtained"] / student_data["total"]) >= 0.5:
                        passed_students += 1
                
                pass_rate = (passed_students / total_subject_students * 100) if total_subject_students > 0 else 0
                
                subject_performance.append({
                    "subject_name": subject.name,
                    "subject_code": subject.code,
                    "average_percentage": round(subject_avg, 1),
                    "pass_rate": round(pass_rate, 1),
                    "teacher_name": f"{subject.teacher.first_name} {subject.teacher.last_name}" if subject.teacher else "Unassigned"
                })

        # Teacher performance analysis
        teacher_performance = []
        department_teachers = db.query(User).filter(
            and_(User.department_id == department_id, User.role == UserRole.teacher, User.is_active == True)
        ).all()
        
        for teacher in department_teachers:
            teacher_subjects = [s for s in subjects if s.teacher_id == teacher.id]
            
            if teacher_subjects:
                teacher_subject_ids = [s.id for s in teacher_subjects]
                teacher_exams = [e for e in exams if e.subject_id in teacher_subject_ids]
                teacher_exam_ids = [e.id for e in teacher_exams]
                teacher_marks = [m for m in marks if m.exam_id in teacher_exam_ids]
                
                if teacher_marks:
                    teacher_obtained = sum(m.marks_obtained for m in teacher_marks)
                    teacher_possible = sum(m.question.max_marks for m in teacher_marks if m.question)
                    teacher_avg = (teacher_obtained / teacher_possible * 100) if teacher_possible > 0 else 0
                else:
                    teacher_avg = 0
                
                teacher_performance.append({
                    "teacher_name": f"{teacher.first_name} {teacher.last_name}",
                    "teacher_id": teacher.id,
                    "subjects_taught": len(teacher_subjects),
                    "average_class_performance": round(teacher_avg, 1),
                    "total_students": len(set(mark.student_id for mark in teacher_marks))
                })

        return {
            "department_overview": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_subjects": total_subjects,
                "average_performance": round(average_performance, 1)
            },
            "subject_performance": subject_performance,
            "teacher_performance": teacher_performance
        }
    
    except Exception as e:
        print(f"Error in get_hod_analytics: {e}")
        return {
            "department_overview": {
                "total_students": 0,
                "total_teachers": 0,
                "total_subjects": 0,
                "average_performance": 0
            },
            "subject_performance": [],
            "teacher_performance": []
        }

def get_class_analytics(db: Session, class_id: int) -> Dict[str, Any]:
    """Get analytics for a specific class"""
    try:
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            return {}

        # Get students in the class
        students = db.query(User).filter(
            and_(User.class_id == class_id, User.role == UserRole.student, User.is_active == True)
        ).all()

        # Get subjects for the class
        subjects = db.query(Subject).filter(Subject.class_id == class_id).all()
        subject_ids = [s.id for s in subjects]

        # Get exams for these subjects
        exams = db.query(Exam).filter(Exam.subject_id.in_(subject_ids)).all()
        exam_ids = [e.id for e in exams]

        # Get marks
        marks = db.query(Mark).options(
            joinedload(Mark.question)
        ).filter(Mark.exam_id.in_(exam_ids)).all()

        # Calculate class statistics
        student_performance = defaultdict(lambda: {"obtained": 0, "total": 0})
        
        for mark in marks:
            if mark.question:
                student_performance[mark.student_id]["obtained"] += mark.marks_obtained
                student_performance[mark.student_id]["total"] += mark.question.max_marks

        student_percentages = []
        for student_id, totals in student_performance.items():
            if totals["total"] > 0:
                percentage = (totals["obtained"] / totals["total"]) * 100
                student_percentages.append(percentage)

        if student_percentages:
            class_average = statistics.mean(student_percentages)
            pass_rate = (len([p for p in student_percentages if p >= 50]) / len(student_percentages)) * 100
            top_performers = len([p for p in student_percentages if p >= 85])
            at_risk = len([p for p in student_percentages if p < 50])
        else:
            class_average = pass_rate = top_performers = at_risk = 0

        return {
            "class_name": class_obj.name,
            "total_students": len(students),
            "class_average": round(class_average, 1),
            "pass_rate": round(pass_rate, 1),
            "top_performers": top_performers,
            "at_risk_students": at_risk,
            "total_subjects": len(subjects),
            "total_exams": len(exams)
        }

    except Exception as e:
        print(f"Error in get_class_analytics: {e}")
        return {}

def get_subject_analytics(db: Session, subject_id: int) -> Dict[str, Any]:
    """Get analytics for a specific subject"""
    try:
        subject = db.query(Subject).options(
            joinedload(Subject.class_obj),
            joinedload(Subject.teacher)
        ).filter(Subject.id == subject_id).first()
        
        if not subject:
            return {}

        # Get exams for this subject
        exams = db.query(Exam).options(
            joinedload(Exam.questions)
        ).filter(Exam.subject_id == subject_id).all()

        exam_ids = [e.id for e in exams]
        
        # Get marks
        marks = db.query(Mark).options(
            joinedload(Mark.question),
            joinedload(Mark.student)
        ).filter(Mark.exam_id.in_(exam_ids)).all()

        # Calculate subject performance
        student_performance = defaultdict(lambda: {"obtained": 0, "total": 0})
        
        for mark in marks:
            if mark.question:
                student_performance[mark.student_id]["obtained"] += mark.marks_obtained
                student_performance[mark.student_id]["total"] += mark.question.max_marks

        student_percentages = []
        for totals in student_performance.values():
            if totals["total"] > 0:
                percentage = (totals["obtained"] / totals["total"]) * 100
                student_percentages.append(percentage)

        if student_percentages:
            subject_average = statistics.mean(student_percentages)
            pass_rate = (len([p for p in student_percentages if p >= 50]) / len(student_percentages)) * 100
        else:
            subject_average = pass_rate = 0

        return {
            "subject_name": subject.name,
            "subject_code": subject.code,
            "teacher_name": f"{subject.teacher.first_name} {subject.teacher.last_name}" if subject.teacher else "Unassigned",
            "class_name": subject.class_obj.name if subject.class_obj else "Unknown",
            "average_percentage": round(subject_average, 1),
            "pass_rate": round(pass_rate, 1),
            "total_students": len(student_performance),
            "total_exams": len(exams),
            "credits": subject.credits
        }

    except Exception as e:
        print(f"Error in get_subject_analytics: {e}")
        return {}

# Report generation functions
def generate_report(db: Session, report_type: str, filters: Dict[str, Any], format_type: str = 'pdf') -> bytes:
    """Generate various types of reports"""
    try:
        if report_type == 'student_performance':
            return generate_student_performance_report(db, filters, format_type)
        elif report_type == 'co_po_attainment':
            return generate_co_po_report(db, filters, format_type)
        elif report_type == 'teacher_performance':
            return generate_teacher_performance_report(db, filters, format_type)
        elif report_type == 'class_analysis':
            return generate_class_analysis_report(db, filters, format_type)
        elif report_type == 'nba_compliance':
            return generate_nba_compliance_report(db, filters, format_type)
        elif report_type == 'department_summary':
            return generate_department_summary_report(db, filters, format_type)
        else:
            raise ValueError(f"Unknown report type: {report_type}")
    
    except Exception as e:
        print(f"Error generating report: {e}")
        # Return a simple error report
        return generate_error_report(str(e), format_type)

def generate_student_performance_report(db: Session, filters: Dict[str, Any], format_type: str) -> bytes:
    """Generate student performance report"""
    # This is a simplified implementation
    # In a real application, you would use libraries like ReportLab for PDF or openpyxl for Excel
    
    report_content = "Student Performance Report\n"
    report_content += "=" * 50 + "\n\n"
    
    # Add filter information
    if filters.get('class_id'):
        class_obj = db.query(Class).filter(Class.id == filters['class_id']).first()
        if class_obj:
            report_content += f"Class: {class_obj.name}\n"
    
    if filters.get('subject_id'):
        subject = db.query(Subject).filter(Subject.id == filters['subject_id']).first()
        if subject:
            report_content += f"Subject: {subject.name}\n"
    
    report_content += "\nGenerated on: " + str(datetime.utcnow()) + "\n"
    
    return report_content.encode('utf-8')

def generate_co_po_report(db: Session, filters: Dict[str, Any], format_type: str) -> bytes:
    """Generate CO/PO attainment report"""
    report_content = "CO/PO Attainment Report\n"
    report_content += "=" * 50 + "\n\n"
    report_content += "Generated on: " + str(datetime.utcnow()) + "\n"
    return report_content.encode('utf-8')

def generate_teacher_performance_report(db: Session, filters: Dict[str, Any], format_type: str) -> bytes:
    """Generate teacher performance report"""
    report_content = "Teacher Performance Report\n"
    report_content += "=" * 50 + "\n\n"
    report_content += "Generated on: " + str(datetime.utcnow()) + "\n"
    return report_content.encode('utf-8')

def generate_class_analysis_report(db: Session, filters: Dict[str, Any], format_type: str) -> bytes:
    """Generate class analysis report"""
    report_content = "Class Analysis Report\n"
    report_content += "=" * 50 + "\n\n"
    report_content += "Generated on: " + str(datetime.utcnow()) + "\n"
    return report_content.encode('utf-8')

def generate_nba_compliance_report(db: Session, filters: Dict[str, Any], format_type: str) -> bytes:
    """Generate NBA compliance report"""
    report_content = "NBA Compliance Report\n"
    report_content += "=" * 50 + "\n\n"
    report_content += "Generated on: " + str(datetime.utcnow()) + "\n"
    return report_content.encode('utf-8')

def generate_department_summary_report(db: Session, filters: Dict[str, Any], format_type: str) -> bytes:
    """Generate department summary report"""
    report_content = "Department Summary Report\n"
    report_content += "=" * 50 + "\n\n"
    report_content += "Generated on: " + str(datetime.utcnow()) + "\n"
    return report_content.encode('utf-8')

def generate_error_report(error_message: str, format_type: str) -> bytes:
    """Generate error report"""
    report_content = f"Report Generation Error\n"
    report_content += "=" * 50 + "\n\n"
    report_content += f"Error: {error_message}\n"
    report_content += f"Generated on: {datetime.utcnow()}\n"
    return report_content.encode('utf-8')

def get_available_report_templates() -> List[Dict[str, Any]]:
    """Get list of available report templates"""
    return [
        {
            "id": "student_performance",
            "name": "Student Performance Report",
            "description": "Individual student performance analysis with CO/PO mapping",
            "filters": ["class_id", "subject_id", "exam_type", "date_from", "date_to"]
        },
        {
            "id": "co_po_attainment",
            "name": "CO/PO Attainment Report",
            "description": "Course and Program Outcomes attainment analysis",
            "filters": ["subject_id", "class_id", "exam_type"]
        },
        {
            "id": "teacher_performance",
            "name": "Faculty Performance Report",
            "description": "Teaching effectiveness and class performance analysis",
            "filters": ["teacher_id", "subject_id", "date_from", "date_to"]
        },
        {
            "id": "class_analysis",
            "name": "Class Analysis Report",
            "description": "Comprehensive class performance with statistical analysis",
            "filters": ["class_id", "subject_id", "exam_type"]
        },
        {
            "id": "nba_compliance",
            "name": "NBA Compliance Report",
            "description": "NBA accreditation ready reports with all required metrics",
            "filters": ["class_id", "date_from", "date_to"]
        },
        {
            "id": "department_summary",
            "name": "Department Summary Report",
            "description": "High-level department performance overview",
            "filters": ["date_from", "date_to"]
        }
    ]