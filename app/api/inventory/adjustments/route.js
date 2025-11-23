import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const itemId = body.itemId || body.item_id;
    const delta = body.delta ?? body.quantity_change;
    const type = body.type || 'adjustment';
    const sourceType = body.sourceType || body.source_type;
    const sourceId = body.sourceId || body.source_id;
    const notes = body.notes;

    if (!itemId || typeof delta !== 'number' || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, delta, type' },
        { status: 400 }
      );
    }

    const movement = await inventoryService.adjustStock({
      itemId,
      delta,
      type,
      sourceType,
      sourceId,
      notes
    });

    return NextResponse.json({ success: true, movement }, { status: 201 });
  } catch (error) {
    console.error('Error applying stock adjustment:', error);
    const msg = error?.message?.includes('cannot be negative')
      ? 'Adjustment would result in negative stock'
      : 'Failed to apply stock adjustment';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}