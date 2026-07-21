'use client';

import { useState, useEffect } from 'react';

interface SellModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: any;
  onSubmit: (formData: {
    soldPrice: string;
    shippingFee: string;
    soldAt: string;
    saleProofFile: File;
    slipFile: File | null;
    packageFile: File | null;
  }) => Promise<void>;
  isPending: boolean;
  successMessage: string;
}

export default function SellModal({ isOpen, onClose, selectedProduct, onSubmit, isPending, successMessage }: SellModalProps) {
  const [soldPrice, setSoldPrice] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [soldAt, setSoldAt] = useState('');
  const [saleProofFile, setSaleProofFile] = useState<File | null>(null);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [packageFile, setPackageFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSoldAt(now.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  if (!isOpen || !selectedProduct) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleProofFile) { alert("❌ บังคับอัปโหลดหลักฐานซื้อขาย!"); return; }
    await onSubmit({ soldPrice, shippingFee, soldAt, saleProofFile, slipFile, packageFile });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
        <h2 className="font-bold text-emerald-400 text-base border-b border-slate-800 pb-2">💰 บันทึกยอดขายและสรุปหลักฐานข้อมูล</h2>
        {successMessage ? (
          <div className="p-4 rounded-xl text-center text-sm font-bold bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 my-4 animate-pulse">{successMessage}</div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
            <div><label className="text-xs font-bold text-slate-400 block mb-1">1. ใส่ราคาขายจริงที่ปิดยอดได้ *</label><input type="number" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-base font-bold focus:border-emerald-500 focus:outline-none" placeholder="฿ ยอดขายปิดดีล..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-bold text-slate-400 block mb-1">➕ ระบุค่าส่งจริง</label><input type="number" step="0.01" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" placeholder="฿ เช่น 40, 50" /></div>
              <div><label className="text-xs font-bold text-slate-400 block mb-1">🕒 ขายเมื่อไหร่</label><input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" /></div>
            </div>
            <div><label className="text-emerald-400 font-bold block mb-1">🧾 อัปโหลดหลักฐานซื้อขาย / สลิปโอนเงิน *</label><input type="file" accept="image/*" onChange={(e) => setSaleProofFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
            <div><label className="text-slate-400 font-bold block mb-1">🚚 อัปโหลดสลิปค่าส่ง (ถ้ามี)</label><input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
            <div><label className="text-slate-400 font-bold block mb-1">📸 อัปโหลดรูปแพ็กของ (ถ้ามี)</label><input type="file" accept="image/*" onChange={(e) => setPackageFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
            <button type="submit" disabled={isPending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-1 text-sm cursor-pointer">✅ ยืนยันปิดดีล</button>
          </form>
        )}
      </div>
    </div>
  );
}
