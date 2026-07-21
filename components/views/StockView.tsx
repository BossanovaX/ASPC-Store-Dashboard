'use client';

import { useState, useEffect } from 'react';
import ProductCard from '../ProductCard';

interface StockViewProps {
  products: any[];
  onPreviewImage: (url: string) => void;
  onEdit: (item: any) => void;
  onSell: (item: any) => void;
  onDelete: (item: any) => void;
}

export default function StockView({ products, onPreviewImage, onEdit, onSell, onDelete }: StockViewProps) {
  const [stockTab, setStockTab] = useState('ทั้งหมด');
  const [stockStartDate, setStockStartDate] = useState(''); 
  const [stockEndDate, setStockEndDate] = useState('');     
  const [stockSortBy, setStockSortBy] = useState('date-desc');
  const [stockPage, setStockPage] = useState(1);
  const [stockSearchQuery, setStockSearchQuery] = useState(''); 

  useEffect(() => { setStockPage(1); }, [stockTab, stockStartDate, stockEndDate, stockSortBy, stockSearchQuery]);

  const stockFilteredProducts = products.filter((item) => {
    const isSold = item.is_sold === true || item.name.includes('ขายแล้ว');
    if (isSold) return false; 
    if (stockTab !== 'ทั้งหมด' && item.category !== stockTab) return false;
    
    const cleanName = item.name.split(' [')[0].toLowerCase();
    const sQuery = stockSearchQuery.toLowerCase();
    if (stockSearchQuery && !cleanName.includes(sQuery) && !(item.serial_number || '').toLowerCase().includes(sQuery)) return false;

    const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
    const itemDate = item.received_at || (matchReceive ? matchReceive[1] : '');
    if (stockStartDate && itemDate && itemDate < stockStartDate) return false;
    if (stockEndDate && itemDate && itemDate > stockEndDate) return false;
    return true;
  }).sort((a, b) => {
    const matchA = a.name.match(/รับเข้า: ([\d-]+)/);
    const matchB = b.name.match(/รับเข้า: ([\d-]+)/);
    const dateA = a.received_at || (matchA ? matchA[1] : '');
    const dateB = b.received_at || (matchB ? matchB[1] : '');
    if (stockSortBy === 'date-desc') return dateB.localeCompare(dateA);
    if (stockSortBy === 'date-asc') return dateA.localeCompare(dateB);
    if (stockSortBy === 'price-desc') return b.price - a.price;
    if (stockSortBy === 'price-asc') return a.price - b.price;
    return 0;
  });

  const itemsPerPage = 9; 
  const totalPages = Math.ceil(stockFilteredProducts.length / itemsPerPage);
  const startIndex = (stockPage - 1) * itemsPerPage;
  const displayedItems = stockFilteredProducts.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="animate-in fade-in duration-300 bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4 no-print relative">
      
      {/* Header สรุปจำนวนสินค้า */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-bold text-slate-300 text-base">รายการสินค้าอยู่ในสต็อก / พร้อมจำหน่าย</h2>
        </div>
        <span className="text-xs bg-emerald-950 text-emerald-400 font-mono px-3 py-1 rounded-lg sm:ml-auto self-start sm:self-auto font-bold">
          จำนวนในคลัง: {stockFilteredProducts.length} ชิ้น
        </span>
      </div>

      {/* 📌 STICKY FILTER BAR: ปักหมุดแทบรวบ Filter ติดด้านบนเวลา Scroll */}
      <div className="bg-[#1e293b]/95 backdrop-blur-md rounded-xl border border-slate-800/80 flex flex-col gap-3 p-3 mb-4">
        {/* แถบตัวกรองวันที่ / ซอส / ค้นหา */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#111827]/60 p-2.5 rounded-xl border border-slate-800/80 items-center">
          <input type="date" value={stockStartDate} onChange={(e) => setStockStartDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
          <input type="date" value={stockEndDate} onChange={(e) => setStockEndDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
          <select value={stockSortBy} onChange={(e) => setStockSortBy(e.target.value)} className="bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none">
            <option value="date-desc">🕒  รับเข้า: ใหม่ ➔ เก่า</option>
            <option value="date-asc">⏳  รับเข้า: เก่า ➔ ใหม่</option>
            <option value="name-asc">🔤 ชื่อ: ก-ฮ / A-Z</option>
            <option value="name-desc">🔤 ชื่อ: ฮ-ก / Z-A</option>
            <option value="price-desc">💰 ราคา: สูง ➔ ต่ำ</option>
            <option value="price-asc">🪙 ราคา: ต่ำ ➔ สูง</option>
          </select>
          <div className="relative w-full">
            <input type="text" value={stockSearchQuery} onChange={(e) => setStockSearchQuery(e.target.value)} placeholder="🔍 ค้นหาชื่อ หรือ S/N..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-sans focus:border-orange-500 focus:outline-none" />
          </div>
        </div>

        {/* แถบปุ่มแท็บเลือกหมวดหมู่ */}
        <div className="flex flex-wrap gap-1.5 pb-1">
  {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply', 'Case', 'Cooler', 'Monitor'].map((tab) => (
    <button key={`stock-tab-${tab}`} onClick={() => setStockTab(tab)} className={`text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${stockTab === tab ? 'bg-orange-600 text-white shadow-sm' : 'bg-[#111827] text-slate-400 hover:text-white'}`}>{tab === 'ทั้งหมด' ? '🌐 ทุกหมวด' : tab}</button>
  ))}
</div>
      </div>

      {/* Grid รายการสินค้า */}
      {stockFilteredProducts.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-xs font-sans">ไม่พบสินค้าในตัวกรองนี้</div>
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
              <button onClick={() => setStockPage(prev => Math.max(prev - 1, 1))} disabled={stockPage === 1} className="px-3 py-1.5 rounded-lg bg-[#111827] text-slate-400 hover:text-white disabled:opacity-30">◀</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setStockPage(p)} className={`w-8 h-8 rounded-lg font-bold ${stockPage === p ? 'bg-orange-600 text-white' : 'bg-[#111827] text-slate-400'}`}>{p}</button>
              ))}
              <button onClick={() => setStockPage(prev => Math.min(prev + 1, totalPages))} disabled={stockPage === totalPages} className="px-3 py-1.5 rounded-lg bg-[#111827] text-slate-400 hover:text-white disabled:opacity-30">▶</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}