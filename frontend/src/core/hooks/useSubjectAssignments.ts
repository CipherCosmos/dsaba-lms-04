/**
 * Hook to manage subject assignments and provide utilities for getting subject info from exams
 */

import { useState, useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { subjectAssignmentAPI } from '../../services/api'
import { logger } from '../utils/logger'

interface SubjectAssignment {
  id: number
  subject_id: number
  teacher_id: number
  class_id: number
  semester_id: number
  academic_year: number
  created_at: string
}

/**
 * Hook to fetch and cache subject assignments for exams
 * Returns a map of exam_id -> subject assignment
 */
export function useExamSubjectAssignments(exams: any[]) {
  const [assignmentMap, setAssignmentMap] = useState<Map<number, SubjectAssignment>>(new Map())
  const [loading, setLoading] = useState(false)
  const { subjects } = useSelector((state: RootState) => state.subjects)

  useEffect(() => {
    const fetchAssignments = async () => {
      if (exams.length === 0) {
        setAssignmentMap(new Map())
        return
      }

      setLoading(true)
      try {
        // Get unique subject_assignment_ids from exams
        const assignmentIds = new Set(
          exams
            .map(exam => exam.subject_assignment_id)
            .filter((id): id is number => id !== undefined && id !== null)
        )

        if (assignmentIds.size === 0) {
          setAssignmentMap(new Map())
          setLoading(false)
          return
        }

        // Fetch all assignments in parallel
        const assignments = await Promise.allSettled(
          Array.from(assignmentIds).map(id => subjectAssignmentAPI.getById(id))
        )

        const map = new Map<number, SubjectAssignment>()
        assignments.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const assignment = result.value
            // Map by assignment id (not exam id) - we'll need to reverse lookup
            map.set(assignment.id, assignment)
          }
        })

        // Create exam_id -> assignment map
        const examToAssignmentMap = new Map<number, SubjectAssignment>()
        exams.forEach(exam => {
          if (exam.subject_assignment_id && map.has(exam.subject_assignment_id)) {
            examToAssignmentMap.set(exam.id, map.get(exam.subject_assignment_id)!)
          }
        })

        setAssignmentMap(examToAssignmentMap)
        logger.debug('Subject assignments loaded:', examToAssignmentMap.size)
      } catch (error) {
        logger.error('Error fetching subject assignments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [exams])

  /**
   * Get subject for an exam
   */
  const getSubjectForExam = useMemo(() => {
    return (exam: any) => {
      const assignment = assignmentMap.get(exam.id)
      if (!assignment) return null
      return subjects.find(s => s.id === assignment.subject_id) || null
    }
  }, [assignmentMap, subjects])

  /**
   * Get class_id for an exam
   */
  const getClassIdForExam = useMemo(() => {
    return (exam: any) => {
      const assignment = assignmentMap.get(exam.id)
      return assignment?.class_id || null
    }
  }, [assignmentMap])

  /**
   * Get assignment for an exam
   */
  const getAssignmentForExam = useMemo(() => {
    return (exam: any) => {
      return assignmentMap.get(exam.id) || null
    }
  }, [assignmentMap])

  return {
    assignmentMap,
    loading,
    getSubjectForExam,
    getClassIdForExam,
    getAssignmentForExam
  }
}

