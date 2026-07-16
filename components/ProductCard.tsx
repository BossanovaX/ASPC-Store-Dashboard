'use client';

import React from 'react';

interface Product {
  name: string;
  cost: number;
  price: number;
  stock: number;
  serial_number: string;
  category: string;
  image_url: string;
}

interface ProductCardProps {
  item: Product;
  onEdit: (item: Product) => void;
  onSell: (item: Product) => void;
  onDelete: (name: string) => void;
  onPreviewImage?: (url: string) => void; // 🔥 เพิ่ม Props สำหรับส่ง URL รูปไปขยาย
}

export default function ProductCard({ item, onEdit, onSell, onDelete, onPreviewImage }: ProductCardProps) {
  const isSold = item.name.includes('ขายแล้ว');
  const cost = item.cost || 0;
  
  const matchBuyReceipt = item.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
  const buyReceiptUrl = matchBuyReceipt ? matchBuyReceipt[1] : '';

  const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
  const matchComm = item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/);
  const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
  const matchProof = item.name.match(/สลิปส่ง: ([^\s|]+)/);
  const matchPkg = item.name.match(/ภาพส่ง: ([^\s|]+)/);
  const matchTime = item.name.match(/เมื่อ: ([\d-]+)/);
  const matchSaleProof = item.name.match(/หลักฐานขาย: ([^\s|]+)/);

  const sellPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
  const shipFee = matchShip ? parseFloat(matchShip[1]) : 0;
  const proofUrl = matchProof ? matchProof[1] : '';
  const pkgUrl = matchPkg ? matchPkg[1] : '';
  const sellDate = matchTime ? matchTime[1] : 'ไม่ระบุ';
  const saleProofUrl = matchSaleProof ? matchSaleProof[1] : '';
  const cleanName = item.name.split(' [')[0];
  
  const baseProfit = sellPrice - cost - 30 - shipFee;
  const commission = matchComm ? parseFloat(matchComm[1]) : (baseProfit > 0 ? baseProfit * 0.03 : 0);
  const itemNetProfit = baseProfit - commission;

  return (
    <div className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all shadow-md ${isSold ? 'bg-[#141b2b]/30 border-slate-900/60 opacity-80' : 'bg-[#111827] border-slate-800 hover:border-slate-700'}`}>
      <div className="flex items-start gap-3 min-w-0">
        {item.image_url && item.image_url.startsWith('http') ? (
          // 🔥 กดที่รูปสินค้าก็ขยายได้เหมือนกัน
          <img src={item.image_url} alt="รูปสินค้า" onClick={() => onPreviewImage && onPreviewImage(item.image_url)} className="w-16 h-16 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-800 cursor-pointer hover:opacity-80 transition-opacity" />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-slate-800 text-[10px] text-slate-500 flex items-center justify-center text-center p-1 border border-slate-800 shrink-0 font-bold break-all">📦 ไม่มีรูป</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex justify-between items-center gap-2">
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold uppercase">{item.category}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSold ? 'bg-rose-950/60 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>{isSold ? '🔴 จำหน่ายแล้ว' : `🟢 สต็อก (${item.stock} ชิ้น)`}</span>
          </div>
          <h4 className="font-bold text-white text-sm mt-2 leading-snug break-words">{cleanName}</h4>
          <p className="text-[11px] text-slate-400 mt-1 font-mono">S/N: <span className="text-orange-400 font-bold">{item.serial_number || 'ไม่มีรหัส'}</span></p>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2 bg-[#141b2b] -mx-4 -mb-4 p-4 rounded-b-xl text-xs">
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-slate-400">💵 ต้นทุนรับเข้าสินค้า (ทุนแท้):</span>
            <span className="text-slate-200 font-bold">฿{cost.toLocaleString()}</span>
          </div>
          {buyReceiptUrl && buyReceiptUrl.startsWith('http') && (
            <div className="flex justify-between text-[11px] items-center mt-0.5 border-b border-dashed border-slate-800/60 pb-1.5">
              <span className="text-slate-500">🧾 หลักฐานสลิปทุนซื้อ:</span>
              <button type="button" onClick={() => onPreviewImage && onPreviewImage(buyReceiptUrl)} className="text-orange-400 underline font-semibold hover:text-orange-300 cursor-pointer">🔗 ดูรูปสลิปตอนซื้อ</button>
            </div>
          )}
        </div>

        {isSold ? (
          <div className="flex flex-col gap-1.5 bg-[#0f172a]/60 p-2.5 rounded-lg border border-slate-900 mt-1">
            <div className="flex justify-between">
              <span className="text-slate-400">💰 ราคาที่ขายได้:</span>
              <span className="text-emerald-400 font-black">฿{sellPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>📦 ค่าแพ็กกล่องบรรจุภัณฑ์:</span>
              <span>฿30</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">📦 ค่าจัดส่งจริง:</span>
              <span className="text-rose-400">฿{shipFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] border-t border-dashed border-slate-800 pt-1">
              <span className="text-slate-500">📊 กำไรก่อนหักนายหน้า:</span>
              <span className="text-slate-300">฿{baseProfit.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-amber-500 font-medium">✂️ หักนายหน้า 3% จากกำไร:</span>
              <span className="text-amber-500 font-bold">฿{commission.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>
            
            <div className="flex justify-between text-[12px] border-t border-solid border-slate-700 pt-1.5 mt-1 bg-orange-950/30 -mx-2.5 px-2.5 py-1 rounded">
              <span className="text-orange-400 font-extrabold">🔥 กำไรสุทธิส่วนของคุณ (NET PROFIT):</span>
              <span className="text-orange-400 font-black">฿{itemNetProfit.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>

            {saleProofUrl && saleProofUrl.startsWith('http') && (
              <div className="flex justify-between text-[11px] items-center mt-1 pt-1 border-t border-slate-800/40">
                <span className="text-emerald-400 font-semibold">🧾 หลักฐานการซื้อขาย/โอนเงิน:</span>
                <button type="button" onClick={() => onPreviewImage && onPreviewImage(saleProofUrl)} className="text-emerald-400 underline font-semibold hover:text-emerald-300 cursor-pointer">🔗 ดูรูปสลิปซื้อขาย</button>
              </div>
            )}
            {proofUrl && proofUrl.startsWith('http') && (
              <div className="flex justify-between text-[11px] items-center mt-0.5">
                <span className="text-slate-500">🧾 สลิปส่งของ:</span>
                <button type="button" onClick={() => onPreviewImage && onPreviewImage(proofUrl)} className="text-indigo-400 underline font-semibold hover:text-indigo-300 cursor-pointer">🔗 ดูรูปสลิปค่าส่งของ</button>
              </div>
            )}
            {pkgUrl && pkgUrl.startsWith('http') && (
              <div className="flex justify-between text-[11px] items-center mt-0.5">
                <span className="text-slate-500">📸 ภาพถ่ายแพ็กของสินค้า:</span>
                <button type="button" onClick={() => onPreviewImage && onPreviewImage(pkgUrl)} className="text-indigo-400 underline font-semibold hover:text-indigo-300 cursor-pointer">🔗 ดูรูปสินค้าตอนแพ็ก</button>
              </div>
            )}
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>📅 วันที่ปิดดีลขาย:</span>
              <span className="font-mono">{sellDate}</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between">
            <span className="text-slate-400">🏷️ ราคาตั้งขาย:</span>
            <span className="text-slate-300 font-bold">฿{item.price.toLocaleString()}</span>
          </div>
        )}

        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/40 justify-end">
          <button onClick={() => onEdit(item)} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg transition-colors">
            📝 แก้ไขรายการ
          </button>
          {!isSold && (
            <button onClick={() => onSell(item)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg">
              💰 บันทึกขายออก
            </button>
          )}
          <button onClick={() => onDelete(item.name)} className="bg-red-950/20 hover:bg-red-600 text-red-400 text-xs font-bold py-1.5 px-3 rounded-lg">
            🗑️ ลบ
          </button>
        </div>
      </div>
    </div>
  );
}