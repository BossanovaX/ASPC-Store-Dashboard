import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, error } = await supabase.from('products').insert([
      {
        name: body.name,
        cost: body.cost,
        price: body.price,
        stock: body.stock,
        serial_number: body.serial_number,
        category: body.category,
        image_url: body.image_url,
        received_at: body.received_at,
        is_sold: body.is_sold ?? false,
        sold_price: body.sold_price ?? null,
        commission_fee: body.commission_fee ?? null,
        sold_at: body.sold_at ?? null,
      }
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { name } = await request.json();
    const { data, error } = await supabase.from('products').delete().eq('name', name);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}