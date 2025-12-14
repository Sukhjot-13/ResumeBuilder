'use server';

import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Get the authenticated user ID and role from cookies.
 * This is the SINGLE source of truth for server action authentication.
 * 
 * @returns {Promise<{userId: string|null, role: number|null}>}
 */
export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('accessToken')?.value;
  const refreshToken = cookieStore.get('refreshToken')?.value;

  try {
    const authResult = await verifyAuth(
      { accessToken, refreshToken },
      { ip: 'server-action', userAgent: 'server-action' }
    );

    if (!authResult.ok) {
      return { userId: null, role: null };
    }

    return { userId: authResult.userId, role: authResult.role };
  } catch (error) {
    logger.error('Authentication failed in server action', error);
    return { userId: null, role: null };
  }
}
