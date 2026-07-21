import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';


export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 1. ดึงค่าจากหน้าบ้าน
    const { 
      name, cost, price, stock, serial_number, category, image_url,
      is_sold, received_at, buy_receipt_url,
      sold_at, sold_price, shipping_fee, commission_fee,
      sale_proof_url, shipping_slip_url, package_image_url
    } = body;

    // 2. จัดระเบียบข้อมูลและเคลียร์ประเภทข้อมูลดักไว้ก่อนบันทึก
    const insertData = {
      name: name || 'ไม่มีชื่อสินค้า',
      cost: cost ? parseFloat(cost) : 0,
      price: price ? parseFloat(price) : 0,
      stock: stock ? parseInt(stock) : 1,
      serial_number: serial_number || '',
      category: category || 'CPU',
      image_url: image_url || '',
      is_sold: is_sold === true || is_sold === 'true',
      
      // 💡 🎯 แก้จุดนี้: บังคับใส่วันที่ ถ้าไม่มีส่งมาให้ใช้เวลาปัจจุบันทันที (ป้องกัน NULL ลง DB)
      received_at: received_at && received_at.trim() !== '' ? received_at : new Date().toISOString(),
      buy_receipt_url: buy_receipt_url && buy_receipt_url.trim() !== '' ? buy_receipt_url : null,
      
      sold_at: sold_at && sold_at.trim() !== '' ? sold_at : null,
      sold_price: sold_price && sold_price !== '' ? parseFloat(sold_price) : null,
      shipping_fee: shipping_fee && shipping_fee !== '' ? parseFloat(shipping_fee) : null,
      commission_fee: commission_fee && commission_fee !== '' ? parseFloat(commission_fee) : null,
      
      sale_proof_url: sale_proof_url && sale_proof_url.trim() !== '' ? sale_proof_url : null,
      shipping_slip_url: shipping_slip_url && shipping_slip_url.trim() !== '' ? shipping_slip_url : null,
      package_image_url: package_image_url && package_image_url.trim() !== '' ? package_image_url : null,
    };

    // 3. ปรับโครงสร้างคำสั่งยิงเข้า Supabase แบบล้าง Array ซ้อนครอบส่งตรง (เสถียรที่สุด)
    const { data, error } = await supabase
      .from('products')
      .insert(insertData); // 👈 ตัดการต่อท้ายด้วย .select() ออกชั่วคราว เพื่อเลี่ยงปัญหารีเซ็ต Schema Cache หน้าบ้าน

    if (error) {
      console.error("Supabase Database Insert Error:", error.message);
      throw new Error(error.message);
    }
    
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error("API Error 500 Details:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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