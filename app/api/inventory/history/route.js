import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId') || searchParams.get('item_id') || undefined;
    const type = searchParams.get('type') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const movements = await inventoryService.getMovements({ itemId, type, from, to, limit, offset });
    return NextResponse.json({ movements });
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory history' }, { status: 500 });
  }
}