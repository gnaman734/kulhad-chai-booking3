import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET() {
  try {
    const summary = await inventoryService.getStockSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error fetching stock summary:', error);
    return NextResponse.json({ error: 'Failed to fetch stock summary' }, { status: 500 });
  }
}