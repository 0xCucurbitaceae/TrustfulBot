import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Define the type for our user data
export type UserData = {
  id?: number;
  handle: string;
  tgId: string;
  address: string;
  canonAddress?: string | null;
  created_at?: string;
};

/**
 * Save user data to Supabase
 * @param handle The handler identifier
 * @param tgId The user's Telegram ID
 * @param address The user's account address
 * @param canonAddress The user's optional canonical address
 * @returns The result of the insertion
 */
export const saveUserData = async (
  handle: string,
  tgId: string,
  address: string,
  canonAddress?: string
): Promise<{ success: boolean; data?: UserData; error?: any }> => {
  try {
    const userDataToUpsert: {
      handle: string;
      tgId: string;
      address: string;
      canonAddress?: string;
    } = {
      handle,
      tgId,
      address,
    };
    if (canonAddress !== undefined) {
      userDataToUpsert.canonAddress = canonAddress;
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(userDataToUpsert)
      .select()
      .single();

    if (error) {
      console.error('Error saving user data:', error);
      return { success: false, error };
    }
    return { success: true, data: data as UserData };
  } catch (error) {
    console.error('Exception saving handler-user mapping:', error);
    return { success: false, error };
  }
};

/**
 * Get a user ID and account by handler ID
 * @param handle The handler identifier
 * @returns The user data if found
 */
export const getUserByHandler = async (
  handle: string
): Promise<{
  success: boolean;
  data?: UserData;
  error?: any;
}> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('handle', handle.replace('@', ''))
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log(`User with handle '${handle}' not found.`);
        return { success: false, error: { message: 'User not found' } };
      }
      console.error('Error getting user by handler:', error);
      return { success: false, error };
    }

    return { success: true, data: data as UserData };
  } catch (error) {
    console.error('Exception getting user by handler:', error);
    return { success: false, error };
  }
};
