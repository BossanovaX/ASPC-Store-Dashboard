'use client';

import { useState, useEffect } from 'react';

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
}

export default function HomeMonitor() {
  // --- ระบบล็อกอินความปลอดภัยหน้าร้าน ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ระบบเปิด/ปิด Popup ---
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);

  // --- 🌟 ระบบ Filter เลือกหมวดหมู่ (เริ่มต้นที่ 'ทั้งหมด') ---
  const [selectedTab, setSelectedTab] = useState('ทั้งหมด');

  // --- แหล่งเก็บข้อมูล ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 📥 ฟอร์มลงทะเบียนรับของเข้าคลัง (ปรับหมวดหมู่เริ่มต้นเป็น CPU)
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState(''); 
  const [imageUrl, setImageUrl] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState(''); 
  const [stock, setStock] = useState('1'); 
  const [category, setCategory] = useState('CPU'); // 🌟 เริ่มที่ CPU ตามเซ็ตใหม่

  // 📤 ฟอร์มบันทึกการขายออก
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [soldAt, setSoldAt] = useState('');

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data.reverse() : []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchProducts();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isInputModalOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setReceivedAt(now.toISOString().slice(0, 10)); 
    }
  }, [isInputModalOpen]);

  useEffect(() => {
    if (isSellModalOpen) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSoldAt(now.toISOString().slice(0, 10));
    }
  }, [isSellModalOpen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin1234') { 
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('❌ รหัสผ่านแอดมินไม่ถูกต้อง!');
    }
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const finalName = `${name} [รับเข้า: ${receivedAt}]`;

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalName,
          cost: parseFloat(cost) || 0,
          price: parseFloat(price) || 0,
          stock: parseFloat(stock) || 1,
          serial_number: serialNumber || '',
          category: category,
          image_url: imageUrl || 'https://picsum.photos/200'
        }),
      });

      if (!response.ok) {
        setMessage("เกิดข้อผิดพลาดในการบันทึกสต็อก");
      } else {
        setMessage("🎉 ลงทะเบียนสินค้าเข้าคลังใหม่สำเร็จ!");
        setName(''); setSerialNumber(''); setImageUrl(''); setCost(''); setPrice('');
        fetchProducts();
        setTimeout(() => { setIsInputModalOpen(false); setMessage(''); }, 1200);
      }
    } catch (err: any) {
      setMessage("ข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setLoading(true);

    const sPrice = parseFloat(soldPrice) || 0;
    const commission = sPrice * 0.01; 

    const soldName = `${selectedProduct.name} [🔴 ขายแล้ว ฿${sPrice} | หัก 1%: ฿${commission} | เมื่อ: ${soldAt}]`;

    try {
      await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedProduct.name }),
      });

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: soldName,
          cost: selectedProduct.cost,
          price: sPrice, 
          stock: 0,      
          serial_number: selectedProduct.serial_number,
          category: selectedProduct.category,
          image_url: selectedProduct.image_url
        }),
      });

      if (response.ok) {
        alert('🎉 บันทึกการขายและคำนวณหัก 1% สำเร็จ!');
        setSoldPrice('');
        setIsSellModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productName: string) => {
    if (!confirm(`ต้องการลบรายการคลัง "${productName}" ออกถาวรใช่ไหม?`)) return;
    try {
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: productName }),
      });
      if (response.ok) { fetchProducts(); }
    } catch (err) { console.error(err); }
  };

  // ====================================================
  // 🔍 1. ตัวกรองข้อมูลเพื่อแบ่งหมวดหมู่ก่อนนำไปคำนวณและแสดงผล
  // ====================================================
  const filteredProducts = products.filter((item) => {
    if (selectedTab === 'ทั้งหมด') return true;
    return item.category === selectedTab;
  });

  // ====================================================
  // 🧮 2. คำนวณบัญชีแยกตามหมวดหมู่ที่เลือกแบบ Realtime
  // ====================================================
  let totalCostAll = 0;
  let totalSalesAll = 0;
  let totalCommissionAll = 0;
  let totalProfitAll = 0;

  filteredProducts.forEach((item) => {
    const isSold = item.name.includes('ขายแล้ว');
    const cost = item.cost || 0;
    
    if (isSold) {
      const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
      const matchComm = item.name.match(/หัก 1%: ฿([\d.]+)/);
      
      const sPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
      const comm = matchComm ? parseFloat(matchComm[1]) : (sPrice * 0.01);
      
      totalSalesAll += sPrice;
      totalCommissionAll += comm;
      totalProfitAll += (sPrice - cost - comm);
    } else {
      totalCostAll += cost;
    }
  });

  const onePercentOfProfit = totalProfitAll * 0.01;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#1e293b] p-8 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-md text-center">
          <div className="text-4xl mb-3">🖥️</div>
          <h2 className="text-xl font-black text-white mb-2">เข้าสู่แผง Monitor คลังสินค้า</h2>
          <p className="text-slate-400 text-sm mb-6">กรุณากรอกรหัสผ่านเพื่อส่องแผงควบคุมหลัก</p>
          <input type="password" placeholder="ป้อนรหัสผ่านระบบ..." value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#111827] text-white border border-slate-700 rounded-xl py-3 px-4 mb-4 text-center focus:outline-none focus:border-orange-500 font-bold tracking-widest" />
          {loginError && <p className="text-red-400 text-xs font-semibold mb-4">{loginError}</p>}
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-lg">🔓 ยืนยันสิทธิ์เปิดบอร์ด</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* แถบหัวเว็บมอนิเตอร์ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">🖥️ ERP Monitor & Stock Manager</h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">บอร์ดสรุปคลังสินค้า ตรวจเช็กต้นทุนและประวัติขายหัก 1% เรียลไทม์</p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button onClick={() => setIsInputModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white text-xs md:text-sm font-extrabold py-2.5 px-5 rounded-xl transition-all shadow-md">
              📥 ลงทะเบียนรับสินค้า
            </button>
            <button onClick={() => setIsLoggedIn(false)} className="bg-slate-800 hover:bg-red-900/50 text-slate-400 border border-slate-700 text-xs md:text-sm font-bold py-2.5 px-4 rounded-xl">🚪 ล็อกเอาท์</button>
          </div>
        </div>

        {/* 📊 แผงสรุปผลกำไรรายหมวดหมู่ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🛒 ยอดขาย ({selectedTab})</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">฿{totalSalesAll.toLocaleString()}</div>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">✂️ หัก 1% ของยอดขาย ({selectedTab})</div>
            <div className="text-2xl font-black text-amber-500 mt-1">฿{totalCommissionAll.toLocaleString()}</div>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">📈 กำไรสุทธิ ({selectedTab})</div>
            <div className="text-2xl font-black text-orange-400 mt-1">฿{totalProfitAll.toLocaleString()}</div>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🪙 1% ของกำไร ({selectedTab})</div>
            <div className="text-2xl font-black text-indigo-400 mt-1">฿{onePercentOfProfit.toLocaleString()}</div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* 🌟 3. แถบปุ่มคลิกเลือกหมวดหมู่ อะไหล่ PC สะอาดตา */}
        {/* ==================================================== */}
        <div className="flex flex-wrap gap-2 bg-[#1e293b] p-3 rounded-xl border border-slate-800">
          {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply / Case'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`text-xs md:text-sm font-bold py-2 px-4 rounded-lg transition-all ${selectedTab === tab ? 'bg-orange-600 text-white shadow-md' : 'bg-[#111827] text-slate-400 hover:text-white hover:bg-slate-800'}`}
            >
              {tab === 'ทั้งหมด' ? '🌐 รวมทุกชนิด' : tab}
            </button>
          ))}
        </div>

        {/* แผง Monitor รายการสินค้า */}
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4">
          <h2 className="font-bold text-slate-300 text-base border-b border-slate-800 pb-3">📦 ตู้สต็อกสินค้าและบันทึกประวัติทางการเงิน ({selectedTab}) ({filteredProducts.length} รายการ)</h2>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-24 text-slate-500 text-sm">ยังไม่มีรายการสินค้าในหมวดหมู่ {selectedTab}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[650px] pb-6 pr-1 no-scrollbar">
              {filteredProducts.map((item) => {
                const isSold = item.name.includes('ขายแล้ว');
                const cost = item.cost || 0;

                const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
                const matchComm = item.name.match(/หัก 1%: ฿([\d.]+)/);
                const matchTime = item.name.match(/เมื่อ: ([\d-]+)/);

                const sellPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
                const commission = matchComm ? parseFloat(matchComm[1]) : (sellPrice * 0.01);
                const sellDate = matchTime ? matchTime[1] : 'ไม่ระบุวัน';

                const cleanName = item.name.split(' [รับเข้า:')[0];

                return (
                  <div key={item.name} className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all shadow-md ${isSold ? 'bg-[#141b2b]/30 border-slate-900/60 opacity-80' : 'bg-[#111827] border-slate-800 hover:border-slate-700'}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      <img src={item.image_url} alt="รูป" className="w-16 h-16 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-800" />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-extrabold uppercase border border-slate-700">{item.category}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSold ? 'bg-rose-950/60 text-rose-400 border border-rose-900/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/40'}`}>
                            {isSold ? '🔴 จำหน่ายออกแล้ว' : `🟢 สต็อก (${item.stock} ชิ้น)`}
                          </span>
                        </div>
                        <h4 className="font-bold text-white text-sm mt-2 leading-snug break-words">{cleanName}</h4>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">S/N: <span className="text-orange-400 font-bold">{item.serial_number || 'ไม่มีรหัส'}</span></p>
                      </div>
                    </div>

                    <div className="border-t border-slate-800/80 pt-3 flex flex-col gap-2 bg-[#141b2b] -mx-4 -mb-4 p-4 rounded-b-xl text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">💵 ต้นทุนรับเข้า:</span>
                        <span className="text-slate-200 font-bold">฿{cost.toLocaleString()}</span>
                      </div>

                      {isSold ? (
                        <div className="flex flex-col gap-1.5 bg-[#0f172a]/60 p-2.5 rounded-lg border border-slate-900 mt-1">
                          <div className="flex justify-between">
                            <span className="text-slate-400">💰 ราคาที่ขายได้:</span>
                            <span className="text-emerald-400 font-black">฿{sellPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">✂️ ค่านายหน้าหัก 1%:</span>
                            <span className="text-amber-500 font-mono">฿{commission.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px] border-t border-slate-800/80 pt-1 mt-1">
                            <span className="text-slate-400">📅 วันที่ปิดดีลขาย:</span>
                            <span className="text-slate-300 font-mono">{sellDate}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-slate-400">🏷️ ราคาตั้งขาย:</span>
                          <span className="text-slate-300 font-bold">฿{item.price.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-2 pt-2 border-t border-slate-800/40 justify-end">
                        {!isSold && (
                          <button 
                            onClick={() => { setSelectedProduct(item); setIsSellModalOpen(true); }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all"
                          >
                            💰 บันทึกขายออก
                          </button>
                        )}
                        <button onClick={() => handleDelete(item.name)} className="bg-red-950/20 hover:bg-red-600 text-red-400 text-xs font-bold py-1.5 px-3 rounded-lg transition-all">🗑️ ลบ</button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 📥 POPUP 1: ลงทะเบียนของเข้าคลัง (อัปเดตหมวดหมู่เป็นอะไหล่ PC แท้) */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
            <button onClick={() => { setIsInputModalOpen(false); setMessage(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-orange-400 text-base border-b border-slate-800 pb-2">📥 ลงทะเบียนสินค้าเข้าคลังใหม่</h2>
            
            {message && <div className="p-3 rounded-xl text-center text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">{message}</div>}

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
                <label className="text-slate-400 block mb-1 font-bold">4. ใส่ลิงก์รูปหลักฐานจัดซื้อ</label>
                <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">5. ราคาทุน (Cost)</label>
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ต้นทุน" />
                </div>
                <div>
                  {/* 🌟 ปรับชอยส์ตัวเลือกหมวดหมู่ให้ตรงตระกูลอะไหล่ PC คอมพิวเตอร์ */}
                  <label className="text-slate-400 block mb-1 font-bold">6. ประเภทสินค้า</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm">
                    <option value="CPU">CPU</option>
                    <option value="GPU">GPU</option>
                    <option value="Memory">Memory</option>
                    <option value="Mainboard">Mainboard</option>
                    <option value="Storage">Storage</option>
                    <option value="Power Supply / Case">Power Supply / Case</option>
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
              <button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl transition-all mt-2 text-sm">{loading ? '⏳ กำลังบันทึก...' : '🚀 บันทึกสินค้าเข้าสต็อกหลัก'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 📤 POPUP 2: บันทึกการขายออก */}
      {isSellModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
            <button onClick={() => setIsSellModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-emerald-400 text-base border-b border-slate-800 pb-2">💰 บันทึกยอดขายสินค้า</h2>
            
            <div className="bg-[#111827] p-3 rounded-xl border border-slate-800 text-xs">
              <p className="text-slate-400">สินค้า: <span className="text-white font-bold">{selectedProduct.name.split(' [')[0]}</span></p>
              <p className="text-slate-400 mt-1">ราคาทุน: <span className="text-orange-400 font-mono">฿{selectedProduct.cost.toLocaleString()}</span></p>
            </div>

            <form onSubmit={handleSellSubmit} className="flex flex-col gap-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">1. ใส่ราคาขายจริงที่ปิดดีลได้</label>
                <input type="number" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-base font-bold focus:border-emerald-500 focus:outline-none" placeholder="฿ ยอดขายปิดดีล..." />
                {soldPrice && (
                  <p className="text-[11px] text-amber-400 mt-1.5 font-medium">
                    🧮 2. คำนวณหัก 1% อัตโนมัติ: <span className="font-mono bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-900/40">฿{(parseFloat(soldPrice) * 0.01 || 0).toLocaleString()}</span>
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">3. ขายเมื่อไหร่ (ระบุวันที่ปิดการขาย)</label>
                <input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono" />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md mt-2">
                {loading ? '⏳ กำลังบันทึกยอดขาย...' : '✅ ยืนยันปิดดีลขายสำเร็จ'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}