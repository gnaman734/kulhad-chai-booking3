import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET(_request, { params }) {
  try {
    const mapping = await inventoryService.getMenuMappingById(params.id);
    if (!mapping) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ mapping });
  } catch (error) {
    console.error('Error fetching mapping:', error);
    return NextResponse.json({ error: 'Failed to fetch mapping' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const updates = {
      menuItemId: body.menuItemId ?? body.menu_item_id,
      inventoryItemId: body.inventoryItemId ?? body.inventory_item_id,
      unitsPerItem: body.unitsPerItem ?? body.units_per_item
    };
    const mapping = await inventoryService.updateMenuMapping(params.id, updates);
    return NextResponse.json({ mapping });
  } catch (error) {
    console.error('Error updating mapping:', error);
    return NextResponse.json({ error: 'Failed to update mapping' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    await inventoryService.deleteMenuMapping(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    return NextResponse.json({ error: 'Failed to delete mapping' }, { status: 500 });
  }
}