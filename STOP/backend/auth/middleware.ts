/**
 * AURA Auth Middleware
 * Protect API routes with authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, verifyToken } from '../auth/authService';
import { UserModel } from '../db/models';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    plan: string;
    credits: number;
  };
  token: string;
}

/**
 * Middleware to protect API routes
 */
export async function withAuth(
  handler: (req: NextRequest, context: AuthContext) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No authentication token provided' },
          { status: 401 }
        );
      }

      // Verify token
      const tokenData = await verifyToken(token);
      
      if (!tokenData) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Get user from database
      const user = await UserModel.findById(tokenData.userId);

      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'User not found' },
          { status: 401 }
        );
      }

      // Create context
      const context: AuthContext = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          plan: user.plan,
          credits: user.credits
        },
        token
      };

      // Call handler with context
      return handler(req, context);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Optional auth - adds user to context if authenticated, but doesn't require it
 */
export async function withOptionalAuth(
  handler: (req: NextRequest, context: AuthContext | null) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (!token) {
        return handler(req, null);
      }

      const tokenData = await verifyToken(token);
      
      if (!tokenData) {
        return handler(req, null);
      }

      const user = await UserModel.findById(tokenData.userId);

      if (!user) {
        return handler(req, null);
      }

      const context: AuthContext = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          plan: user.plan,
          credits: user.credits
        },
        token
      };

      return handler(req, context);
    } catch (error) {
      console.error('Optional auth middleware error:', error);
      return handler(req, null);
    }
  };
}

/**
 * Check if user has required plan level
 */
export function requirePlan(requiredPlans: string[]) {
  return (req: NextRequest, context: AuthContext): NextResponse | null => {
    if (!requiredPlans.includes(context.user.plan)) {
      return NextResponse.json(
        { 
          error: 'Forbidden', 
          message: `This feature requires a ${requiredPlans.join(' or ')} plan`,
          upgrade_url: '/settings/billing'
        },
        { status: 403 }
      );
    }
    return null;
  };
}

/**
 * Check if user has sufficient credits
 */
export function requireCredits(requiredCredits: number) {
  return (req: NextRequest, context: AuthContext): NextResponse | null => {
    if (context.user.credits < requiredCredits) {
      return NextResponse.json(
        { 
          error: 'Insufficient Credits', 
          message: `This action requires ${requiredCredits} credits. You have ${context.user.credits} credits.`,
          credits_needed: requiredCredits - context.user.credits
        },
        { status: 402 }
      );
    }
    return null;
  };
}

/**
 * Rate limiting helper
 */
export function rateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: NextRequest, context: AuthContext): NextResponse | null => {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    
    const userRequests = requests.get(ip);

    if (!userRequests || now > userRequests.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (userRequests.count >= maxRequests) {
      return NextResponse.json(
        { 
          error: 'Too Many Requests', 
          message: 'Rate limit exceeded. Please try again later.',
          retry_after: Math.ceil((userRequests.resetTime - now) / 1000)
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((userRequests.resetTime - now) / 1000))
          }
        }
      );
    }

    userRequests.count++;
    return null;
  };
}

/**
 * Combined middleware builder
 */
export function createMiddleware(
  ...middlewares: Array<(req: NextRequest, context: AuthContext) => NextResponse | null>
) {
  return (req: NextRequest, context: AuthContext): NextResponse | null => {
    for (const middleware of middlewares) {
      const response = middleware(req, context);
      if (response) {
        return response;
      }
    }
    return null;
  };
}
