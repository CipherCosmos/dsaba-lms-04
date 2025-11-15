"""
Dashboard API Endpoints
System dashboard and statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import datetime

from src.api.dependencies import get_db, get_current_user
from src.domain.entities.user import User
from src.domain.enums.user_role import UserRole
from src.infrastructure.database.models import (
    UserModel, DepartmentModel, ClassModel, SubjectModel, 
    ExamModel, MarkModel, FinalMarkModel, UserRoleModel, RoleModel,
    SubjectAssignmentModel, StudentModel, TeacherModel
)
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get(
    "/stats",
    summary="Get Dashboard Statistics",
    description="Returns role-based dashboard statistics. Different roles see different statistics."
)
async def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get dashboard statistics based on user role
    
    Returns:
        Dictionary with role-specific statistics
    """
    try:
        # Get user's primary role
        primary_role = current_user.roles[0] if current_user.roles else None
        
        if primary_role == UserRole.ADMIN:
            return await _get_admin_dashboard_stats(db)
        elif primary_role == UserRole.HOD:
            # Get department_id from user's roles
            dept_id = current_user.department_ids[0] if current_user.department_ids else None
            if not dept_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="HOD user must be associated with a department"
                )
            return await _get_hod_dashboard_stats(db, dept_id)
        elif primary_role == UserRole.TEACHER:
            return await _get_teacher_dashboard_stats(db, current_user.id)
        elif primary_role == UserRole.STUDENT:
            # Get student profile
            student = db.query(StudentModel).filter(StudentModel.user_id == current_user.id).first()
            if not student:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Student profile not found"
                )
            return await _get_student_dashboard_stats(db, student.id)
        else:
            # Default: return basic stats
            return await _get_admin_dashboard_stats(db)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard statistics: {str(e)}"
        )


async def _get_admin_dashboard_stats(db: Session) -> Dict[str, Any]:
    """Get admin dashboard statistics"""
    total_departments = db.query(DepartmentModel).count()
    total_users = db.query(UserModel).count()
    total_classes = db.query(ClassModel).count()
    total_subjects = db.query(SubjectModel).count()
    active_users = db.query(UserModel).filter(UserModel.is_active == True).count()
    total_exams = db.query(ExamModel).count()
    
    # Get role-based counts
    student_role = db.query(RoleModel).filter(RoleModel.name == UserRole.STUDENT.value).first()
    teacher_role = db.query(RoleModel).filter(RoleModel.name == UserRole.TEACHER.value).first()
    hod_role = db.query(RoleModel).filter(RoleModel.name == UserRole.HOD.value).first()
    
    student_count = db.query(UserRoleModel).filter(
        UserRoleModel.role_id == student_role.id
    ).count() if student_role else 0
    
    teacher_count = db.query(UserRoleModel).filter(
        UserRoleModel.role_id == teacher_role.id
    ).count() if teacher_role else 0
    
    hod_count = db.query(UserRoleModel).filter(
        UserRoleModel.role_id == hod_role.id
    ).count() if hod_role else 0
    
    # Get recent exams
    recent_exams_count = db.query(ExamModel).filter(
        ExamModel.created_at >= datetime.utcnow() - timedelta(days=30)
    ).count()
    
    # Get recent activity
    recent_activity = _get_recent_activity(db)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "role": "admin",
        "statistics": {
            "total_departments": total_departments,
            "total_users": total_users,
            "total_classes": total_classes,
            "total_subjects": total_subjects,
            "total_exams": total_exams,
            "active_users": active_users,
            "recent_exams_30d": recent_exams_count,
            "by_role": {
                "students": student_count,
                "teachers": teacher_count,
                "hods": hod_count
            }
        },
        "recent_activity": recent_activity
    }


async def _get_hod_dashboard_stats(db: Session, department_id: int) -> Dict[str, Any]:
    """Get HOD dashboard statistics"""
    # Get users in department
    dept_users = db.query(UserModel).join(UserRoleModel).filter(
        UserRoleModel.department_id == department_id
    )
    
    student_role = db.query(RoleModel).filter(RoleModel.name == UserRole.STUDENT.value).first()
    teacher_role = db.query(RoleModel).filter(RoleModel.name == UserRole.TEACHER.value).first()
    
    total_students = db.query(UserRoleModel).join(RoleModel).filter(
        and_(
            UserRoleModel.department_id == department_id,
            RoleModel.name == UserRole.STUDENT.value
        )
    ).count() if student_role else 0
    
    total_teachers = db.query(UserRoleModel).join(RoleModel).filter(
        and_(
            UserRoleModel.department_id == department_id,
            RoleModel.name == UserRole.TEACHER.value
        )
    ).count() if teacher_role else 0
    
    dept_classes = db.query(ClassModel).filter(ClassModel.department_id == department_id).count()
    
    # Get subjects through subject assignments
    dept_subjects = db.query(SubjectModel).filter(
        SubjectModel.department_id == department_id
    ).count()
    
    # Get department exams
    dept_exams = db.query(ExamModel).join(SubjectAssignmentModel).join(SubjectModel).filter(
        SubjectModel.department_id == department_id
    ).distinct().count()
    
    # Get recent exams (last 30 days)
    recent_exams = db.query(ExamModel).join(SubjectAssignmentModel).join(SubjectModel).filter(
        and_(
            SubjectModel.department_id == department_id,
            ExamModel.created_at >= datetime.utcnow() - timedelta(days=30)
        )
    ).distinct().count()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "role": "hod",
        "department_id": department_id,
        "statistics": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_classes": dept_classes,
            "total_subjects": dept_subjects,
            "total_exams": dept_exams,
            "recent_exams_30d": recent_exams
        }
    }


