import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
  // Extract cookies (HttpOnly) from the request
  const accessToken = req.cookies.get('accessToken')?.value;
  const refreshToken = req.cookies.get('refreshToken')?.value;

  // Optional request info for logging (same as proxy)
  const reqInfo = {
    ip: req.headers.get('x-forwarded-for') || req.ip,
    userAgent: req.headers.get('user-agent'),
  };

  const authResult = await verifyAuth({ accessToken, refreshToken }, reqInfo);

  if (authResult.ok) {
    // Return minimal user info – you can extend as needed
    const user = {
      id: authResult.userId,
      email: authResult.email,
      name: authResult.name,
    };
    return new Response(JSON.stringify({ ok: true, user }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: false }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
