'use client';

import { useState, useEffect } from 'react';
import ProductCard from '../ProductCard';

interface SoldViewProps {
  products: any[];
  onPreviewImage: (url: string) => void;
  onEdit: (item: any) => void;
  onSell: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function SoldView({ products, onPreviewImage, onEdit, onSell, onDelete }: SoldViewProps) {
  const [soldTab, setSoldTab] = useState('ทั้งหมด');
  const [soldStartDate, setSoldStartDate] = useState(''); 
  const [soldEndDate, setSoldEndDate] = useState('');     
  const [soldSortBy, setSoldSortBy] = useState('date-desc');
  const [soldPage, setSoldPage] = useState(1);
  const [soldSearchQuery, setSoldSearchQuery] = useState(''); 

  useEffect(() => { setSoldPage(1); }, [soldTab, soldStartDate, soldEndDate, soldSortBy, soldSearchQuery]);

  const soldFilteredProducts = products.filter((item) => {
    const isItemSold = item.is_sold === true || item.name.includes('ขายแล้ว');
    if (!isItemSold) return false; 
    if (soldTab !== 'ทั้งหมด' && item.category !== soldTab) return false;

    const cleanName = item.name.split(' [')[0].toLowerCase();
    const sQuery = soldSearchQuery.toLowerCase();
    if (soldSearchQuery && !cleanName.includes(sQuery) && !(item.serial_number || '').toLowerCase().includes(sQuery)) return false;

    const matchSell = item.name.match(/เมื่อ: ([\d-]+)/);
    const itemDate = item.sold_at || (matchSell ? matchSell[1] : '');
    if (soldStartDate && itemDate && itemDate < soldStartDate) return false;
    if (soldEndDate && itemDate && itemDate > soldEndDate) return false;
    return true;
  }).sort((a, b) => {
    const matchA = a.name.match(/เมื่อ: ([\d-]+)/);
    const matchB = b.name.match(/เมื่อ: ([\d-]+)/);
    const dateA = a.sold_at || (matchA ? matchA[1] : '');
    const dateB = b.sold_at || (matchB ? matchB[1] : '');
    const matchPriceA = a.name.match(/ขายแล้ว ฿([\d.]+)/);
    const matchPriceB = b.name.match(/ขายแล้ว ฿([\d.]+)/);
    const priceA = a.sold_price ?? parseFloat(matchPriceA ? matchPriceA[1] : '0');
    const priceB = b.sold_price ?? parseFloat(matchPriceB ? matchPriceB[1] : '0');
    if (soldSortBy === 'date-desc') return dateB.localeCompare(dateA);
    if (soldSortBy === 'date-asc') return dateA.localeCompare(dateB);
    if (soldSortBy === 'price-desc') return priceB - priceA;
    if (soldSortBy === 'price-asc') return priceA - priceB;
    return 0;
  });

  const itemsPerPage = 9; 
  const totalPages = Math.ceil(soldFilteredProducts.length / itemsPerPage);
  const startIndex = (soldPage - 1) * itemsPerPage;
  const displayedItems = soldFilteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-in fade-in duration-300 bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4 no-print relative">
      
      {/* Header สรุปยอดขาย */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500" />
          <h2 className="font-bold text-slate-300 text-base">ประวัติสินค้าจำหน่ายแล้ว / สรุปงบดุลบัญชี</h2>
        </div>
        <span className="text-xs bg-rose-950 text-rose-400 font-mono px-3 py-1 rounded-lg sm:ml-auto self-start sm:self-auto font-bold">
          ปิดยอดไปแล้ว: {soldFilteredProducts.length} ดีล
        </span>
      </div>

      {/* 📌 STICKY FILTER BAR: ปักหมุดแทบรวบ Filter ติดด้านบนเวลา Scroll */}
      <div className="bg-[#1e293b]/95 backdrop-blur-md rounded-xl border border-slate-800/80 flex flex-col gap-3 p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#111827]/60 p-2.5 rounded-xl border border-slate-800/80 items-center">
          <input type="date" value={soldStartDate} onChange={(e) => setSoldStartDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
          <input type="date" value={soldEndDate} onChange={(e) => setSoldEndDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
          <select value={soldSortBy} onChange={(e) => setSoldSortBy(e.target.value)} className="bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none">
            <option value="date-desc">🕒 ขายเมื่อ: ล่าสุด ➔ เก่าสุด</option>
            <option value="date-asc">⏳ ขายเมื่อ: เก่าสุด ➔ ล่าสุด</option>
            <option value="name-asc">🔤 ชื่อ: ก-ฮ / A-Z</option>
            <option value="name-desc">🔤 ชื่อ: ฮ-ก / Z-A</option>
            <option value="price-desc">💰 ยอดขาย: สูง ➔ ต่ำ</option>
            <option value="price-asc">🪙 ยอดขาย: ต่ำ ➔ สูง</option>
          </select>
          <div className="relative w-full">
            <input type="text" value={soldSearchQuery} onChange={(e) => setSoldSearchQuery(e.target.value)} placeholder="🔍 ค้นหาชื่อ หรือ S/N..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-sans focus:border-orange-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pb-1">
  {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply', 'Case', 'Cooler', 'Monitor'].map((tab) => (
    <button key={`sold-tab-${tab}`} onClick={() => setSoldTab(tab)} className={`text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${soldTab === tab ? 'bg-rose-600 text-white shadow-sm' : 'bg-[#111827] text-slate-400 hover:text-white'}`}>{tab === 'ทั้งหมด' ? '🌐 ทุกหมวด' : tab}</button>
  ))}
</div>
      </div>

      {/* Grid รายการสินค้าที่ขายแล้ว */}
      {soldFilteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs font-sans">ไม่พบประวัติการขายในตัวกรองนี้</div>
      ) : (
        <div className="flex flex-col gap-6 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
            {displayedItems.map((item) => (
              <ProductCard 
                key={item.id || item.serial_number || item.name} 
                item={item} 
                onPreviewImage={onPreviewImage}
                onEdit={onEdit}
                onSell={onSell}
                onDelete={onDelete} 
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center gap-1.5 pt-4 border-t border-slate-800/60 text-xs">
              <button onClick={() => setSoldPage(prev => Math.max(prev - 1, 1))} disabled={soldPage === 1} className="px-3 py-1.5 rounded-lg bg-[#111827] text-slate-400 hover:text-white disabled:opacity-30">◀</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setSoldPage(p)} className={`w-8 h-8 rounded-lg font-bold ${soldPage === p ? 'bg-rose-600 text-white' : 'bg-[#111827] text-slate-400'}`}>{p}</button>
              ))}
              <button onClick={() => setSoldPage(prev => Math.min(prev + 1, totalPages))} disabled={soldPage === totalPages} className="px-3 py-1.5 rounded-lg bg-[#111827] text-slate-400 hover:text-white disabled:opacity-30">▶</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}