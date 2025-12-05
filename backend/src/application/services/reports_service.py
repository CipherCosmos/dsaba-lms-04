"""
Reports Service
Business logic for report generation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from src.domain.exceptions import EntityNotFoundError, ValidationError
from src.application.services.analytics.analytics_service import AnalyticsService
from src.infrastructure.cache.redis_client import CacheService
from src.shared.constants import CACHE_KEYS


class ReportsService:
    """
    Reports service
    
    Coordinates report generation operations
    """
    
    def __init__(
        self,
        db: Session,
        analytics_service: AnalyticsService,
        cache_service: Optional[CacheService] = None
    ):
        self.db = db
        self.analytics_service = analytics_service
        self.cache_service = cache_service
    
    async def generate_student_performance_report(
        self,
        student_id: int,
        subject_id: Optional[int] = None,
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate student performance report
        
        Args:
            student_id: Student ID
            subject_id: Optional subject filter
            format_type: Report format (json, pdf, excel)
        
        Returns:
            Report data
        """
        # Check cache first
        if self.cache_service and self.cache_service.is_enabled:
            cache_key = self.cache_service.get_cache_key(
                CACHE_KEYS["report"],
                report_type="student_performance",
                student_id=student_id,
                subject_id=subject_id,
                format=format_type
            )
            cached = await self.cache_service.get(cache_key)
            if cached:
                return cached
        
        # Get analytics
        analytics = await self.analytics_service.get_student_analytics(
            student_id=student_id,
            subject_id=subject_id
        )
        
        # Add report metadata
        report = {
            "report_type": "student_performance",
            "generated_at": datetime.utcnow().isoformat(),
            "format": format_type,
            "student_id": student_id,
            "subject_id": subject_id,
            "data": analytics
        }
        
        # Cache result
        if self.cache_service and self.cache_service.is_enabled:
            cache_key = self.cache_service.get_cache_key(
                CACHE_KEYS["report"],
                report_type="student_performance",
                student_id=student_id,
                subject_id=subject_id,
                format=format_type
            )
            await self.cache_service.set(cache_key, report, ttl=3600)  # 1 hour
        
        return report
    
    async def generate_class_analysis_report(
        self,
        class_id: int,
        subject_id: Optional[int] = None,
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate class analysis report
        
        Args:
            class_id: Class ID
            subject_id: Optional subject filter
            format_type: Report format
        
        Returns:
            Report data
        """
        # Get analytics
        analytics = await self.analytics_service.get_class_analytics(
            class_id=class_id,
            subject_id=subject_id
        )
        
        report = {
            "report_type": "class_analysis",
            "generated_at": datetime.utcnow().isoformat(),
            "format": format_type,
            "class_id": class_id,
            "subject_id": subject_id,
            "data": analytics
        }
        
        # Cache result
        if self.cache_service and self.cache_service.is_enabled:
            cache_key = self.cache_service.get_cache_key(
                CACHE_KEYS["report"],
                report_type="class_analysis",
                class_id=class_id,
                subject_id=subject_id,
                format=format_type
            )
            await self.cache_service.set(cache_key, report, ttl=3600)
        
        return report
    
    async def generate_co_po_attainment_report(
        self,
        subject_id: int,
        exam_type: Optional[str] = None,
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate CO/PO attainment report
        
        Args:
            subject_id: Subject ID
            exam_type: Optional exam type filter
            format_type: Report format
        
        Returns:
            Report data
        """
        # Get CO attainment
        co_attainment = await self.analytics_service.calculate_co_attainment(
            subject_id=subject_id,
            exam_type=exam_type
        )
        
        report = {
            "report_type": "co_po_attainment",
            "generated_at": datetime.utcnow().isoformat(),
            "format": format_type,
            "subject_id": subject_id,
            "exam_type": exam_type,
            "data": co_attainment
        }
        
        # Cache result
        if self.cache_service and self.cache_service.is_enabled:
            cache_key = self.cache_service.get_cache_key(
                CACHE_KEYS["report"],
                report_type="co_po_attainment",
                subject_id=subject_id,
                exam_type=exam_type,
                format=format_type
            )
            await self.cache_service.set(cache_key, report, ttl=3600)
        
        return report
    
    async def generate_teacher_performance_report(
        self,
        teacher_id: int,
        subject_id: Optional[int] = None,
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate teacher performance report
        
        Args:
            teacher_id: Teacher ID
            subject_id: Optional subject filter
            format_type: Report format
        
        Returns:
            Report data
        """
        # Get analytics
        analytics = await self.analytics_service.get_teacher_analytics(
            teacher_id=teacher_id,
            subject_id=subject_id
        )
        
        report = {
            "report_type": "teacher_performance",
            "generated_at": datetime.utcnow().isoformat(),
            "format": format_type,
            "teacher_id": teacher_id,
            "subject_id": subject_id,
            "data": analytics
        }
        
        return report
    
    async def generate_department_summary_report(
        self,
        department_id: int,
        format_type: str = "json"
    ) -> Dict[str, Any]:
        """
        Generate department summary report
        
        Args:
            department_id: Department ID
            format_type: Report format
        
        Returns:
            Report data
        """
        # Get HOD analytics
        analytics = await self.analytics_service.get_hod_analytics(
            department_id=department_id
        )
        
        report = {
            "report_type": "department_summary",
            "generated_at": datetime.utcnow().isoformat(),
            "format": format_type,
            "department_id": department_id,
            "data": analytics
        }
        
        return report
    
    async def get_available_report_types(self) -> List[Dict[str, Any]]:
        """
        Get list of available report types
        
        Returns:
            List of report type definitions
        """
        return [
            {
                "id": "student_performance",
                "name": "Student Performance Report",
                "description": "Individual student performance analysis with CO/PO mapping",
                "filters": ["student_id", "subject_id", "exam_type", "date_from", "date_to"]
            },
            {
                "id": "class_analysis",
                "name": "Class Analysis Report",
                "description": "Comprehensive class performance with statistical analysis",
                "filters": ["class_id", "subject_id", "exam_type"]
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
                "id": "department_summary",
                "name": "Department Summary Report",
                "description": "High-level department performance overview",
                "filters": ["department_id", "date_from", "date_to"]
            },
            {
                "id": "nba_compliance",
                "name": "NBA Compliance Report",
                "description": "NBA accreditation ready reports with all required metrics",
                "filters": ["department_id", "class_id", "date_from", "date_to"]
            }
        ]

