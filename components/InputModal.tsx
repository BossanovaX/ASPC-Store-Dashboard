'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // 📸 ตรวจสอบ Path ให้ชี้ไปที่ supabase client ชุดเดิมของคุณนะครับเพื่อน

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InputModal({ isOpen, onClose, onSuccess }: InputModalProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 📥 แหล่งเก็บข้อมูลฟอร์มลงทะเบียนรับของเข้าคลัง
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState(''); 
  const [productFile, setProductFile] = useState<File | null>(null); 
  const [receiptFile, setReceiptFile] = useState<File | null>(null); 
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState(''); 
  const [stock, setStock] = useState('1'); 
  const [category, setCategory] = useState('CPU');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setReceivedAt(now.toISOString().slice(0, 10)); 
    }
  }, [isOpen]);

  // 🛠️ ฟังก์ชันยิงรูปภาพเข้าถังเก็บของ Supabase Storage
  const uploadImageToStorage = async (file: File, folderName: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderName}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`อัปโหลดรูปภาพล้มเหลว: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      let finalImageUrl = 'https://picsum.photos/200'; // รูปภาพสำรองกรณีไม่เลือกไฟล์
      let receiptUrl = 'ไม่มีหลักฐานซื้อ';
      
      // 1. 📸 อัปโหลดรูปภาพสินค้าจริงเข้า Storage
      if (productFile) {
        setMessage('⏳ กำลังยิงไฟล์รูปภาพสินค้าเข้า Storage...');
        finalImageUrl = await uploadImageToStorage(productFile, 'items');
      }

      // 2. 🧾 อัปโหลดรูปสลิป/ใบเสร็จหลักฐานซื้อเข้า Storage
      if (receiptFile) {
        setMessage('⏳ กำลังยิงไฟล์รูปหลักฐานการซื้อเข้า Storage...');
        receiptUrl = await uploadImageToStorage(receiptFile, 'receipts');
      }

      const finalCost = parseFloat(cost) || 0;
      // มัดรวมข้อมูลวันที่รับเข้าและลิงก์ใบเสร็จลงใน Tag String สไตล์ระบบดั้งเดิมของคุณ
      const finalName = `${name} [รับเข้า: ${receivedAt} | หลักฐานซื้อ: ${receiptUrl}]`;

      setMessage('⏳ กำลังบันทึกข้อมูลสินค้าลง Database...');

      // 3. 🚀 ยิงข้อมูลที่ประกอบเสร็จแล้วไปที่ API เส้นหลักหลังบ้านของคุณ เพื่อให้บันทึกลง DB
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          cost: finalCost, 
          price: parseFloat(price) || 0,
          stock: parseFloat(stock) || 1,
          serial_number: serialNumber || '',
          category: category,
          image_url: finalImageUrl // ส่งลิงก์รูปภาพตัวหลักที่อัปโหลดเสร็จแล้วไปด้วย
        }),
      });

      if (!response.ok) {
        throw new Error("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์หลังบ้านในการบันทึกสต็อก");
      }

      // 🎉 ทำงานสำเร็จ ล้างค่าในฟอร์มและสั่งให้หน้าจอหลัก Refresh ข้อมูลทันที
      setMessage("🎉 บันทึกข้อมูลและจัดเก็บรูปภาพสินค้าสำเร็จ!");
      setName(''); 
      setSerialNumber(''); 
      setProductFile(null); 
      setReceiptFile(null); 
      setCost(''); 
      setPrice('');
      
      onSuccess(); // 🌟 จุดสำคัญ: ฟังก์ชันนี้จะสั่งให้หน้า page.tsx โหลดสินค้าเวอร์ชันล่าสุดจาก DB มาโชว์บนบอร์ดทันที
      setTimeout(() => { onClose(); setMessage(''); }, 1200);

    } catch (err: any) {
      setMessage("❌ ข้อผิดพลาด: " + err.message);
      console.error("Insert Error: ", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
        <h2 className="font-bold text-orange-400 text-base border-b border-slate-800 pb-2">📥 ลงทะเบียนสินค้าเข้าคลังใหม่</h2>
        {message && (
          <div className={`p-3 rounded-xl text-center text-xs font-bold ${message.includes('❌') ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-emerald-950 text-emerald-400 border border-emerald-800'}`}>
            {message}
          </div>
        )}
        <form onSubmit={handleReceiveSubmit} className="flex flex-col gap-3 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-bold">1. ชื่อสินค้า</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="เช่น Intel Core i5-14600K" />
          </div>
          <div>
            <label className="text-slate-400 block mb-1 font-bold">2. ซีเรียลนัมเบอร์ (S/N)</label>
            <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="ป้อนหมายเลขซีเรียล..." />
          </div>
          <div>
            <label className="text-slate-400 block mb-1 font-bold">3. ระบุวันที่รับของ</label>
            <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" />
          </div>
          
          <div>
            <label className="text-orange-400 block mb-1 font-bold">4. 📸 เลือกอัปโหลดไฟล์รูปภาพสินค้าจริง</label>
            <input type="file" accept="image/*" onChange={(e) => setProductFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
          </div>

          <div>
            <label className="text-orange-400 block mb-1 font-bold">5. 🧾 อัปโหลดรูปสลิปโอนเงิน / ใบเสร็จทุนแท้</label>
            <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-bold">6. ราคาทุนที่ได้มา (ทุนแท้เพียวๆ)</label>
              <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ต้นทุนราคาสินค้า" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">7. ประเภทสินค้า</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm">
                <option value="CPU">CPU</option><option value="GPU">GPU</option><option value="Memory">Memory</option><option value="Mainboard">Mainboard</option><option value="Storage">Storage</option><option value="Power Supply / Case">Power Supply / Case</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-bold">ราคาตั้งขายเบื้องต้น</label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ตั้งเป้าขาย" />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">จำนวนสินค้าเข้าคลัง</label>
              <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="จำนวนชิ้น" />
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl mt-2 text-sm">
            {loading ? '⏳ กำลังยิงระบบ...' : '🚀 บันทึกข้อมูลและรูปภาพเข้าสต็อก'}
          </button>
        </form>
      </div>
    </div>
  );
}