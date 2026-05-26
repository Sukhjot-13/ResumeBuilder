import { NextResponse } from 'next/server';

const workerUrl = process.env.WORKER_URL || 'http://localhost:3001';

export async function POST() {
  try {
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
