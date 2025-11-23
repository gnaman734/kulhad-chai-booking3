import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET() {
  try {
    const items = await inventoryService.getLowStockReport();
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching low stock report:', error);
    return NextResponse.json({ error: 'Failed to fetch low stock report' }, { status: 500 });
  }
}