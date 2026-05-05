import { classService } from './classService.js';
import { localStore } from './core.js';
import {
  mapStudent,
  mapStaff,
  mapClass,
  mapEnrollment,
  mapGrade,
  mapAttendance,
} from './mappers.js';
import { staffService } from './staffService.js';
import { studentService } from './studentService.js';
import { supabase } from './supabase.js';

/**
 * Centralized synchronization service for batch operations.
 */
export const syncService = {
  /**
   * Imports a large payload of diverse data types into the system.
   */
  async importAllData(data) {
    const tasks = [];

    if (data.students?.length) tasks.push(studentService.saveStudents(data.students));
    if (data.staff?.length) tasks.push(staffService.saveStaff(data.staff));
    if (data.classes?.length) tasks.push(classService.saveClasses(data.classes));
    if (data.enrollments?.length) tasks.push(studentService.saveEnrollments(data.enrollments));
    if (data.grades?.length) tasks.push(studentService.saveGrades(data.grades));
    if (data.attendance?.length) tasks.push(studentService.saveAttendance(data.attendance));

    if (tasks.length > 0) await Promise.all(tasks);
  },

  /**
   * Performs a full synchronization cycle.
   * Pushes all local dirty data to Supabase using RPC.
   */
  async syncAll(payload) {
    if (!navigator.onLine || !supabase) return;

    try {
      const { error } = await supabase.rpc('sync_school_data_v7', {
        p_students: (payload.students || []).map(mapStudent.toDb),
        p_staff: (payload.staff || []).map(mapStaff.toDb),
        p_classes: (payload.classes || []).map(mapClass.toDb),
        p_enrollments: (payload.enrollments || []).map(mapEnrollment.toDb),
        p_grades: (payload.grades || []).map(mapGrade.toDb),
        p_attendance: (payload.attendance || []).map(mapAttendance.toDb)
      });

      if (error) throw error;

      ['students', 'staff', 'classes', 'enrollments', 'grades', 'attendance'].forEach(table => {
        localStore.setDirty(table, false);
      });
      
      console.log('✅ Sync completed successfully');
    } catch (err) {
      console.error('Sync failed:', err);
    }
  },
};