async def _get_teacher_dashboard_stats(db: Session, teacher_id: int) -> Dict[str, Any]:
    """Get teacher dashboard statistics"""
    # Get teacher profile
    teacher = db.query(TeacherModel).filter(TeacherModel.user_id == teacher_id).first()
    if not teacher:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "role": "teacher",
            "teacher_id": teacher_id,
            "statistics": {}
        }
    
    # Get subjects assigned to teacher
    teacher_subjects = db.query(SubjectAssignmentModel).filter(
        SubjectAssignmentModel.teacher_id == teacher.id
    ).count()
    
    # Get exams for teacher's subjects
    teacher_exams = db.query(ExamModel).join(SubjectAssignmentModel).filter(
        SubjectAssignmentModel.teacher_id == teacher.id
    ).count()
    
    # Get recent exams (last 30 days)
    recent_exams = db.query(ExamModel).join(SubjectAssignmentModel).filter(
        and_(
            SubjectAssignmentModel.teacher_id == teacher.id,
            ExamModel.created_at >= datetime.utcnow() - timedelta(days=30)
        )
    ).count()
    
    # Get students in classes where teacher teaches
    class_ids = db.query(SubjectAssignmentModel.class_id).filter(
        SubjectAssignmentModel.teacher_id == teacher.id
    ).distinct().subquery()
    
    total_students = db.query(StudentModel).filter(
        StudentModel.class_id.in_(db.query(class_ids))
    ).count()
    
    # Get pending marks (exams without marks entered)
    pending_marks_count = db.query(ExamModel).join(SubjectAssignmentModel).filter(
        SubjectAssignmentModel.teacher_id == teacher.id
    ).outerjoin(MarkModel).filter(MarkModel.id == None).count()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "role": "teacher",
        "teacher_id": teacher_id,
        "statistics": {
            "subjects_assigned": teacher_subjects,
            "exams_configured": teacher_exams,
            "recent_exams_30d": recent_exams,
            "total_students": total_students,
            "pending_marks_entry": pending_marks_count
        }
    }


async def _get_student_dashboard_stats(db: Session, student_id: int) -> Dict[str, Any]:
    """Get student dashboard statistics"""
    student = db.query(StudentModel).filter(StudentModel.id == student_id).first()
    if not student:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "role": "student",
            "student_id": student_id,
            "statistics": {}
        }
    
    # Get student's marks
    student_marks = db.query(MarkModel).filter(MarkModel.student_id == student_id).all()
    total_exams = len(set(mark.exam_id for mark in student_marks))
    
    # Get class subjects
    class_subjects = db.query(SubjectAssignmentModel).filter(
        SubjectAssignmentModel.class_id == student.class_id
    ).count() if student.class_id else 0
    
    # Get upcoming exams (exams in student's class that haven't been taken yet)
    if student.class_id:
        class_exam_ids = db.query(ExamModel.id).join(SubjectAssignmentModel).filter(
            SubjectAssignmentModel.class_id == student.class_id
        ).subquery()
        taken_exam_ids = db.query(MarkModel.exam_id).filter(
            MarkModel.student_id == student_id
        ).distinct().subquery()
        upcoming_exams = db.query(ExamModel).filter(
            ExamModel.id.in_(db.query(class_exam_ids)),
            ~ExamModel.id.in_(db.query(taken_exam_ids))
        ).count()
    else:
        upcoming_exams = 0
    
    # Get final marks count
    final_marks_count = db.query(FinalMarkModel).filter(
        FinalMarkModel.student_id == student_id
    ).count()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "role": "student",
        "student_id": student_id,
        "statistics": {
            "total_exams_taken": total_exams,
            "upcoming_exams": upcoming_exams,
            "total_subjects": class_subjects,
            "final_marks_available": final_marks_count,
            "class_id": student.class_id
        }
    }


def _get_recent_activity(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """Get recent system activity"""
    activities = []
    
    # Recent users
    recent_users = db.query(UserModel).order_by(desc(UserModel.created_at)).limit(limit).all()
    for user in recent_users[:5]:
        # Get user roles
        roles = db.query(RoleModel).join(UserRoleModel).filter(
            UserRoleModel.user_id == user.id
        ).all()
        role_names = [r.name for r in roles]
        role_str = role_names[0] if role_names else "user"
        
        activities.append({
            "type": "user_created",
            "message": f"New {role_str} user '{user.first_name} {user.last_name}' registered",
            "timestamp": user.created_at.isoformat() if user.created_at else None
        })
    
    # Recent exams
    recent_exams = db.query(ExamModel).order_by(desc(ExamModel.created_at)).limit(limit).all()
    for exam in recent_exams[:5]:
        activities.append({
            "type": "exam_created",
            "message": f"New exam '{exam.name}' created",
            "timestamp": exam.created_at.isoformat() if exam.created_at else None
        })
    
    # Sort by timestamp descending
    activities.sort(key=lambda x: x.get("timestamp") or "", reverse=True)
    
    return activities[:limit]

