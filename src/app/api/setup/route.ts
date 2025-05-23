import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('groupId')
      .neq('groupId', 'NULL') // Check for non-null groupId
      .limit(1);

    if (error) {
      console.error('Error fetching config:', error);
      return NextResponse.json({ error: 'Failed to fetch configuration.' }, { status: 500 });
    }

    if (data && data.length > 0 && data[0].groupId) {
      return NextResponse.json({ groupId: data[0].groupId });
    } else {
      return NextResponse.json({ groupId: null }); // No groupId configured
    }
  } catch (e) {
    console.error('Unexpected error fetching config:', e);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as any;
    const { groupId } = body;

    if (!groupId || typeof groupId !== 'string') {
      return NextResponse.json({ error: 'groupId is required and must be a string.' }, { status: 400 });
    }

    // Check if a groupId is already configured
    const { data: existingConfig, error: selectError } = await supabase
      .from('config')
      .select('groupId')
      .neq('groupId', 'NULL')
      .limit(1);

    if (selectError) {
      console.error('Error checking existing config:', selectError);
      return NextResponse.json({ error: 'Failed to check existing configuration.' }, { status: 500 });
    }

    if (existingConfig && existingConfig.length > 0 && existingConfig[0].groupId) {
      return NextResponse.json({ error: 'Configuration already exists. Setup can only be run once.' }, { status: 401 });
    }

    // Insert the new groupId
    const { error: insertError } = await supabase
      .from('config')
      .insert({ groupId });

    if (insertError) {
      console.error('Error inserting config:', insertError);
      return NextResponse.json({ error: 'Failed to save configuration.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Configuration saved successfully.' }, { status: 200 });

  } catch (e: any) {
    if (e instanceof SyntaxError) { // Handle cases where request.json() fails
        return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }
    console.error('Unexpected error saving config:', e);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
