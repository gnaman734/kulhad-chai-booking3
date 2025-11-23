import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET(_, { params }) {
  try {
    const item = await inventoryService.getById(params.id);
    if (!item) {
      return NextResponse.json({ error: 'Inventory item not found' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory item' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const updates = {
      sku: body.sku ?? body.SKU ?? undefined,
      name: body.name ?? body.item_name ?? undefined,
      category: body.category ?? body.item_category ?? undefined,
      unit: body.unit ?? body.item_unit ?? undefined,
      reorderThreshold: body.reorderThreshold ?? body.reorder_threshold,
      reorderQuantity: body.reorderQuantity ?? body.reorder_quantity,
      quantityOnHand: body.quantityOnHand ?? body.quantity_on_hand,
      isActive: body.isActive ?? body.is_active
    };
    const item = await inventoryService.update(params.id, updates);
    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return NextResponse.json({ error: 'Failed to update inventory item' }, { status: 500 });
  }
}

export async function DELETE(_, { params }) {
  try {
    const res = await inventoryService.softDelete(params.id);
    return NextResponse.json({ success: true, result: res });
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    return NextResponse.json({ error: 'Failed to delete inventory item' }, { status: 500 });
  }
}