import { NextResponse } from 'next/server';
import { resolveUserId } from '@/lib/apiKeyAuth';
import { requirePermission, isPermissionError } from '@/lib/apiPermissionGuard';
import { PERMISSIONS } from '@/lib/constants';
import dbConnect from '@/lib/mongodb';

const workerUrl = process.env.WORKER_URL || 'http://localhost:3001';

export async function POST(request) {
  try {
    const { userId, error } = await resolveUserId(request);
    if (error) return error;

    await dbConnect();
    const permResult = await requirePermission(userId, PERMISSIONS.VIEW_AUTOMATION);
    if (isPermissionError(permResult)) return permResult.error;

    const res = await fetch(`${workerUrl}/trigger/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Worker responded ${res.status}: ${text}` }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: `Failed to reach worker: ${err.message}` }, { status: 502 });
  }
}
