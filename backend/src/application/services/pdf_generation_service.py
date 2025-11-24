"""
PDF Generation Service
Business logic for generating PDFs (question papers, report cards, reports)
"""

from typing import Dict, Any, Optional, List
from io import BytesIO
from datetime import datetime
from decimal import Decimal

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from src.domain.repositories.exam_repository import IExamRepository
from src.domain.repositories.question_repository import IQuestionRepository
from src.domain.repositories.final_mark_repository import IFinalMarkRepository
from src.domain.exceptions import EntityNotFoundError


class PDFGenerationService:
    """
    PDF generation service
    
    Handles PDF generation for various documents
    """
    
    def __init__(
        self,
        exam_repository: IExamRepository,
        question_repository: IQuestionRepository,
        final_mark_repository: IFinalMarkRepository
    ):
        self.exam_repository = exam_repository
        self.question_repository = question_repository
        self.final_mark_repository = final_mark_repository
    
    async def generate_question_paper_pdf(
        self,
        exam_id: int
    ) -> bytes:
        """
        Generate question paper PDF
        
        Args:
            exam_id: Exam ID
        
        Returns:
            PDF bytes
        
        Raises:
            EntityNotFoundError: If exam doesn't exist
        """
        # Get exam
        exam = await self.exam_repository.get_by_id(exam_id)
        if not exam:
            raise EntityNotFoundError("Exam", exam_id)
        
        # Get questions
        questions = await self.question_repository.get_by_exam(exam_id)
        
        # Group questions by section
        questions_by_section = {}
        for q in questions:
            if q.section not in questions_by_section:
                questions_by_section[q.section] = []
            questions_by_section[q.section].append(q)
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Header
        story.append(Paragraph(f"<b>{exam.name}</b>", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Exam details with proper date formatting
        from datetime import datetime, timezone
        
        exam_date_str = "Not Scheduled"
        if exam.exam_date:
            # Handle timezone consistency - convert to UTC and format
            exam_datetime = datetime.combine(exam.exam_date, datetime.min.time())
            exam_date_str = exam_datetime.strftime('%B %d, %Y (%Z)')
        
        exam_details = [
            f"<b>Exam Type:</b> {exam.exam_type.upper()}",
            f"<b>Date:</b> {exam_date_str}",
            f"<b>Duration:</b> {exam.duration_minutes} minutes" if exam.duration_minutes else "",
            f"<b>Total Marks:</b> {exam.total_marks}"
        ]
        
        for detail in exam_details:
            if detail:
                story.append(Paragraph(detail, styles['Normal']))
        
        story.append(Spacer(1, 0.3*inch))
        
        # Instructions
        if exam.instructions:
            story.append(Paragraph("<b>Instructions:</b>", styles['Heading2']))
            story.append(Paragraph(exam.instructions, styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Questions by section
        for section in ['A', 'B', 'C']:
            if section not in questions_by_section:
                continue
            
            section_questions = questions_by_section[section]
            story.append(Paragraph(f"<b>Section {section}</b>", styles['Heading2']))
            story.append(Spacer(1, 0.1*inch))
            
            for q in section_questions:
                question_text = f"<b>Q{q.question_no}.</b> {q.question_text} [{q.marks_per_question} marks]"
                story.append(Paragraph(question_text, styles['Normal']))
                story.append(Spacer(1, 0.1*inch))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return buffer.getvalue()
    
    async def generate_student_report_card_pdf(
        self,
        student_id: int,
        semester_id: int
    ) -> bytes:
        """
        Generate student report card PDF
        
        Args:
            student_id: Student ID
            semester_id: Semester ID
        
        Returns:
            PDF bytes
        
        Raises:
            EntityNotFoundError: If student or marks don't exist
        """
        # Get final marks
        final_marks = await self.final_mark_repository.get_by_student_semester(
            student_id=student_id,
            semester_id=semester_id
        )
        
        if not final_marks:
            raise EntityNotFoundError(
                "FinalMarks",
                f"student_id={student_id}, semester_id={semester_id}"
            )
        
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Header
        story.append(Paragraph("<b>STUDENT REPORT CARD</b>", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        # Student info (would need to fetch from student repository)
        story.append(Paragraph(f"<b>Student ID:</b> {student_id}", styles['Normal']))
        story.append(Paragraph(f"<b>Semester:</b> {semester_id}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # Marks table
        table_data = [['Subject', 'Internal', 'External', 'Total', 'Percentage', 'Grade', 'SGPA']]
        
        total_credits = 0
        total_grade_points = 0
        
        for fm in final_marks:
            # Calculate grade points (simplified - would need credits)
            grade_points = {
                "A+": 10.0, "A": 9.0, "B+": 8.0, "B": 7.0, "C": 6.0, "D": 5.0, "F": 0.0
            }.get(fm.grade, 0.0)
            
            credits = 3.0  # Would fetch from subject
            total_credits += credits
            total_grade_points += grade_points * credits
            
            table_data.append([
                f"Subject {fm.subject_assignment_id}",  # Would fetch subject name
                str(fm.best_internal),
                str(fm.external),
                str(fm.total),
                f"{fm.percentage:.2f}%",
                fm.grade,
                f"{fm.sgpa:.2f}" if fm.sgpa else "-"
            ])
        
        # Calculate SGPA
        sgpa = total_grade_points / total_credits if total_credits > 0 else 0.0
        
        # Create table
        table = Table(table_data, colWidths=[2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 1*inch, 0.6*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        story.append(Spacer(1, 0.3*inch))
        
        # Summary
        story.append(Paragraph(f"<b>Semester GPA (SGPA):</b> {sgpa:.2f}", styles['Heading2']))
        if final_marks[0].cgpa:
            story.append(Paragraph(f"<b>Cumulative GPA (CGPA):</b> {final_marks[0].cgpa:.2f}", styles['Heading2']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return buffer.getvalue()
    
    async def generate_co_po_report_pdf(
        self,
        subject_id: int,
        co_attainment_data: Dict[str, Any]
    ) -> bytes:
        """
        Generate CO-PO attainment report PDF
        
        Args:
            subject_id: Subject ID
            co_attainment_data: CO attainment data
        
        Returns:
            PDF bytes
        """
        # Create PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER
        )
        
        # Header
        story.append(Paragraph("<b>CO-PO ATTAINMENT REPORT</b>", title_style))
        story.append(Spacer(1, 0.3*inch))
        
        story.append(Paragraph(f"<b>Subject ID:</b> {subject_id}", styles['Normal']))
        story.append(Spacer(1, 0.2*inch))
        
        # CO Attainment table
        table_data = [['CO Code', 'Title', 'Attainment %', 'Target %', 'Status']]
        
        for co_code, co_data in co_attainment_data.get('co_attainment', {}).items():
            table_data.append([
                co_data.get('code', co_code),
                co_data.get('title', ''),
                f"{co_data.get('attainment_percentage', 0):.2f}%",
                f"{co_data.get('target_attainment', 0):.2f}%",
                co_data.get('status', 'pending')
            ])
        
        table = Table(table_data, colWidths=[1*inch, 3*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return buffer.getvalue()

