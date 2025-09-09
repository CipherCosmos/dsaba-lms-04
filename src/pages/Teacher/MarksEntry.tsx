import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { AppDispatch, RootState } from '../../store/store'
import { fetchExams } from '../../store/slices/examSlice'
import { fetchSubjects } from '../../store/slices/subjectSlice'
import { fetchUsers } from '../../store/slices/userSlice'
import { fetchMarksByExam, saveMarks } from '../../store/slices/marksSlice'
import { Download, Upload, Save, Edit3, Users, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

const MarksEntry = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { exams } = useSelector((state: RootState) => state.exams)
  const { subjects } = useSelector((state: RootState) => state.subjects)
  const { users } = useSelector((state: RootState) => state.users)
  const { marks, loading } = useSelector((state: RootState) => state.marks)
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [marksData, setMarksData] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  useEffect(() => {
    dispatch(fetchExams())
    dispatch(fetchSubjects())
    dispatch(fetchUsers())
  }, [dispatch])

  // Filter exams for current teacher
  const teacherSubjects = subjects.filter(s => s.teacher_id === user?.id)
  const teacherExams = exams.filter(exam => 
    teacherSubjects.some(subject => subject.id === exam.subject_id)
  )

  const handleExamSelect = async (exam: any) => {
    setSelectedExam(exam)
    
    // Get subject to find class
    const subject = subjects.find(s => s.id === exam.subject_id)
    if (subject) {
      const classStudents = users.filter(u => 
        u.role === 'student' && u.class_id === subject.class_id
      )
      setStudents(classStudents)
      
      // Fetch existing marks
      dispatch(fetchMarksByExam(exam.id))
      
      // Initialize marks data structure
      const initialMarksData = classStudents.map(student => {
        const studentMarks = {}
        exam.questions?.forEach((question: any) => {
          const existingMark = marks.find(m => 
            m.student_id === student.id && m.question_id === question.id
          )
          studentMarks[question.id] = existingMark?.marks_obtained || 0
        })
        
        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          marks: studentMarks,
          total: 0
        }
      })
      
      setMarksData(initialMarksData)
    }
  }

  const handleMarksChange = (studentId: number, questionId: number, marks: number) => {
    setMarksData(prev => prev.map(student => {
      if (student.student_id === studentId) {
        const updatedMarks = { ...student.marks, [questionId]: marks }
        const total = Object.values(updatedMarks).reduce((sum: any, mark: any) => sum + Number(mark), 0)
        return { ...student, marks: updatedMarks, total }
      }
      return student
    }))
  }

  const handleSaveMarks = async () => {
    if (!selectedExam) return

    try {
      const marksToSave = []
      
      for (const student of marksData) {
        for (const questionId in student.marks) {
          marksToSave.push({
            exam_id: selectedExam.id,
            student_id: student.student_id,
            question_id: parseInt(questionId),
            marks_obtained: Number(student.marks[questionId])
          })
        }
      }

      await dispatch(saveMarks(marksToSave)).unwrap()
      toast.success('Marks saved successfully!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save marks')
    }
  }

  const downloadExcelTemplate = () => {
    if (!selectedExam || !students.length) return

    const templateData = students.map(student => {
      const row: any = {
        'Student ID': student.id,
        'Student Name': `${student.first_name} ${student.last_name}`,
        'Email': student.email
      }
      
      selectedExam.questions?.forEach((question: any) => {
        row[`Q${question.question_number} (${question.max_marks})`] = ''
      })
      
      row['Total'] = ''
      return row
    })

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marks')
    XLSX.writeFile(wb, `${selectedExam.name}_Template.xlsx`)
  }

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        // Process uploaded data
        const updatedMarksData = marksData.map(student => {
          const uploadedRow = jsonData.find((row: any) => 
            row['Student ID'] === student.student_id
          )
          
          if (uploadedRow) {
            const updatedMarks = { ...student.marks }
            
            selectedExam.questions?.forEach((question: any) => {
              const columnName = `Q${question.question_number} (${question.max_marks})`
              if (uploadedRow[columnName] !== undefined) {
                updatedMarks[question.id] = Number(uploadedRow[columnName]) || 0
              }
            })
            
            const total = Object.values(updatedMarks).reduce((sum: any, mark: any) => sum + Number(mark), 0)
            return { ...student, marks: updatedMarks, total }
          }
          
          return student
        })
        
        setMarksData(updatedMarksData)
        toast.success('Excel data uploaded successfully!')
      } catch (error) {
        toast.error('Failed to process Excel file')
      }
    }
    
    reader.readAsArrayBuffer(file)
    event.target.value = ''
  }

  const exportToExcel = () => {
    if (!selectedExam || !marksData.length) return

    const exportData = marksData.map(student => {
      const row: any = {
        'Student ID': student.student_id,
        'Student Name': student.student_name
      }
      
      selectedExam.questions?.forEach((question: any) => {
        row[`Q${question.question_number} (${question.max_marks})`] = student.marks[question.id] || 0
      })
      
      row['Total'] = student.total
      row['Percentage'] = selectedExam.total_marks > 0 ? 
        ((student.total / selectedExam.total_marks) * 100).toFixed(1) + '%' : '0%'
      
      return row
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Marks')
    XLSX.writeFile(wb, `${selectedExam.name}_Marks.xlsx`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Marks Entry</h1>
        <div className="flex space-x-3">
          {selectedExam && (
            <>
              <button
                onClick={downloadExcelTemplate}
                className="btn-secondary flex items-center space-x-2"
              >
                <Download size={18} />
                <span>Template</span>
              </button>
              
              <label className="btn-secondary flex items-center space-x-2 cursor-pointer">
                <Upload size={18} />
                <span>Upload Excel</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>
              
              <button
                onClick={exportToExcel}
                className="btn-secondary flex items-center space-x-2"
              >
                <FileSpreadsheet size={18} />
                <span>Export</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Exam Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Exam</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherExams.map(exam => {
            const subject = subjects.find(s => s.id === exam.subject_id)
            return (
              <button
                key={exam.id}
                onClick={() => handleExamSelect(exam)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  selectedExam?.id === exam.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <h4 className="font-medium text-gray-900">{exam.name}</h4>
                <p className="text-sm text-gray-600">{subject?.name}</p>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>{exam.questions?.length || 0} questions</span>
                  <span>{exam.total_marks} marks</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Marks Entry Table */}
      {selectedExam && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedExam.name} - Marks Entry
            </h3>
            <div className="flex items-center space-x-2">
              <Users size={16} className="text-gray-600" />
              <span className="text-sm text-gray-600">{students.length} students</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 sticky left-0 bg-white">
                    Student
                  </th>
                  {selectedExam.questions?.map((question: any) => (
                    <th key={question.id} className="text-center py-3 px-4 font-medium text-gray-600">
                      <div className="flex flex-col">
                        <span>Q{question.question_number}</span>
                        <span className="text-xs text-gray-500">({question.max_marks})</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center py-3 px-4 font-medium text-gray-600">Total</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600">%</th>
                </tr>
              </thead>
              <tbody>
                {marksData.map((student, index) => (
                  <tr key={student.student_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 sticky left-0 bg-white">
                      <div>
                        <p className="font-medium text-gray-900">{student.student_name}</p>
                        <p className="text-xs text-gray-500">ID: {student.student_id}</p>
                      </div>
                    </td>
                    {selectedExam.questions?.map((question: any) => (
                      <td key={question.id} className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          max={question.max_marks}
                          step="0.5"
                          value={student.marks[question.id] || ''}
                          onChange={(e) => handleMarksChange(
                            student.student_id,
                            question.id,
                            parseFloat(e.target.value) || 0
                          )}
                          className="w-16 input-field text-center"
                        />
                      </td>
                    ))}
                    <td className="py-3 px-4 text-center font-medium">
                      {student.total.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`font-medium ${
                        selectedExam.total_marks > 0 && 
                        (student.total / selectedExam.total_marks) * 100 >= 50
                          ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {selectedExam.total_marks > 0 
                          ? ((student.total / selectedExam.total_marks) * 100).toFixed(1) + '%'
                          : '0%'
                        }
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>Total Students: {students.length}</p>
              {marksData.length > 0 && (
                <p>
                  Average: {(marksData.reduce((sum, s) => sum + s.total, 0) / marksData.length).toFixed(1)} / {selectedExam.total_marks}
                </p>
              )}
            </div>
            <button
              onClick={handleSaveMarks}
              disabled={loading || !marksData.length}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save size={18} />
              )}
              <span>{loading ? 'Saving...' : 'Save Marks'}</span>
            </button>
          </div>
        </div>
      )}

      {teacherExams.length === 0 && (
        <div className="card text-center py-8">
          <Edit3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Exams Found</h3>
          <p className="text-gray-600">
            You haven't configured any exams yet. Go to Exam Configuration to create one.
          </p>
        </div>
      )}
    </div>
  )
}

export default MarksEntry