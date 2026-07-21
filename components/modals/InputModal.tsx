'use client';

import { useState, useEffect } from 'react';

interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    serialNumber: string;
    receivedAt: string;
    productFile: File;
    receiptFile: File;
    cost: string;
    price: string;
    stock: string;
    category: string;
  }) => Promise<void>;
  isPending: boolean;
  message: string;
}

export default function InputModal({ isOpen, onClose, onSubmit, isPending, message }: InputModalProps) {
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productFile || !receiptFile) {
      alert("❌ กรุณาอัปโหลดรูปภาพสินค้าจริง และ สลิปหลักฐานการซื้อให้ครบถ้วน!");
      return;
    }
    await onSubmit({ name, serialNumber, receivedAt, productFile, receiptFile, cost, price, stock, category });
    setName(''); setSerialNumber(''); setProductFile(null); setReceiptFile(null); setCost(''); setPrice('');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
        <h2 className="font-bold text-orange-400 text-base border-b border-slate-800 pb-2">📥 ลงทะเบียนสินค้าเข้าคลังใหม่</h2>
        {message && <div className="p-3 rounded-xl text-center text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">{message}</div>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
          <div><label className="text-slate-400 block mb-1 font-bold">1. ชื่อสินค้า *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="เช่น Intel Core i5-14600K" /></div>
          <div><label className="text-slate-400 block mb-1 font-bold">2. ซีเรียลนัมเบอร์ (S/N) *</label><input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="ป้อนหมายเลขซีเรียล..." /></div>
          <div><label className="text-slate-400 block mb-1 font-bold">3. ระบุวันที่รับของ *</label><input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" /></div>
          <div><label className="text-orange-400 block mb-1 font-bold">4. 📸 เลือกอัปโหลดไฟล์รูปภาพสินค้าจริง *</label><input type="file" accept="image/*" onChange={(e) => setProductFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
          <div><label className="text-orange-400 block mb-1 font-bold">5. 🧾 อัปโหลดรูปสลิปโอนเงิน / ใบเสร็จหลักฐานการซื้อ *</label><input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-slate-400 block mb-1 font-bold">6. ราคาทุนที่ได้มา *</label><input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ต้นทุนราคาสินค้า" /></div>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">7. ประเภทสินค้า *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm">
                <option value="CPU">CPU</option><option value="GPU">GPU</option><option value="Memory">Memory</option><option value="Mainboard">Mainboard</option><option value="Storage">Storage</option><option value="Power Supply">Power Supply</option><option value="Case">Case</option><option value="Cooler">Cooler</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-slate-400 block mb-1 font-bold">ราคาตั้งขายเบื้องต้น *</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ตั้งเป้าขาย" /></div>
            <div><label className="text-slate-400 block mb-1 font-bold">จำนวนสินค้าเข้าคลัง *</label><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="จำนวนชิ้น" /></div>
          </div>
          <button type="submit" disabled={isPending} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl mt-2 text-sm cursor-pointer">{isPending ? '⏳ กำลังยิงไฟล์เข้าระบบ...' : '🚀 บันทึกข้อมูลและรูปภาพเข้าสต็อก'}</button>
        </form>
      </div>
    </div>
  );
}