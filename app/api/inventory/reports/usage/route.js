import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const usage = await inventoryService.getUsageReport({ from, to });
    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Error fetching usage report:', error);
    return NextResponse.json({ error: 'Failed to fetch usage report' }, { status: 500 });
  }
}