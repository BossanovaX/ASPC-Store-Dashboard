'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface Product {
  id?: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
  serial_number: string;
  category: string;
  image_url: string;
  is_sold?: boolean;
  received_at?: string | null;
  sold_at?: string | null;
  sold_price?: number | null;
  shipping_fee?: number | null;
  commission_fee?: number | null;
}

export default function DashboardView({ products }: { products: Product[] }) {
  let totalSalesAll = 0; 
  let totalCommissionAll = 0; 
  let totalProductCostAll = 0; 
  let totalNetProfitAll = 0; 
  let totalStockCostValue = 0; 
  let countSoldItems = 0;

  const categoryCostMap: Record<string, number> = { 'CPU': 0, 'GPU': 0, 'Memory': 0, 'Mainboard': 0, 'Storage': 0, 'Power Supply': 0, 'Case': 0, 'Cooler': 0 };
  const categoryFinancialMap: Record<string, { sales: number; profit: number }> = { 'CPU': { sales: 0, profit: 0 }, 'GPU': { sales: 0, profit: 0 }, 'Memory': { sales: 0, profit: 0 }, 'Mainboard': { sales: 0, profit: 0 }, 'Storage': { sales: 0, profit: 0 }, 'Power Supply': { sales: 0, profit: 0 }, 'Case': { sales: 0, profit: 0 }, 'Cooler': { sales: 0, profit: 0 } };

  products.forEach((item) => {
    const isSold = item.is_sold === true || item.name.includes('ขายแล้ว');
    const cost = item.cost || 0;

    if (!isSold) {
      totalStockCostValue += cost;
      if (categoryCostMap[item.category] !== undefined) categoryCostMap[item.category] += cost;
    } else {
      countSoldItems++;
      const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
      const sPrice = item.sold_price ?? parseFloat(matchPrice ? matchPrice[1] : '0');

      const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
      const ship = item.shipping_fee ?? parseFloat(matchShip ? matchShip[1] : '0');

      const packFee = 30;
      const baseProfit = sPrice - cost - packFee - ship;
      const comm = item.commission_fee ?? (baseProfit > 0 ? baseProfit * 0.03 : 0);
      const net = baseProfit - comm;

      totalSalesAll += sPrice;
      totalCommissionAll += comm;
      totalProductCostAll += cost;
      totalNetProfitAll += net;

      if (categoryFinancialMap[item.category]) {
        categoryFinancialMap[item.category].sales += sPrice;
        categoryFinancialMap[item.category].profit += net;
      }
    }
  });

  const donutData = Object.keys(categoryCostMap).map((cat) => ({
    name: cat, value: categoryCostMap[cat], 
    color: { 'CPU': '#f97316', 'GPU': '#3b82f6', 'Memory': '#ec4899', 'Mainboard': '#10b981', 'Storage': '#a855f7', 'Power Supply': '#eab308', 'Case': '#64748b', 'Cooler': '#06b6d4' }[cat] || '#64748b'
  })).filter(item => item.value > 0);

  const barData = Object.keys(categoryFinancialMap).map((cat) => ({
    category: cat, 'ยอดขาย': categoryFinancialMap[cat].sales, 'กำไรสุทธิ': categoryFinancialMap[cat].profit
  }));

  return (
    <div className="animate-in fade-in duration-300 flex flex-col gap-6 no-print">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-4 rounded-2xl shadow-lg border border-emerald-400/30 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-emerald-400/30 text-7xl font-black">💰</div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 relative z-10">ยอดขายสะสม</p>
          <h3 className="text-2xl font-black mt-1 relative z-10">฿{totalSalesAll.toLocaleString()}</h3>
          <p className="text-[10px] mt-2 bg-black/20 inline-block px-2 py-0.5 rounded-full relative z-10">{countSoldItems} ออเดอร์ปิดดีล</p>
        </div>
        <div className="bg-gradient-to-br from-pink-500 to-pink-700 p-4 rounded-2xl shadow-lg border border-pink-400/30 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-pink-400/30 text-7xl font-black">✂️</div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 relative z-10">นายหน้า 3%</p>
          <h3 className="text-2xl font-black mt-1 relative z-10">฿{totalCommissionAll.toLocaleString(undefined,{maximumFractionDigits:0})}</h3>
          <p className="text-[10px] mt-2 bg-black/20 inline-block px-2 py-0.5 rounded-full relative z-10">หักจากกำไรดีล</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-4 rounded-2xl shadow-lg border border-blue-400/30 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-blue-400/30 text-7xl font-black">📦</div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 relative z-10">ทุนสินค้าขายออก</p>
          <h3 className="text-2xl font-black mt-1 relative z-10">฿{totalProductCostAll.toLocaleString()}</h3>
          <p className="text-[10px] mt-2 bg-black/20 inline-block px-2 py-0.5 rounded-full relative z-10">คืนทุนกลับมาแล้ว</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-4 rounded-2xl shadow-lg border border-purple-400/30 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-purple-400/30 text-7xl font-black">🛒</div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 relative z-10">มูลค่าคลังปัจจุบัน</p>
          <h3 className="text-2xl font-black mt-1 relative z-10">฿{totalStockCostValue.toLocaleString()}</h3>
          <p className="text-[10px] mt-2 bg-black/20 inline-block px-2 py-0.5 rounded-full relative z-10">ทุนคลังที่เหลืออยู่</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-rose-600 p-4 rounded-2xl shadow-xl border border-orange-400/30 text-white relative overflow-hidden lg:col-span-1 col-span-2">
          <div className="absolute -right-4 -top-4 text-orange-400/30 text-7xl font-black">🔥</div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-90 relative z-10">กำไรสุทธิ (NET PROFIT)</p>
          <h3 className="text-3xl font-black mt-1 relative z-10">฿{totalNetProfitAll.toLocaleString(undefined,{maximumFractionDigits:0})}</h3>
          <p className="text-[10px] text-white/70 mt-1.5">กำไรเข้ากระเป๋าจริง</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 no-print">
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl w-full flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">📊 สรุปงบรายรับและกำไรสุทธิแยกตามหมวด</h4>
            <p className="text-[11px] text-slate-500 mb-4">เปรียบเทียบยอดขายรวมและกำไรสุทธิที่หักค่าใช้จ่ายทั้งหมดแล้วในแต่ละหมวดหมู่</p>
          </div>
          <div className="h-64 w-full flex flex-col justify-center">
            <ResponsiveContainer width="100%" height="95%">
              <BarChart data={barData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={((value: any) => [`฿${Number(value).toLocaleString()}`]) as any} contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="ยอดขาย" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="กำไรสุทธิ" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl w-full flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="sm:max-w-xs w-full">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">🍩 ทุนคลังสินค้าแยกตามหมวด</h4>
            <p className="text-[11px] text-slate-500 mb-2">สัดส่วนมูลค่าต้นทุนของสินค้าพร้อมจำหน่ายปัจจุบัน</p>
            <div className="text-2xl font-black text-white mt-2 border-t border-slate-800/80 pt-2 flex items-baseline gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">รวมทุนคลัง:</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-200">฿{totalStockCostValue.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-8 w-full">
            {totalStockCostValue > 0 ? (
              <>
                <div className="w-44 h-44 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={58} outerRadius={78} paddingAngle={3} dataKey="value">
                        {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={((value: any, name: any) => [`฿${Number(value).toLocaleString()}`, name]) as any} contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">สัดส่วนทุน</span>
                    <span className="text-xs font-black text-white mt-0.5">คลังสินค้า</span>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 w-full border-l border-slate-800/60 pl-0 sm:pl-6">
                  {donutData.map((item, idx) => (
                    <div key={`legend-${idx}`} className="flex items-center gap-2 bg-[#111827]/40 p-2 rounded-xl border border-slate-800/40 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-slate-300 font-bold truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">฿{item.value.toLocaleString()} ({((item.value / totalStockCostValue) * 100).toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="w-full py-12 border-2 border-dashed border-slate-800 rounded-xl flex items-center justify-center text-slate-600 text-xs font-bold">ไม่มีสินค้าในคลัง</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}