import { createSupabaseClient } from '@/shared/api/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ id: user.id, email: user.email, name: user.user_metadata?.name || '' });
}