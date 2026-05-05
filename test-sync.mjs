import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSync() {
  const payload = {
    p_students: [],
    p_staff: [
      {
        id: "s_test_1",
        name: "Test Staff",
        role: "Assistant Teacher",
        subject: null,
        contact: "123",
        hire_date: null,
        password: null
      }
    ],
    p_classes: [],
    p_enrollments: [],
    p_grades: [],
    p_attendance: []
  };

  console.log("Calling sync_school_data_v4...");
  const { data, error } = await supabase.rpc('sync_school_data_v4', payload);
  
  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("Success! Data:", data);
  }
}

testSync();
