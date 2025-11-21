import { verifyAuth } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import Resume from '@/models/resume';

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
    await dbConnect();
    
    // Fetch user with populated mainResume
    const user = await User.findById(authResult.userId).populate('mainResume');
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      id: user._id,
      email: user.email,
      name: user.name,
      dateOfBirth: user.dateOfBirth,
      mainResume: user.mainResume,
      creditsUsed: user.creditsUsed || 0,
      role: user.role,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: false }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function PUT(req) {
  // Extract cookies (HttpOnly) from the request
  const accessToken = req.cookies.get('accessToken')?.value;
  const refreshToken = req.cookies.get('refreshToken')?.value;

  // Optional request info for logging
  const reqInfo = {
    ip: req.headers.get('x-forwarded-for') || req.ip,
    userAgent: req.headers.get('user-agent'),
  };

  const authResult = await verifyAuth({ accessToken, refreshToken }, reqInfo);

  if (!authResult.ok) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await dbConnect();
    
    const body = await req.json();
    const { mainResume, name, dateOfBirth } = body;

    const user = await User.findById(authResult.userId);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle mainResume update
    if (mainResume) {
      // Create a new Resume document
      const newResume = new Resume({
        userId: user._id,
        content: mainResume,
      });
      await newResume.save();

      // Update user's mainResume reference
      user.mainResume = newResume._id;
    }

    // Handle profile updates
    if (name !== undefined) {
      user.name = name;
    }
    if (dateOfBirth !== undefined) {
      user.dateOfBirth = dateOfBirth;
    }

    await user.save();

    // Fetch updated user with populated mainResume
    const updatedUser = await User.findById(user._id).populate('mainResume');

    return new Response(JSON.stringify({
      id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      dateOfBirth: updatedUser.dateOfBirth,
      mainResume: updatedUser.mainResume,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
