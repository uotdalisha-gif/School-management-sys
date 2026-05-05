-- Run this entire script in the Supabase SQL Editor

-- 1. Add missing columns to staff if they don't exist
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- 2. Update the sync function to handle the new columns and prevent cardinality issues
CREATE OR REPLACE FUNCTION public.sync_school_data_v8(
  p_students JSONB,
  p_staff JSONB,
  p_classes JSONB,
  p_enrollments JSONB,
  p_grades JSONB,
  p_attendance JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_ids TEXT[];
  v_staff_ids TEXT[];
  v_class_ids TEXT[];
BEGIN
  -- Extract IDs from the incoming JSON payloads
  SELECT array_agg(value->>'id') INTO v_student_ids FROM jsonb_array_elements(p_students) AS value;
  SELECT array_agg(value->>'id') INTO v_staff_ids FROM jsonb_array_elements(p_staff) AS value;
  SELECT array_agg(value->>'id') INTO v_class_ids FROM jsonb_array_elements(p_classes) AS value;

  -- ==========================================
  -- UPSERTS (Insert or Update existing)
  -- ==========================================

  -- Students
  INSERT INTO public.students (id, name, sex, dob, phone, enrollment_date, status)
  SELECT DISTINCT ON (id) id, name, sex, dob, phone, enrollment_date, status
  FROM (
    SELECT
      (value->>'id') as id, 
      (value->>'name') as name, 
      (value->>'sex') as sex, 
      NULLIF(value->>'dob', '')::date as dob, 
      (value->>'phone') as phone, 
      NULLIF(value->>'enrollment_date', '')::date as enrollment_date, 
      (value->>'status') as status
    FROM jsonb_array_elements(p_students)
  ) AS t
  WHERE id IS NOT NULL
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    sex = EXCLUDED.sex,
    dob = EXCLUDED.dob,
    phone = EXCLUDED.phone,
    enrollment_date = EXCLUDED.enrollment_date,
    status = EXCLUDED.status;

  -- Staff
  INSERT INTO public.staff (id, name, role, subject, contact, hire_date, password, dob, is_archived)
  SELECT DISTINCT ON (id) id, name, role, subject, contact, hire_date, password, dob, is_archived
  FROM (
    SELECT
      (value->>'id') as id, 
      (value->>'name') as name, 
      (value->>'role') as role, 
      (value->>'subject') as subject, 
      (value->>'contact') as contact, 
      NULLIF(value->>'hire_date', '')::date as hire_date,
      (value->>'password') as password,
      NULLIF(value->>'dob', '')::date as dob,
      COALESCE((value->>'is_archived')::boolean, false) as is_archived
    FROM jsonb_array_elements(p_staff)
  ) AS t
  WHERE id IS NOT NULL
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    subject = EXCLUDED.subject,
    contact = EXCLUDED.contact,
    hire_date = EXCLUDED.hire_date,
    password = COALESCE(EXCLUDED.password, public.staff.password),
    dob = EXCLUDED.dob,
    is_archived = EXCLUDED.is_archived;

  -- Classes
  INSERT INTO public.classes (id, name, teacher_id, schedule, level)
  SELECT DISTINCT ON (id) id, name, teacher_id, schedule, level
  FROM (
    SELECT
      (value->>'id') as id, 
      (value->>'name') as name, 
      (value->>'teacher_id') as teacher_id, 
      (value->>'schedule') as schedule, 
      (value->>'level') as level
    FROM jsonb_array_elements(p_classes)
  ) AS t
  WHERE id IS NOT NULL
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    teacher_id = EXCLUDED.teacher_id,
    schedule = EXCLUDED.schedule,
    level = EXCLUDED.level;

  -- ==========================================
  -- DELETIONS (Remove records not in frontend)
  -- ==========================================
  
  DELETE FROM public.students 
  WHERE id != ALL(COALESCE(v_student_ids, ARRAY[]::TEXT[]))
  AND id IS NOT NULL;

  DELETE FROM public.staff 
  WHERE id != ALL(COALESCE(v_staff_ids, ARRAY[]::TEXT[])) 
  AND id != 'admin'
  AND id IS NOT NULL;

  DELETE FROM public.classes 
  WHERE id != ALL(COALESCE(v_class_ids, ARRAY[]::TEXT[]))
  AND id IS NOT NULL;

  -- ==========================================
  -- FULL REPLACEMENTS (For junction/child tables)
  -- ==========================================

  -- Enrollments
  DELETE FROM public.enrollments WHERE id IS NOT NULL;
  INSERT INTO public.enrollments (id, student_id, class_id, academic_year)
  SELECT DISTINCT ON (id) id, student_id, class_id, academic_year
  FROM (
    SELECT
      (value->>'id') as id, 
      (value->>'student_id') as student_id, 
      (value->>'class_id') as class_id, 
      (value->>'academic_year') as academic_year
    FROM jsonb_array_elements(p_enrollments)
  ) AS t
  WHERE id IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Grades
  DELETE FROM public.grades WHERE id IS NOT NULL;
  INSERT INTO public.grades (id, student_id, subject, score, term)
  SELECT DISTINCT ON (id) id, student_id, subject, score, term
  FROM (
    SELECT
      (value->>'id') as id, 
      (value->>'student_id') as student_id, 
      (value->>'subject') as subject, 
      NULLIF(value->>'score', '')::numeric as score, 
      (value->>'term') as term
    FROM jsonb_array_elements(p_grades)
  ) AS t
  WHERE id IS NOT NULL
  ON CONFLICT (id) DO UPDATE SET
    score = EXCLUDED.score,
    term = EXCLUDED.term;

  -- Attendance
  DELETE FROM public.attendance WHERE id IS NOT NULL;
  INSERT INTO public.attendance (id, student_id, date, status)
  SELECT DISTINCT ON (id) id, student_id, date, status
  FROM (
    SELECT
      (value->>'id') as id, 
      (value->>'student_id') as student_id, 
      NULLIF(value->>'date', '')::date as date, 
      (value->>'status') as status
    FROM jsonb_array_elements(p_attendance)
  ) AS t
  WHERE id IS NOT NULL
  ON CONFLICT DO NOTHING;

END;
$$;
