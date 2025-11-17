
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export async function proxy(req) {
  const { pathname } = req.nextUrl;

  // Define routes that need authentication
  const isApiRoute = pathname.startsWith('/api/user') || pathname.startsWith('/api/resumes') || pathname.startsWith('/api/edit-resume-with-ai');
  const isProtectedRoute = ['/dashboard', '/profile', '/onboarding'].some(p => pathname.startsWith(p));
  const isLoginPage = pathname === '/login';

  // If the route doesn't require auth, just continue
  if (!isApiRoute && !isProtectedRoute && !isLoginPage) {
    return NextResponse.next();
  }

  // Extract tokens from cookies
  const accessToken = req.cookies.get('accessToken')?.value;
  const refreshToken = req.cookies.get('refreshToken')?.value;
  
  // Get request info for logging
  const reqInfo = {
    ip: req.headers.get('x-forwarded-for') || req.ip,
    userAgent: req.headers.get('user-agent'),
  };

  // Verify authentication
  const authResult = await verifyAuth({ accessToken, refreshToken }, reqInfo);

  let response;

  if (authResult.ok) {
    // User is authenticated
    if (isLoginPage) {
      // Redirect authenticated users from login page to dashboard
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
  } else {
    // User is not authenticated
    if (isApiRoute) {
      // For API routes, return 401 Unauthorized
      response = new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    } else if (isProtectedRoute) {
      // For protected pages, redirect to login
      response = NextResponse.redirect(new URL('/login', req.url));
    } else {
      // For all other cases (e.g., login page), continue
      response = NextResponse.next();
    }
  }

  // --- Cookie Management ---

  // If token rotation happened, set new cookies
  if (authResult.newAccessToken && authResult.newRefreshToken) {
    const secure = process.env.NODE_ENV === 'production';
    response.cookies.set('accessToken', authResult.newAccessToken, { path: '/', maxAge: 5 * 60, httpOnly: true, secure, sameSite: 'lax' });
    response.cookies.set('refreshToken', authResult.newRefreshToken, { path: '/', maxAge: 15 * 24 * 60 * 60, httpOnly: true, secure, sameSite: 'lax' });
  }

  // If refresh token failed, clear cookies
  if (authResult.clearCookies) {
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
  }

  return response;
}

export const config = {
  matcher: ['/api/user/:path*', '/api/resumes/:path*', '/api/edit-resume-with-ai/:path*', '/dashboard/:path*', '/profile/:path*', '/onboarding/:path*', '/login'],
};
