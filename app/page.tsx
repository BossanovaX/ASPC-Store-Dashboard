'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; // เรียกใช้ supabase client ชุดเดิมของคุณ

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

  // --- ระบบ Filter หมวดหมู่ และ ช่วงวันที่ ---
  const [selectedTab, setSelectedTab] = useState('ทั้งหมด');
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState('');     

  // --- แหล่งเก็บข้อมูล ---
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 📥 ฟอร์มลงทะเบียนรับของเข้าคลัง
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState(''); 
  const [productFile, setProductFile] = useState<File | null>(null); // 📸 ไฟล์ภาพสินค้าแท้
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState(''); 
  const [stock, setStock] = useState('1'); 
  const [category, setCategory] = useState('CPU');

  // 📤 ฟอร์มบันทึกการขายออก
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [shippingFee, setShippingFee] = useState(''); 
  const [slipFile, setSlipFile] = useState<File | null>(null); // 🧾 ไฟล์ภาพสลิปค่าส่งแท้
  const [packageFile, setPackageFile] = useState<File | null>(null); // 📦 ไฟล์ภาพถ่ายตอนแพ็กของแท้
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

  // 🛠️ ฟังก์ชันพิเศษสำหรับส่งรูปภาพเข้าถังเก็บของ Supabase Storage
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
    loading || setLoading(true);
    setMessage('');
    
    try {
      let finalImageUrl = 'https://picsum.photos/200'; // รูปภาพสำรองกรณีไม่เลือกไฟล์
      
      // 📸 ขยับลอจิกยิงภาพสินค้าเข้า Storage ถังใหญ่
      if (productFile) {
        setMessage('⏳ กำลังยิงไฟล์รูปภาพสินค้าเข้า Database...');
        finalImageUrl = await uploadImageToStorage(productFile, 'items');
      }

      const finalCost = parseFloat(cost) || 0;
      const finalName = `${name} [รับเข้า: ${receivedAt}]`;

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
          image_url: finalImageUrl // เก็บลิงก์ภาพแท้ลง Database เรียบร้อย
        }),
      });

      if (!response.ok) {
        setMessage("เกิดข้อผิดพลาดในการบันทึกสต็อก");
      } else {
        setMessage("🎉 บันทึกข้อมูลและจัดเก็บรูปภาพสินค้าสำเร็จ!");
        setName(''); setSerialNumber(''); setProductFile(null); setCost(''); setPrice('');
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

    try {
      let slipUrl = 'ไม่มีหลักฐาน';
      let packageUrl = 'ไม่มีภาพถ่ายเพิ่มเติม';

      // 🧾 ยิงไฟล์รูปสลิปขนส่งเข้า Storage
      if (slipFile) {
        slipUrl = await uploadImageToStorage(slipFile, 'slips');
      }

      // 📦 ยิงไฟล์รูปแพ็กของเข้า Storage
      if (packageFile) {
        packageUrl = await uploadImageToStorage(packageFile, 'packages');
      }

      const sPrice = parseFloat(soldPrice) || 0;
      const sFee = parseFloat(shippingFee) || 0; 
      const packFee = 30;
      
      const baseProfit = sPrice - selectedProduct.cost - packFee - sFee;
      const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;

      // บันทึกที่อยู่รูปภาพแท้ลง Database มัดรวมไปในสตริงข้อมูลดีล
      const soldName = `${selectedProduct.name} [🔴 ขายแล้ว ฿${sPrice} | หัก 3% จากกำไร: ฿${commission.toFixed(2)} | ค่าส่ง: ฿${sFee} | สลิปส่ง: ${slipUrl} | ภาพส่ง: ${packageUrl} | เมื่อ: ${soldAt}]`;

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
        alert('🎉 บันทึกยอดขายและเก็บไฟล์สลิปเข้า Database สำเร็จ!');
        setSoldPrice('');
        setShippingFee('');
        setSlipFile(null);
        setPackageFile(null);
        setIsSellModalOpen(false);
        fetchProducts();
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
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

  // --- ระบบคัดกรองข้อมูล ---
  const filteredProducts = products.filter((item) => {
    if (selectedTab !== 'ทั้งหมด' && item.category !== selectedTab) return false;
    const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
    const matchSell = item.name.match(/เมื่อ: ([\d-]+)/);
    const itemDate = matchSell ? matchSell[1] : (matchReceive ? matchReceive[1] : '');
    if (startDate && itemDate && itemDate < startDate) return false;
    if (endDate && itemDate && itemDate > endDate) return false;
    return true;
  });

  // --- แผงคำนวณงบภาพรวมหน้าร้าน ---
  let totalSalesAll = 0;
  let totalCommissionAll = 0;
  let totalProductCostAll = 0; 
  let totalNetProfitAll = 0;   

  filteredProducts.forEach((item) => {
    const isSold = item.name.includes('ขายแล้ว');
    const cost = item.cost || 0;
    
    if (isSold) {
      const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
      const matchComm = item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/);
      const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/); 
      
      const sPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
      const ship = matchShip ? parseFloat(matchShip[1]) : 0;
      const packFee = 30; 

      const baseProfit = sPrice - cost - packFee - ship;
      const comm = matchComm ? parseFloat(matchComm[1]) : (baseProfit > 0 ? baseProfit * 0.03 : 0);
      const netProfit = baseProfit - comm;

      totalSalesAll += sPrice;
      totalCommissionAll += comm;
      totalProductCostAll += cost;
      totalNetProfitAll += netProfit;
    }
  });

  // 🔐 --- หน้าต่างความปลอดภัย: หากยังไม่ได้ล็อกอิน ให้กรอกรหัสผ่านก่อน ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xl font-black text-white">🔐 ERP Login</h2>
            <p className="text-slate-400 text-xs mt-1">กรุณากรอกรหัสผ่านแอดมินเพื่อเข้าสู่บอร์ดควบคุม</p>
          </div>
          {loginError && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 p-2.5 rounded-xl text-center font-bold animate-pulse">
              {loginError}
            </div>
          )}
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="รหัสผ่านแอดมิน..." 
            className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm text-center focus:border-orange-500 focus:outline-none font-mono"
            required 
          />
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md">
            🔓 เข้าสู่ระบบ
          </button>
        </form>
      </div>
    );
  }

  // 🖥️ --- บอร์ดมอนิเตอร์หลัก (แสดงหลังล็อกอินสำเร็จ) ---
  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* หัวเว็บ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white">🖥️ ERP Monitor & Stock Manager</h1>
            <p className="text-slate-400 text-xs md:text-sm mt-1">บอร์ดคลังสินค้าอัจฉริยะ (ระบบอัปโหลดไฟล์รูปฝังตรงเข้า Database สำเร็จแล้ว)</p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button onClick={() => setIsInputModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold py-2.5 px-5 rounded-xl shadow-md">📥 ลงทะเบียนรับสินค้า</button>
            <button onClick={() => { setIsLoggedIn(false); setPassword(''); }} className="bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl">🚪 ออก</button>
          </div>
        </div>

        {/* 📊 แผงสรุปผลกำไรภาพรวมร้านค้า */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">🛒 ยอดขายสะสมในช่วงนี้</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">฿{totalSalesAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">✂️ หัก 3% นายหน้า (จากกำไร)</div>
            <div className="text-2xl font-black text-amber-500 mt-1">฿{totalCommissionAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-lg">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">💵 ทุนสินค้าสะสม (ที่ขายออก)</div>
            <div className="text-2xl font-black text-slate-300 mt-1">฿{totalProductCostAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-950/40 to-amber-900/20 p-5 rounded-2xl border border-orange-500/30 shadow-xl bg-[#1e293b]">
            <div className="text-[10px] text-orange-400 font-black uppercase tracking-wider">🔥 กำไรสุทธิรวมทั้งหมด (NET PROFIT)</div>
            <div className="text-3xl font-black text-orange-400 mt-0.5">฿{totalNetProfitAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
          </div>
        </div>

        {/* 📅 ปฏิทินคัดกรองช่วงวัน */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#1e293b] p-4 rounded-xl border border-slate-800 items-center">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" />
          <div className="text-xs text-slate-400 md:text-right">กรองพบทั้งหมด <span className="text-orange-400 font-bold text-sm">{filteredProducts.length}</span> ชิ้น</div>
        </div>

        {/* หมวดหมู่ */}
        <div className="flex flex-wrap gap-2 bg-[#1e293b] p-3 rounded-xl border border-slate-800">
          {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply / Case'].map((tab) => (
            <button key={tab} onClick={() => setSelectedTab(tab)} className={`text-xs font-bold py-2 px-4 rounded-lg transition-all ${selectedTab === tab ? 'bg-orange-600 text-white shadow-md' : 'bg-[#111827] text-slate-400 hover:text-white'}`}>{tab === 'ทั้งหมด' ? '🌐 รวมทุกชนิด' : tab}</button>
          ))}
        </div>

        {/* ตู้โชว์การ์ดสินค้า Monitor */}
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4">
          <h2 className="font-bold text-slate-300 text-base border-b border-slate-800 pb-3">📦 รายการสต็อกสินค้าและบันทึกประวัติงบการเงิน ({selectedTab})</h2>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-24 text-slate-500 text-sm">ไม่พบประวัติสินค้าในช่วงนี้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[650px] pb-6 pr-1 no-scrollbar">
              {filteredProducts.map((item) => {
                const isSold = item.name.includes('ขายแล้ว');
                const cost = item.cost || 0;

                const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
                const matchComm = item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/);
                const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
                const matchProof = item.name.match(/สลิปส่ง: ([^\s|]+)/);
                const matchPkg = item.name.match(/ภาพส่ง: ([^\s|]+)/);
                const matchTime = item.name.match(/เมื่อ: ([\d-]+)/);

                const sellPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
                const shipFee = matchShip ? parseFloat(matchShip[1]) : 0;
                const proofUrl = matchProof ? matchProof[1] : '';
                const pkgUrl = matchPkg ? matchPkg[1] : '';
                const sellDate = matchTime ? matchTime[1] : 'ไม่ระบุ';
                const cleanName = item.name.split(' [รับเข้า:')[0];
                
                const baseProfit = sellPrice - cost - 30 - shipFee;
                const commission = matchComm ? parseFloat(matchComm[1]) : (baseProfit > 0 ? baseProfit * 0.03 : 0);
                const itemNetProfit = baseProfit - commission;

                return (
                  <div key={item.name} className={`p-4 rounded-xl border flex flex-col justify-between gap-4 transition-all shadow-md ${isSold ? 'bg-[#141b2b]/30 border-slate-900/60 opacity-80' : 'bg-[#111827] border-slate-800 hover:border-slate-700'}`}>
                    <div className="flex items-start gap-3 min-w-0">
                      {item.image_url && item.image_url.startsWith('http') ? (
                        <img src={item.image_url} alt="รูปสินค้า" className="w-16 h-16 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-800" />
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
                      <div className="flex justify-between">
                        <span className="text-slate-400">💵 ต้นทุนรับเข้าสินค้า (ทุนแท้):</span>
                        <span className="text-slate-200 font-bold">฿{cost.toLocaleString()}</span>
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

                          {/* แสดงรูปสลิปจาก Database */}
                          {proofUrl && proofUrl.startsWith('http') && (
                            <div className="flex justify-between text-[11px] items-center mt-1 pt-1 border-t border-slate-800/40">
                              <span className="text-slate-500">🧾 สลิปส่งของ:</span>
                              <a href={proofUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold hover:text-indigo-300">🔗 คลิกเปิดดูสลิปแท้</a>
                            </div>
                          )}

                          {/* แสดงรูปแพ็กสินค้าเพิ่มเติมจาก Database */}
                          {pkgUrl && pkgUrl.startsWith('http') && (
                            <div className="flex justify-between text-[11px] items-center mt-0.5">
                              <span className="text-slate-500">📸 ภาพถ่ายแพ็กของสินค้า:</span>
                              <a href={pkgUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold hover:text-indigo-300">🔗 คลิกเปิดดูรูปแพ็ก</a>
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
                        {!isSold && (
                          <button onClick={() => { setSelectedProduct(item); setIsSellModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg">💰 บันทึกขายออก</button>
                        )}
                        <button onClick={() => handleDelete(item.name)} className="bg-red-950/20 hover:bg-red-600 text-red-400 text-xs font-bold py-1.5 px-3 rounded-lg">🗑️ ลบ</button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 📥 POPUP 1: ลงทะเบียนของเข้าคลัง */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
            <button onClick={() => setIsInputModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
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
                <label className="text-orange-400 block mb-1 font-bold">4. 📸 เลือกอัปโหลดไฟล์รูปภาพสินค้าจริง (ยิงเข้า Database)</label>
                <input type="file" accept="image/*" onChange={(e) => setProductFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">5. ราคาทุนที่ได้มา (ทุนแท้เพียวๆ)</label>
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ต้นทุนราคาสินค้า" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">6. ประเภทสินค้า</label>
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
                {loading ? '⏳ กำลังยิงไฟล์เข้าระบบ...' : '🚀 บันทึกข้อมูลและรูปภาพเข้าสต็อก'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📤 POPUP 2: บันทึกการขายออก */}
      {isSellModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
            <button onClick={() => setIsSellModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-emerald-400 text-base border-b border-slate-800 pb-2">💰 บันทึกยอดขายและสรุปค่าจัดส่ง</h2>
            
            <div className="bg-[#111827] p-3 rounded-xl border border-slate-800 text-xs">
              <p className="text-slate-400">สินค้า: <span className="text-white font-bold">{selectedProduct.name.split(' [')[0]}</span></p>
              <p className="text-slate-400 mt-1">ราคาทุนสินค้า: <span className="text-orange-400 font-mono">฿{selectedProduct.cost.toLocaleString()}</span> | ค่าแพ็กเกจบังคับ: <span className="text-slate-300 font-bold">฿30</span></p>
            </div>

            <form onSubmit={handleSellSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">1. ใส่ราคาขายจริงที่ปิดยอดได้</label>
                <input type="number" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-base font-bold focus:border-emerald-500 focus:outline-none" placeholder="฿ ยอดขายปิดดีล..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">➕ ระบุค่าส่งจริง (ชำระขนส่ง)</label>
                  <input type="number" step="0.01" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" placeholder="฿ เช่น 40, 50" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">🕒 ขายเมื่อไหร่</label>
                  <input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" />
                </div>
              </div>

              {soldPrice && (
                <div className="bg-[#111827] p-3 rounded-xl border border-slate-800 flex flex-col gap-1 text-[11px] text-slate-400">
                  <div className="flex justify-between">
                    <span>💵 สูตรกำไรเบื้องต้น (ขาย - ทุน - แพ็ก30 - ส่ง):</span>
                    <span className="text-slate-200 font-mono">
                      ฿{(parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>✂️ ค่านายหน้าหัก 3% คิดจากกำไร:</span>
                    <span className="font-mono">
                      ฿{((parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)) > 0 
                        ? (parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)) * 0.03 
                        : 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-emerald-400 font-bold block mb-1">🧾 อัปโหลดไฟล์ภาพสลิปใบเสร็จค่าขนส่ง</label>
                <input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>

              <div>
                <label className="text-emerald-400 font-bold block mb-1">📸 อัปโหลดไฟล์รูปถ่ายสินค้าตอนแพ็กหรือส่ง (เพิ่มเติม)</label>
                <input type="file" accept="image/*" onChange={(e) => setPackageFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>

              <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-1 text-sm">
                {loading ? '⏳ กำลังอัปโหลดภาพและเซฟงบลง Database...' : '✅ ยืนยันปิดดีลและบันทึกหลักฐานทั้งหมด'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}