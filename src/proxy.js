
import { NextResponse } from 'next/server';
import { verifyAuthEdge } from '@/lib/auth-edge';
import { ROLES } from '@/lib/constants';

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Define routes that need authentication
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicApiRoute = pathname.startsWith('/api/auth') || pathname.startsWith('/api/webhooks');
  const isProtectedApiRoute = isApiRoute && !isPublicApiRoute;

  const isProtectedRoute = ['/dashboard', '/profile', '/onboarding', '/resume-history', '/checkout'].some(p => pathname.startsWith(p));
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/login';

  // If the route doesn't require auth, just continue
  if (!isProtectedApiRoute && !isProtectedRoute && !isAdminRoute && !isLoginPage) {
    return NextResponse.next();
  }

  // Extract tokens from cookies
  const accessToken = req.cookies.get('accessToken')?.value;
  const refreshToken = req.cookies.get('refreshToken')?.value;

  // Verify authentication (Edge safe)
  let authResult = await verifyAuthEdge({ accessToken });

  // If access token failed but we have a refresh token, try to rotate via API
  if (!authResult.ok && refreshToken) {
    try {
      // Call the verify-token API route to rotate tokens
      // We must use an absolute URL
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host');
      const res = await fetch(`${protocol}://${host}/api/auth/verify-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (res.ok) {
        const data = await res.json();
        authResult = { ok: true, userId: data.userId, role: data.role, newAccessToken: data.newAccessToken, newRefreshToken: data.newRefreshToken };
      }
    } catch (error) {
      console.error('Token rotation failed in proxy:', error);
    }
  }

  // Check for expired subscriptions (only for authenticated users)
  if (authResult.ok) {
    try {
      const protocol = req.headers.get('x-forwarded-proto') || 'http';
      const host = req.headers.get('host');
      const checkRes = await fetch(`${protocol}://${host}/api/auth/check-subscription`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': authResult.userId,
        },
      });
      
      if (checkRes.ok) {
        const data = await checkRes.json();
        // Update role if subscription was downgraded
        if (data.role !== undefined) {
          authResult.role = data.role;
        }
      }
    } catch (error) {
      console.error('Subscription check failed in proxy:', error);
    }
  }

  let response;

  if (authResult.ok) {
    // User is authenticated
    if (isLoginPage) {
      // Redirect authenticated users from login page to dashboard
      response = NextResponse.redirect(new URL('/dashboard', req.url));
    } else if (isAdminRoute && authResult.role !== ROLES.ADMIN) {
       // Protect admin routes
       response = NextResponse.redirect(new URL('/dashboard', req.url));
    } else if (isApiRoute) {
      // Add user ID to API request headers and continue
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-user-id', authResult.userId);
      response = NextResponse.next({ request: { headers: requestHeaders } });
    } else {
      // For protected routes, just continue
      response = NextResponse.next();
    }

    // Set new cookies if rotation happened
    if (authResult.newAccessToken && authResult.newRefreshToken) {
      const secure = process.env.NODE_ENV === 'production';
      response.cookies.set('accessToken', authResult.newAccessToken, { path: '/', maxAge: 5 * 60, httpOnly: true, secure, sameSite: 'lax' });
      response.cookies.set('refreshToken', authResult.newRefreshToken, { path: '/', maxAge: 15 * 24 * 60 * 60, httpOnly: true, secure, sameSite: 'lax' });
    }
  } else {
    // User is not authenticated
    if (isApiRoute) {
      // For API routes, return 401 Unauthorized
      response = new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    } else if (isProtectedRoute || isAdminRoute) {
      // For protected pages, redirect to login
      response = NextResponse.redirect(new URL('/login', req.url));
    } else {
      // For all other cases (e.g., login page), continue
      response = NextResponse.next();
    }
    
    // Clear cookies if they exist but failed
    if (accessToken || refreshToken) {
        response.cookies.delete('accessToken');
        response.cookies.delete('refreshToken');
    }
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*', '/profile/:path*', '/onboarding/:path*', '/admin/:path*', '/login', '/resume-history/:path*', '/checkout/:path*'],
};
