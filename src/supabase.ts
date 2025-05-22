import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Define the type for our user data
export type UserData = {
  id?: number;
  handle: string;
  user_id: string;
  address: string;
  created_at?: string;
};

/**
 * Save user data to Supabase
 * @param handle The handler identifier
 * @param user_id The user's ID
 * @param address The user's account address
 * @returns The result of the insertion
 */
export const saveUserData = async (
  handle: string,
  tgId: string,
  address: string
): Promise<{ success: boolean; data?: UserData; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({ handle, tgId, address })
      .select()
      .single();

    if (error) {
      console.error('Error saving user data:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception saving handler-user mapping:', error);
    return { success: false, error };
  }
};

/**
 * Get a user ID and account by handler ID
 * @param handle The handler identifier
 * @returns The user ID and account if found
 */
export const getUserByHandler = async (
  handle: string
): Promise<{
  success: boolean;
  user_id?: string;
  address?: string;
  error?: any;
}> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('handle', handle)
      .single();

    if (error) {
      console.error('Error getting user ID by handler:', error);
      return { success: false, error };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Exception getting user ID by handler:', error);
    return { success: false, error };
  }
};
