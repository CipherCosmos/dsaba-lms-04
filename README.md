# Internal Exam Management System

A comprehensive web-based application for managing internal exam marks entry and generating advanced analytics for students, teachers, and departmental leadership.

## 🎯 Features

### For Students
- Personal analytics dashboard with performance tracking
- CO/PO attainment visualization
- Progress tracking and goal setting
- Personalized study recommendations
- Achievement badges and milestones

### For Teachers
- Intuitive marks entry with Excel import/export
- Real-time class performance analytics
- Question-wise analysis and difficulty assessment
- Student risk identification
- CO/PO attainment monitoring

### For HOD/Admin
- Department-wide analytics and insights
- Faculty performance evaluation
- NBA/NAAC compliance reports
- Automated report generation (PDF/Excel)
- Strategic decision support dashboard

## 🚀 Technology Stack

### Frontend
- **React 18+** with TypeScript
- **Redux Toolkit** for state management
- **Tailwind CSS** for styling
- **Chart.js** for data visualization
- **React Hook Form** with Yup validation
- **Lucide React** for icons

### Backend
- **FastAPI** with async/await support
- **PostgreSQL** for data storage
- **SQLAlchemy** ORM with Alembic migrations
- **JWT** authentication
- **ReportLab** for PDF generation
- **OpenPyXL** for Excel reports

## 📋 Prerequisites

- Node.js 16+ and npm
- Python 3.11+
- PostgreSQL 13+
- Git

## 🛠️ Installation & Setup

### Option 1: Local Development

#### Backend Setup
```bash
# Clone the repository
git clone <repository-url>
cd internal-exam-management-system

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup database
createdb exam_management
# Update DATABASE_URL in .env file
python -m alembic upgrade head
python seed_data.py  # Load sample data
```

#### Frontend Setup
```bash
# Setup frontend (in new terminal)
cd ..  # Go back to root directory
npm install
```

#### Running the Application
```bash
# Terminal 1: Start backend
cd backend
python -m uvicorn main:app --reload

# Terminal 2: Start frontend
npm run dev
```

### Option 2: Docker Setup
```bash
# Start with Docker Compose
cd backend
docker-compose up -d

# The application will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## 👤 Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| HOD | hod_cse | hod123 |
| Teacher | teacher1 | teacher123 |
| Student | cse-a_student01 | student123 |

## 📊 System Architecture

### Database Schema
- **Users**: Multi-role user management (Admin, HOD, Teacher, Student)
- **Departments**: Academic department structure
- **Classes**: Class management with semester/section
- **Subjects**: Course management with CO/PO mapping
- **Exams**: Exam configuration with question bank
- **Marks**: Detailed marks storage with question-wise tracking

### API Endpoints
- `/auth/*` - Authentication and user management
- `/departments/*` - Department CRUD operations
- `/classes/*` - Class management
- `/subjects/*` - Subject and curriculum management
- `/exams/*` - Exam configuration and management
- `/marks/*` - Marks entry and retrieval
- `/analytics/*` - Performance analytics generation
- `/reports/*` - Report generation and export

## 📈 Analytics Features

### Student Analytics
- Performance trend analysis
- CO/PO attainment tracking
- Peer comparison and ranking
- Personalized learning recommendations
- Progress milestone tracking

### Teacher Analytics
- Class performance overview
- Question difficulty analysis
- Student risk identification
- Teaching effectiveness metrics
- CO/PO attainment monitoring

### HOD Analytics
- Department-wide performance insights
- Faculty effectiveness analysis
- Subject performance comparison
- NBA compliance monitoring
- Strategic decision support

## 📋 Report Generation

The system supports automated generation of:
- Student Performance Reports
- CO/PO Attainment Analysis
- NBA Compliance Documentation
- Faculty Assessment Reports
- Department Summary Reports

All reports are available in both PDF and Excel formats.

## 🔒 Security Features

- JWT-based authentication
- Role-based access control
- Data validation and sanitization
- Audit trail maintenance
- Secure password hashing

## 🧪 Testing

### Demo Data
The system includes comprehensive seed data with:
- 4 departments (CSE, ECE, MECH, CIVIL)
- Multiple classes and sections
- 10 teachers with subject assignments
- 240+ students across all classes
- Sample exams with realistic marks distribution

### Testing Credentials
Use the demo credentials above to test different user roles and their respective functionalities.

## 📚 Usage Guide

### For Teachers: Marks Entry
1. Navigate to "Exam Configuration" to set up exams
2. Go to "Marks Entry" and select an exam
3. Enter marks directly or upload Excel template
4. View real-time analytics and student performance

### For Students: Progress Tracking
1. Access "My Analytics" for performance overview
2. Check "Progress Tracking" for goals and recommendations
3. Monitor CO/PO attainment and class ranking

### For HOD: Department Management
1. Use "Analytics" for department-wide insights
2. Generate reports from "Reports" section
3. Monitor faculty performance and student outcomes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🚧 Roadmap

- [ ] Mobile responsive improvements
- [ ] Advanced ML-based analytics
- [ ] Integration with LMS platforms
- [ ] Multi-language support
- [ ] Advanced reporting dashboard
- [ ] Real-time notifications
- [ ] Parent portal integration