import { NextResponse } from 'next/server';
import { inventoryService } from '@/lib/database';

export async function GET() {
  try {
    const alerts = await inventoryService.getAlerts({ onlyOpen: true });
    return NextResponse.json({ alerts });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const alertId = body.alertId || body.id;
    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }
    const res = await inventoryService.acknowledgeAlert(alertId);
    return NextResponse.json({ success: true, result: res });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}