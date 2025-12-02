import { NextResponse } from 'next/server';
import { ordersService, tablesService, menuSyncService } from '@/lib/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const { tableNumber, items, customerName, customerPhone, totalAmount } = body;

    // Validate table
    const tables = await tablesService.getAll();
    const table = tables.find(t => t.number === parseInt(tableNumber));

    if (!table) {
      return NextResponse.json(
        { error: `Table ${tableNumber} not found` },
        { status: 404 }
      );
    }

    // Ensure menu mapping is initialized
    await menuSyncService.initializeMapping();

    // Map frontend menu item IDs to database UUIDs
    const mappedItems = await Promise.all(items.map(async item => {
      // Check if it's already a UUID format
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(item.menuItemId)) {
        return item; // Already a UUID
      }

      // Get database UUID from frontend ID
      const dbId = await menuSyncService.getDbId(item.menuItemId);
      if (!dbId) {
        throw new Error(`Menu item not found in database: ${item.menuItemId}`);
      }
      return {
        ...item,
        menuItemId: dbId
      };
    }));

    const orderData = {
      tableId: table.id,
      status: 'pending',
      totalAmount,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      items: mappedItems
    };

    // Create order in Supabase
    const newOrder = await ordersService.create(orderData);

    return NextResponse.json(newOrder);
  } catch (error) {
    console.error('Error processing order:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process order' },
      { status: 500 }
    );
  }
}
