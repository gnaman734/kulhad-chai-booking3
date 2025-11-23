import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const menuItemId = searchParams.get('menuItemId') || searchParams.get('menu_item_id') || undefined;
    const inventoryItemId = searchParams.get('inventoryItemId') || searchParams.get('inventory_item_id') || undefined;
    const mappings = await inventoryService.getMenuMappings({ menuItemId, inventoryItemId });
    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error fetching mappings:', error);
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const menuItemId = body.menuItemId || body.menu_item_id;
    const inventoryItemId = body.inventoryItemId || body.inventory_item_id;
    const unitsPerItem = body.unitsPerItem || body.units_per_item || 1;
    if (!menuItemId || !inventoryItemId) {
      return NextResponse.json({ error: 'menuItemId and inventoryItemId are required' }, { status: 400 });
    }
    const mapping = await inventoryService.createMenuMapping({ menuItemId, inventoryItemId, unitsPerItem });
    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    console.error('Error creating mapping:', error);
    return NextResponse.json({ error: 'Failed to create mapping' }, { status: 500 });
  }
}