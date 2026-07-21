'use client';

import { useState, useEffect } from 'react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProduct: any;
  onSubmit: (formData: {
    editName: string;
    editSerialNumber: string;
    editCost: string;
    editPrice: string;
    editCategory: string;
    editStock: string;
    editShippingFee: string;
    editProductFile: File | null;
    editReceiptFile: File | null;
    editSaleProofFile: File | null;
    editSlipFile: File | null;
    editPackageFile: File | null;
  }) => Promise<void>;
  isPending: boolean;
}

export default function EditModal({ isOpen, onClose, editingProduct, onSubmit, isPending }: EditModalProps) {
  const [editName, setEditName] = useState('');
  const [editSerialNumber, setEditSerialNumber] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('CPU');
  const [editStock, setEditStock] = useState('1');
  const [editShippingFee, setEditShippingFee] = useState('');
  const [editProductFile, setEditProductFile] = useState<File | null>(null);
  const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null);
  const [editSaleProofFile, setEditSaleProofFile] = useState<File | null>(null);
  const [editSlipFile, setEditSlipFile] = useState<File | null>(null);
  const [editPackageFile, setEditPackageFile] = useState<File | null>(null);

  useEffect(() => {
    if (editingProduct) {
      setEditName(editingProduct.name.split(' [')[0]);
      setEditSerialNumber(editingProduct.serial_number || '');
      setEditCost(editingProduct.cost?.toString() || '0');
      setEditPrice((editingProduct.sold_price ?? editingProduct.price)?.toString() || '0');
      setEditCategory(editingProduct.category || 'CPU');
      setEditStock(editingProduct.stock?.toString() || '1');
      setEditShippingFee(editingProduct.shipping_fee?.toString() || '0');
    }
  }, [editingProduct]);

  if (!isOpen || !editingProduct) return null;

  const isSold = editingProduct.is_sold === true || editingProduct.name.includes('ขายแล้ว');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      editName, editSerialNumber, editCost, editPrice, editCategory, editStock, editShippingFee,
      editProductFile, editReceiptFile, editSaleProofFile, editSlipFile, editPackageFile
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print font-sans">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md max-h-[90vh] overflow-y-auto relative no-scrollbar font-sans animate-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
        <h2 className="font-bold text-amber-500 text-base border-b border-slate-800 pb-2 font-sans">📝 โหมดแก้ไขและเพิ่มหลักฐานรูปภาพย้อนหลัง</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs font-sans">
          <div><label className="text-slate-400 block mb-1 font-bold">แก้ไขชื่อสินค้า</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:border-amber-500 focus:outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-slate-400 block mb-1 font-bold">แก้ไข S/N</label><input type="text" value={editSerialNumber} onChange={(e) => setEditSerialNumber(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm focus:border-amber-500 focus:outline-none" /></div>
            <div>
              <label className="text-slate-400 block mb-1 font-bold">แก้ไขหมวดหมู่</label>
              <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:border-amber-500 focus:outline-none">
                <option value="CPU">CPU</option><option value="GPU">GPU</option><option value="Memory">Memory</option><option value="Mainboard">Mainboard</option><option value="Storage">Storage</option><option value="Power Supply">Power Supply</option><option value="Case">Case</option><option value="Cooler">Cooler</option><option value="Monitor">Monitor</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-slate-400 block mb-1 font-bold">ราคาทุนสินค้า (บาท)</label><input type="number" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" /></div>
            <div><label className="text-slate-400 block mb-1 font-bold">{isSold ? 'ราคาที่ปิดยอดขาย (บาท)' : 'ราคาตั้งขายสินค้า (บาท)'}</label><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" /></div>
          </div>
          {!isSold && <div><label className="text-slate-400 block mb-1 font-bold">จำนวนสินค้าคงเหลือในคลัง</label><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" /></div>}
          {isSold && <div><label className="text-orange-400 block mb-1 font-bold">🚚 แก้ไขยอดค่าจัดส่งขนส่งจริง (บาท)</label><input type="number" step="0.01" value={editShippingFee} onChange={(e) => setEditShippingFee(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm font-mono focus:border-orange-500 focus:outline-none" /></div>}
          
          <div className="border-t border-slate-800 pt-3 mt-1 flex flex-col gap-2.5">
            <span className="text-amber-500 font-bold block text-[11px]">📸 อัปโหลดเปลี่ยนรูปภาพ / เพิ่มรูปภาพทีหลัง:</span>
            {!isSold ? (
              <>
                <div><label className="text-slate-400 block mb-1 text-[11px]">เปลี่ยนรูปภาพสินค้าจริง:</label><input type="file" accept="image/*" onChange={(e) => setEditProductFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs" /></div>
                <div><label className="text-slate-400 block mb-1 text-[11px]">เปลี่ยนรูปสลิปหลักฐานซื้อ (ทุนแท้):</label><input type="file" accept="image/*" onChange={(e) => setEditReceiptFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs" /></div>
              </>
            ) : (
              <>
                <div><label className="text-emerald-400 block mb-1 text-[11px]">เปลี่ยนรูปภาพสลิปหลักฐานขายลูกค้า:</label><input type="file" accept="image/*" onChange={(e) => setEditSaleProofFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs" /></div>
                <div><label className="text-slate-400 block mb-1 text-[11px]">เพิ่ม/เปลี่ยน รูปภาพสลิปค่าจัดส่ง:</label><input type="file" accept="image/*" onChange={(e) => setEditSlipFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs" /></div>
                <div><label className="text-slate-400 block mb-1 text-[11px]">เพิ่ม/เปลี่ยน รูปถ่ายสินค้าตอนแพ็กของ:</label><input type="file" accept="image/*" onChange={(e) => setEditPackageFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs" /></div>
              </>
            )}
          </div>

          <button type="submit" disabled={isPending} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-2 text-sm font-sans transition-colors cursor-pointer">{isPending ? '⏳ กำลังบันทึก...' : '✅ ยืนยันแก้ไข'}</button>
        </form>
      </div>
    </div>
  );
}
