-- Database Backup Script
-- Run this before making any schema changes

-- Create backup of existing tables
CREATE TABLE IF NOT EXISTS departments_backup AS SELECT * FROM departments;
CREATE TABLE IF NOT EXISTS classes_backup AS SELECT * FROM classes;
CREATE TABLE IF NOT EXISTS subjects_backup AS SELECT * FROM subjects;
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS exams_backup AS SELECT * FROM exams;
CREATE TABLE IF NOT EXISTS questions_backup AS SELECT * FROM questions;
CREATE TABLE IF NOT EXISTS marks_backup AS SELECT * FROM marks;
CREATE TABLE IF NOT EXISTS co_definitions_backup AS SELECT * FROM co_definitions;
CREATE TABLE IF NOT EXISTS po_definitions_backup AS SELECT * FROM po_definitions;
CREATE TABLE IF NOT EXISTS co_targets_backup AS SELECT * FROM co_targets;
CREATE TABLE IF NOT EXISTS assessment_weights_backup AS SELECT * FROM assessment_weights;
CREATE TABLE IF NOT EXISTS co_po_matrix_backup AS SELECT * FROM co_po_matrix;
CREATE TABLE IF NOT EXISTS question_co_weights_backup AS SELECT * FROM question_co_weights;
CREATE TABLE IF NOT EXISTS indirect_attainment_backup AS SELECT * FROM indirect_attainment;
CREATE TABLE IF NOT EXISTS student_goals_backup AS SELECT * FROM student_goals;
CREATE TABLE IF NOT EXISTS student_milestones_backup AS SELECT * FROM student_milestones;

-- Log backup completion
INSERT INTO audit_log (action, table_name, timestamp, details) 
VALUES ('BACKUP', 'ALL_TABLES', NOW(), 'Full database backup before integration changes');
