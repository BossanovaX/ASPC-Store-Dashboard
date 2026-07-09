import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // บังคับส่งเฉพาะ 7 คอลัมน์ที่มีอยู่จริงบนหน้าเว็บ Supabase ของคุณเป๊ะๆ ห้ามมีส่วนเกิน
    const { data, error } = await supabase.from('products').insert([
      {
        name: body.name,
        cost: body.cost,
        price: body.price,
        stock: body.stock,
        serial_number: body.serial_number,
        category: body.category,
        image_url: body.image_url
      }
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 2. ท่อดึงรายการสินค้ามาแสดงบนหน้า Monitor (GET)
export async function GET() {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 3. ท่อสั่งลบสินค้าออกจากคลัง (DELETE)
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