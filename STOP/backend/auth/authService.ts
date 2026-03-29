/**
 * AURA Authentication Service
 * Supports Clerk and Supabase Auth providers
 */

import { createClient } from '@supabase/supabase-js';
import { clerkClient } from '@clerk/nextjs';

// Environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Auth provider selection
const AUTH_PROVIDER = process.env.AUTH_PROVIDER || 'clerk'; // 'clerk' | 'supabase'

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  credits: number;
}

export interface Session {
  user: User;
  expires_at: number;
}

/**
 * Get current user from request
 */
export async function getCurrentUser(token?: string): Promise<User | null> {
  if (!token) {
    return null;
  }

  try {
    if (AUTH_PROVIDER === 'clerk') {
      return getClerkUser(token);
    } else {
      return getSupabaseUser(token);
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Clerk implementation
 */
async function getClerkUser(token: string): Promise<User | null> {
  try {
    const { userId } = await clerkClient.verifyToken(token);
    
    if (!userId) {
      return null;
    }

    const user = await clerkClient.users.getUser(userId);
    
    // Get or create user in our database
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (dbUser) {
      return mapToUser(dbUser);
    }

    // Create user in database if doesn't exist
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName} ${user.lastName}`.trim(),
        avatar_url: user.imageUrl,
        plan: 'free',
        credits: 100
      })
      .select()
      .single();

    return newUser ? mapToUser(newUser) : null;
  } catch (error) {
    console.error('Clerk auth error:', error);
    return null;
  }
}

/**
 * Supabase Auth implementation
 */
async function getSupabaseUser(token: string): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Get user from our database
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (dbUser) {
      return mapToUser(dbUser);
    }

    // Create user in database if doesn't exist
    const { data: newUser } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url,
        plan: 'free',
        credits: 100
      })
      .select()
      .single();

    return newUser ? mapToUser(newUser) : null;
  } catch (error) {
    console.error('Supabase auth error:', error);
    return null;
  }
}

/**
 * Map database row to User type
 */
function mapToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    plan: row.plan,
    credits: row.credits
  };
}

/**
 * Verify and decode JWT token
 */
export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    if (AUTH_PROVIDER === 'clerk') {
      const { userId } = await clerkClient.verifyToken(token);
      return userId ? { userId } : null;
    } else {
      const { data: { user } } = await supabase.auth.getUser(token);
      return user ? { userId: user.id } : null;
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Create session for user
 */
export async function createSession(userId: string): Promise<Session | null> {
  try {
    // For Clerk, sessions are managed by Clerk
    if (AUTH_PROVIDER === 'clerk') {
      // Clerk handles session creation automatically
      return {
        user: await getCurrentUser('') || { id: userId, email: '', name: '', plan: 'free', credits: 100 },
        expires_at: Date.now() + 1000 * 60 * 60 * 24 // 24 hours
      };
    }

    // For Supabase, create a new session
    const { data, error } = await supabase.auth.admin.createUser({
      id: userId
    });

    if (error) {
      throw error;
    }

    return {
      user: await getCurrentUser('') || { id: userId, email: '', name: '', plan: 'free', credits: 100 },
      expires_at: Date.now() + 1000 * 60 * 60 * 24
    };
  } catch (error) {
    console.error('Session creation failed:', error);
    return null;
  }
}

/**
 * Revoke session
 */
export async function revokeSession(sessionId: string): Promise<boolean> {
  try {
    if (AUTH_PROVIDER === 'clerk') {
      await clerkClient.sessions.revokeSession(sessionId);
      return true;
    } else {
      await supabase.auth.admin.signOutUser(sessionId);
      return true;
    }
  } catch (error) {
    console.error('Session revocation failed:', error);
    return false;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<User, 'name' | 'avatar_url'>>
): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapToUser(data);
  } catch (error) {
    console.error('Profile update failed:', error);
    return null;
  }
}

/**
 * Update user credits
 */
export async function updateUserCredits(
  userId: string,
  delta: number
): Promise<User | null> {
  try {
    const { data, error } = await supabase.rpc('update_user_credits', {
      p_user_id: userId,
      p_delta: delta
    });

    if (error) {
      throw error;
    }

    return mapToUser(data);
  } catch (error) {
    console.error('Credit update failed:', error);
    return null;
  }
}

/**
 * Check if user has sufficient credits
 */
export async function hasCredits(userId: string, amount: number): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    return (data?.credits || 0) >= amount;
  } catch (error) {
    console.error('Credit check failed:', error);
    return false;
  }
}

/**
 * Middleware helper for protecting API routes
 */
export function withAuth(handler: Function) {
  return async (req: Request, res: Response) => {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await getCurrentUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add user to request context
    (req as any).user = user;
    
    return handler(req, res);
  };
}

/**
 * Generate magic link for passwordless auth (Supabase only)
 */
export async function sendMagicLink(email: string, redirectUrl: string): Promise<boolean> {
  if (AUTH_PROVIDER !== 'supabase') {
    throw new Error('Magic links only supported with Supabase Auth');
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectUrl
      }
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Magic link failed:', error);
    return false;
  }
}

/**
 * OAuth sign in with provider
 */
export async function signInWithOAuth(
  provider: 'google' | 'apple' | 'github',
  redirectUrl: string
): Promise<{ url: string } | null> {
  try {
    if (AUTH_PROVIDER === 'clerk') {
      // Clerk handles OAuth internally
      const url = clerkClient.buildOAuthUrl({
        provider,
        redirectUrl
      });
      return { url };
    } else {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        throw error;
      }

      return { url: data.url };
    }
  } catch (error) {
    console.error('OAuth sign in failed:', error);
    return null;
  }
}
