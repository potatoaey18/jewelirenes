import { supabase } from "@/integrations/supabase/client";

export async function createAuditLog(
  action: string,
  tableName: string,
  recordId?: string,
  oldData?: any,
  newData?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      user_email: user.email || 'unknown',
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
