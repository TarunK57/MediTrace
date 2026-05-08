const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://bulanesjuuyhmgxictbe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1bGFuZXNqdXV5aG1neGljdGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc4MDQ4NiwiZXhwIjoyMDkzMzU2NDg2fQ.hLmBa6o_w36s0yxJpgZBMcq9xM39_Tqo1bY8GpE5zx4'
);

async function setAdmin() {
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('email', 'newadmin@meditrace.com');

  if (error) {
    console.error('Error updating role:', error);
  } else {
    console.log('Successfully updated role to admin for newadmin@meditrace.com');
  }
}

setAdmin();
