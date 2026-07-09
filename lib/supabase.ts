import { createClient } from '@supabase/supabase-js';

// 🌟 ฝังลิงก์โปรเจกต์ใหม่ของคุณตรงๆ
const supabaseUrl = 'https://tvokpkhvizpoutrcuvom.supabase.co';

// ⚠️ ลบรหัสผ่านตัวเก่าที่ขึ้นต้นด้วย sb_... ออกให้เกลี้ยง แล้วเอารหัสยาวเหยียดที่ขึ้นต้นด้วย eyJ... มาวางแปะในนี้ครับ
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2b2twa2h2aXpwb3V0cmN1dm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1OTMxNjksImV4cCI6MjA5OTE2OTE2OX0.XeCaWL6lptSWIiEi1NcydqXrYhceOE_wrbeGMmdeqCA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);