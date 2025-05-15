import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Define the type for our user data
export type UserData = {
  id?: number;
  handle: string;
  user_id: string;
  account: string;
  platform: string;
  created_at?: string;
};

/**
 * Save user data to Supabase
 * @param handle The handler identifier
 * @param user_id The user's ID
 * @param address The user's account address
 * @param platform The platform (e.g., 'ZUITZERLAND')
 * @returns The result of the insertion
 */
export const saveUserData = async (
  handle: string,
  tgId: string,
  address: string,
  platform: string = 'ZUITZERLAND'
): Promise<{ success: boolean; data?: UserData; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({handle, tgId, address })
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
 * @param platform The platform (e.g., 'ZUITZERLAND')
 * @returns The user ID and account if found
 */
export const getUserByHandler = async (
  handle: string,
  platform: string = 'ZUITZERLAND'
): Promise<{ success: boolean; user_id?: string; account?: string; error?: any }> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, account')
      .eq('handle', handle)
      .eq('platform', platform)
      .single();

    if (error) {
      console.error('Error getting user ID by handler:', error);
      return { success: false, error };
    }

    return { success: true, user_id: data.user_id, account: data.account };
  } catch (error) {
    console.error('Exception getting user ID by handler:', error);
    return { success: false, error };
  }
};
