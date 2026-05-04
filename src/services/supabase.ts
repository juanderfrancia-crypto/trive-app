import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://iksenkkaxlmdiyeezoym.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlrc2Vua2theGxtZGl5ZWV6b3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzA3NDksImV4cCI6MjA5MDg0Njc0OX0.ZNxwFnhTQOWKiLrdtTWsJDNLXRmc9T3tDtmE87HxrVA";

export const supabase = createClient(supabaseUrl, supabaseKey);