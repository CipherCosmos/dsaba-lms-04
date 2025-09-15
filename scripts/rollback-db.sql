-- Database Rollback Script
-- Run this to restore from backup if needed

-- Restore from backup tables
DROP TABLE IF EXISTS departments CASCADE;
CREATE TABLE departments AS SELECT * FROM departments_backup;

DROP TABLE IF EXISTS classes CASCADE;
CREATE TABLE classes AS SELECT * FROM classes_backup;

DROP TABLE IF EXISTS subjects CASCADE;
CREATE TABLE subjects AS SELECT * FROM subjects_backup;

DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users AS SELECT * FROM users_backup;

DROP TABLE IF EXISTS exams CASCADE;
CREATE TABLE exams AS SELECT * FROM exams_backup;

DROP TABLE IF EXISTS questions CASCADE;
CREATE TABLE questions AS SELECT * FROM questions_backup;

DROP TABLE IF EXISTS marks CASCADE;
CREATE TABLE marks AS SELECT * FROM marks_backup;

DROP TABLE IF EXISTS co_definitions CASCADE;
CREATE TABLE co_definitions AS SELECT * FROM co_definitions_backup;

DROP TABLE IF EXISTS po_definitions CASCADE;
CREATE TABLE po_definitions AS SELECT * FROM po_definitions_backup;

DROP TABLE IF EXISTS co_targets CASCADE;
CREATE TABLE co_targets AS SELECT * FROM co_targets_backup;

DROP TABLE IF EXISTS assessment_weights CASCADE;
CREATE TABLE assessment_weights AS SELECT * FROM assessment_weights_backup;

DROP TABLE IF EXISTS co_po_matrix CASCADE;
CREATE TABLE co_po_matrix AS SELECT * FROM co_po_matrix_backup;

DROP TABLE IF EXISTS question_co_weights CASCADE;
CREATE TABLE question_co_weights AS SELECT * FROM question_co_weights_backup;

DROP TABLE IF EXISTS indirect_attainment CASCADE;
CREATE TABLE indirect_attainment AS SELECT * FROM indirect_attainment_backup;

DROP TABLE IF EXISTS student_goals CASCADE;
CREATE TABLE student_goals AS SELECT * FROM student_goals_backup;

DROP TABLE IF EXISTS student_milestones CASCADE;
CREATE TABLE student_milestones AS SELECT * FROM student_milestones_backup;

-- Log rollback completion
INSERT INTO audit_log (action, table_name, timestamp, details) 
VALUES ('ROLLBACK', 'ALL_TABLES', NOW(), 'Full database rollback from backup');
