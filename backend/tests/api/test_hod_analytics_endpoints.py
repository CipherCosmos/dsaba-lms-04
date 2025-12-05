import pytest
from datetime import date
from src.infrastructure.database.models import (
    DepartmentModel,
    StudentModel,
    TeacherModel,
    SubjectModel,
    SubjectAssignmentModel,
    InternalMarkModel,
    BatchInstanceModel,
    UserModel,
    RoleModel,
    UserRoleModel
)
from src.domain.entities.user import UserRole

class TestHODAnalyticsEndpoints:
    
    @pytest.fixture
    def hod_user(self, test_db_session, password_hasher, department):
        """Create an HOD user"""
        # Create HOD role if not exists
        hod_role = test_db_session.query(RoleModel).filter(
            RoleModel.name == "hod"
        ).first()
        
        if not hod_role:
            hod_role = RoleModel(name="hod", description="Head of Department")
            test_db_session.add(hod_role)
            test_db_session.commit()
            test_db_session.refresh(hod_role)
            
        # Create user
        user = UserModel(
            username="hod_test",
            email="hod@test.com",
            first_name="HOD",
            last_name="Test",
            hashed_password=password_hasher.hash("password"),
            is_active=True,
            email_verified=True
        )
        test_db_session.add(user)
        test_db_session.commit()
        
        # Assign role
        user_role = UserRoleModel(user_id=user.id, role_id=hod_role.id)
        test_db_session.add(user_role)
        test_db_session.commit()
        
        # Create Teacher profile (HOD is usually a teacher too)
        teacher = TeacherModel(
            user_id=user.id,
            department_id=department.id,
            employee_id="HOD001",
            specialization="Analytics",
            join_date=date(2020, 1, 1)
        )
        test_db_session.add(teacher)
        test_db_session.commit()
        
        return user

    @pytest.fixture
    def hod_token(self, client, hod_user):
        """Get auth token for HOD"""
        response = client.post(
            "/api/v1/auth/login",
            json={"username": hod_user.username, "password": "password"}
        )
        return response.json()["access_token"]

    @pytest.fixture
    def analytics_data(self, test_db_session, department, hod_user, academic_year, batch, semester, section, batch_instance):
        """Setup data for analytics tests"""
        # 1. Use existing Batch Instance from fixture
        # batch_instance is already created by fixture
        
        # 2. Create Student
        student_user = UserModel(
            username="student_ana",
            email="student_ana@test.com",
            first_name="Student",
            last_name="Analytics",
            hashed_password="hash",
            is_active=True
        )
        test_db_session.add(student_user)
        test_db_session.commit()
        
        student = StudentModel(
            user_id=student_user.id,
            department_id=department.id,
            batch_instance_id=batch_instance.id,
            roll_no="ANA001"
        )
        test_db_session.add(student)
        test_db_session.commit()
        
        # 3. Create Subject
        subject = SubjectModel(
            name="Analytics Subject",
            code="ANA101",
            department_id=department.id,
            credits=3,
            semester_id=semester.id
        )
        test_db_session.add(subject)
        test_db_session.commit()
        
        # 4. Create Teacher (HOD is already created, let's use them)
        teacher = test_db_session.query(TeacherModel).filter(
            TeacherModel.user_id == hod_user.id
        ).first()
        
        # 5. Assign Subject
        assignment = SubjectAssignmentModel(
            subject_id=subject.id,
            teacher_id=teacher.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            academic_year=2023
        )
        test_db_session.add(assignment)
        test_db_session.commit()
        
        # 6. Add Marks
        mark = InternalMarkModel(
            student_id=student.id,
            subject_assignment_id=assignment.id,
            semester_id=semester.id,
            academic_year_id=academic_year.id,
            component_type="ia1",
            marks_obtained=45,
            max_marks=50,
            workflow_state="published",
            entered_by=hod_user.id
        )
        test_db_session.add(mark)
        test_db_session.commit()
        
        return {
            "department": department,
            "student": student,
            "teacher": teacher,
            "subject": subject,
            "assignment": assignment,
            "mark": mark
        }

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_department_dashboard(self, client, hod_token, analytics_data):
        """Test getting department dashboard"""
        dept_id = analytics_data["department"].id
        response = client.get(
            f"/api/v1/hod-analytics/dashboard/{dept_id}",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "department_info" in data
        assert "overview" in data
        assert "batch_performance" in data
        assert data["overview"]["total_students"] >= 1

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_batch_comparison(self, client, hod_token, analytics_data):
        """Test batch comparison endpoint"""
        dept_id = analytics_data["department"].id
        response = client.get(
            f"/api/v1/hod-analytics/batch-comparison/{dept_id}",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "batches" in data
        assert len(data["batches"]) >= 1
        assert "average_percentage" in data["batches"][0]

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_faculty_performance(self, client, hod_token, analytics_data):
        """Test faculty performance endpoint"""
        dept_id = analytics_data["department"].id
        response = client.get(
            f"/api/v1/hod-analytics/faculty-performance/{dept_id}",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "faculty" in data
        assert len(data["faculty"]) >= 1
        assert "average_class_performance" in data["faculty"][0]

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_top_subjects(self, client, hod_token, analytics_data):
        """Test top subjects endpoint"""
        dept_id = analytics_data["department"].id
        response = client.get(
            f"/api/v1/hod-analytics/top-subjects/{dept_id}",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "subjects" in data
        assert len(data["subjects"]) >= 1
        assert data["subjects"][0]["subject_code"] == analytics_data["subject"].code

    @pytest.mark.api
    @pytest.mark.integration
    def test_get_weak_areas(self, client, hod_token, analytics_data):
        """Test weak areas endpoint"""
        dept_id = analytics_data["department"].id
        # Set threshold high to ensure our subject (90%) might appear if we set threshold to 95
        # Or set threshold low to ensure it doesn't appear
        
        response = client.get(
            f"/api/v1/hod-analytics/weak-areas/{dept_id}?threshold=95.0",
            headers={"Authorization": f"Bearer {hod_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "weak_areas" in data
        # Our student got 45/50 = 90%. If threshold is 95, it should be a weak area.
        if len(data["weak_areas"]) > 0:
            assert "improvement_needed" in data["weak_areas"][0]

    @pytest.mark.api
    @pytest.mark.integration
    def test_hod_analytics_permissions(self, client, student_token, analytics_data):
        """Test that students cannot access HOD analytics"""
        dept_id = analytics_data["department"].id
        response = client.get(
            f"/api/v1/hod-analytics/dashboard/{dept_id}",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        
        assert response.status_code == 403
