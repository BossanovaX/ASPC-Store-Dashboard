'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import * as XLSX from 'xlsx'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import ProductCard from '../components/ProductCard';

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
  const queryClient = useQueryClient();

  // --- แถบเมนู Sidebar (สลับหน้าจอ) ---
  const [activeMenu, setActiveMenu] = useState('dashboard'); // dashboard, stock, sold, reports

  const [hasMounted, setHasMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- Popup ---
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // --- 🟢 1. ระบบควบคุมการกรองฝั่งสินค้าอยู่ในสต็อก (Stock Filters) ---
  const [stockTab, setStockTab] = useState('ทั้งหมด');
  const [stockStartDate, setStockStartDate] = useState(''); 
  const [stockEndDate, setStockEndDate] = useState('');     
  const [stockSortBy, setStockSortBy] = useState('date-desc');
  const [stockPage, setStockPage] = useState(1);
  const [stockSearchQuery, setStockSearchQuery] = useState(''); 

  // --- 🔴 2. ระบบควบคุมการกรองฝั่งสินค้าจำหน่ายแล้ว (Sold Filters) ---
  const [soldTab, setSoldTab] = useState('ทั้งหมด');
  const [soldStartDate, setSoldStartDate] = useState(''); 
  const [soldEndDate, setSoldEndDate] = useState('');     
  const [soldSortBy, setSoldSortBy] = useState('date-desc');
  const [soldPage, setSoldPage] = useState(1);
  const [soldSearchQuery, setSoldSearchQuery] = useState(''); 

  // --- 📄 3. ระบบตัวกรองศูนย์ออกเอกสารและรายงานบัญชี (Report Panel Filters) ---
  const [docStatus, setDocStatus] = useState('ทั้งหมด'); 
  const [docCategory, setDocCategory] = useState('ทั้งหมด');
  const [docStartDate, setDocStartDate] = useState('');
  const [docEndDate, setDocEndDate] = useState('');

  // --- แหล่งเก็บข้อมูลฟอร์ม ---
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [receivedAt, setReceivedAt] = useState(''); 
  const [productFile, setProductFile] = useState<File | null>(null); 
  const [receiptFile, setReceiptFile] = useState<File | null>(null); 
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState(''); 
  const [stock, setStock] = useState('1'); 
  const [category, setCategory] = useState('CPU');

  // ฟอร์มแก้ไขสินค้า
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
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

  // ฟอร์มบันทึกการขายออก
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [shippingFee, setShippingFee] = useState(''); 
  const [saleProofFile, setSaleProofFile] = useState<File | null>(null); 
  const [slipFile, setSlipFile] = useState<File | null>(null); 
  const [packageFile, setPackageFile] = useState<File | null>(null); 
  const [soldAt, setSoldAt] = useState('');

  // ==========================================
  // 🔥 1. ใช้ TANSTACK QUERY จัดการข้อมูลสินค้า
  // ==========================================
  const { 
    data: products = [], 
    isLoading: isProductsLoading,
    isFetching: isProductsFetching
  } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('โหลดข้อมูลคลังสินค้าล้มเหลว');
      const data = await response.json();
      return Array.isArray(data) ? data.reverse() : [];
    },
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5, 
  });

  const productMutation = useMutation({
    mutationFn: async ({ url, method, body }: { url: string; method: string; body: any }) => {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error('เกิดข้อผิดพลาดในการประมวลผลเซิร์ฟเวอร์');
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] })
  });

  useEffect(() => { setHasMounted(true); }, []);

  // รีเซ็ตหน้า Pagination เมื่อตัวกรองหรือการค้นหาเปลี่ยน
  useEffect(() => { setStockPage(1); }, [stockTab, stockStartDate, stockEndDate, stockSortBy, stockSearchQuery]);
  useEffect(() => { setSoldPage(1); }, [soldTab, soldStartDate, soldEndDate, soldSortBy, soldSearchQuery]);

  useEffect(() => {
    if (isInputModalOpen) {
      const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setReceivedAt(now.toISOString().slice(0, 10)); 
    }
  }, [isInputModalOpen]);

  useEffect(() => {
    if (isSellModalOpen) {
      const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setSoldAt(now.toISOString().slice(0, 10));
    }
  }, [isSellModalOpen]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { setIsLoggedIn(true); setLoginError(''); } 
    else { setLoginError('❌ รหัสผ่านแอดมินไม่ถูกต้อง!'); }
  };

  const uploadImageToStorage = async (file: File, folderName: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folderName}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
    const filePath = `${folderName}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('products').upload(filePath, file);
    if (uploadError) throw new Error(`อัปโหลดล้มเหลว: ${uploadError.message}`);
    const { data } = supabase.storage.from('products').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('');
    if (!productFile || !receiptFile) { alert("❌ กรุณาอัปโหลดรูปภาพสินค้าจริง และ สลิปหลักฐานการซื้อให้ครบถ้วน!"); return; }
    try {
      setMessage('⏳ กำลังยิงไฟล์เข้าระบบ...');
      const finalImageUrl = await uploadImageToStorage(productFile, 'items');
      const receiptUrl = await uploadImageToStorage(receiptFile, 'receipts');
      const finalCost = parseFloat(cost) || 0;
      const finalName = `${name} [รับเข้า: ${receivedAt} | หลักฐานซื้อ: ${receiptUrl}]`;
      
      await productMutation.mutateAsync({
        url: '/api/products', method: 'POST',
        body: { name: finalName, cost: finalCost, price: parseFloat(price) || 0, stock: parseFloat(stock) || 1, serial_number: serialNumber || '', category, image_url: finalImageUrl }
      });
      setMessage("🎉 บันทึกข้อมูลสำเร็จ!");
      setName(''); setSerialNumber(''); setProductFile(null); setReceiptFile(null); setCost(''); setPrice('');
      setTimeout(() => { setIsInputModalOpen(false); setMessage(''); }, 1200);
    } catch (err: any) { setMessage("ข้อผิดพลาด: " + err.message); }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingProduct) return;
    try {
      const isSold = editingProduct.name.includes('ขายแล้ว');
      let updatedName = '';
      const matchReceive = editingProduct.name.match(/รับเข้า: ([\d-]+)/);
      const matchReceipt = editingProduct.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
      let finalProductImageUrl = editingProduct.image_url;
      let finalBuyReceiptUrl = matchReceipt ? matchReceipt[1] : 'ไม่มีหลักฐานซื้อ';

      if (!isSold && editProductFile) finalProductImageUrl = await uploadImageToStorage(editProductFile, 'items');
      if (!isSold && editReceiptFile) finalBuyReceiptUrl = await uploadImageToStorage(editReceiptFile, 'receipts');

      const nCost = parseFloat(editCost) || 0; const nPrice = parseFloat(editPrice) || 0; const nStock = parseFloat(editStock) || 0;

      if (isSold) {
        const matchSaleProof = editingProduct.name.match(/หลักฐานขาย: ([^\s|]+)/);
        const matchProof = editingProduct.name.match(/สลิปส่ง: ([^\s|]+)/);
        const matchPkg = editingProduct.name.match(/ภาพส่ง: ([^\s|]+)/);
        const matchTime = editingProduct.name.match(/เมื่อ: ([\d-]+)/);

        let finalSaleProofUrl = matchSaleProof ? matchSaleProof[1] : 'ไม่มีหลักฐาน';
        let finalShippingSlipUrl = matchProof ? matchProof[1] : 'ไม่มีหลักฐาน';
        let finalPackageImageUrl = matchPkg ? matchPkg[1] : 'ไม่มีภาพถ่ายเพิ่มเติม';
        const soldDate = matchTime ? matchTime[1] : 'ไม่ระบุ';

        if (editSaleProofFile) finalSaleProofUrl = await uploadImageToStorage(editSaleProofFile, 'sales_proofs');
        if (editSlipFile) finalShippingSlipUrl = await uploadImageToStorage(editSlipFile, 'slips');
        if (editPackageFile) finalPackageImageUrl = await uploadImageToStorage(editPackageFile, 'packages');

        const newShipFee = parseFloat(editShippingFee) || 0;
        const baseProfit = nPrice - nCost - 30 - newShipFee;
        const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;
        updatedName = `${editName} [หลักฐานซื้อ: ${finalBuyReceiptUrl}] [🔴 ขายแล้ว ฿${nPrice} | หัก 3% จากกำไร: ฿${commission.toFixed(2)} | ค่าส่ง: ฿${newShipFee} | หลักฐานขาย: ${finalSaleProofUrl} | สลิปส่ง: ${finalShippingSlipUrl} | ภาพส่ง: ${finalPackageImageUrl} | เมื่อ: ${soldDate}]`;
      } else {
        const originalDate = matchReceive ? matchReceive[1] : new Date().toISOString().slice(0, 10);
        updatedName = `${editName} [รับเข้า: ${originalDate} | หลักฐานซื้อ: ${finalBuyReceiptUrl}]`;
      }

      await productMutation.mutateAsync({ url: '/api/products', method: 'DELETE', body: { name: editingProduct.name } });
      await productMutation.mutateAsync({ url: '/api/products', method: 'POST', body: { name: updatedName, cost: nCost, price: nPrice, stock: isSold ? 0 : nStock, serial_number: editSerialNumber, category: editCategory, image_url: finalProductImageUrl } });
      alert('🎉 อัปเดตแก้ไขสำเร็จ!'); setIsEditModalOpen(false); setEditingProduct(null); setEditProductFile(null); setEditReceiptFile(null); setEditSaleProofFile(null); setEditSlipFile(null); setEditPackageFile(null);
    } catch (err: any) { alert("ข้อผิดพลาด: " + err.message); }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedProduct) return;
    if (!saleProofFile) { alert("❌ บังคับอัปโหลดหลักฐานซื้อขาย!"); return; }
    try {
      let saleProofUrl = await uploadImageToStorage(saleProofFile, 'sales_proofs');
      let slipUrl = slipFile ? await uploadImageToStorage(slipFile, 'slips') : 'ไม่มีหลักฐาน';
      let packageUrl = packageFile ? await uploadImageToStorage(packageFile, 'packages') : 'ไม่มีภาพถ่ายเพิ่มเติม';

      const sPrice = parseFloat(soldPrice) || 0; const sFee = parseFloat(shippingFee) || 0; const packFee = 30;
      const baseProfit = sPrice - selectedProduct.cost - packFee - sFee;
      const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;

      const matchBuyReceipt = selectedProduct.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
      const originalBuyReceipt = matchBuyReceipt ? matchBuyReceipt[1] : 'ไม่มีหลักฐานซื้อ';
      const cleanBaseName = selectedProduct.name.split(' [')[0];
      const soldName = `${cleanBaseName} [หลักฐานซื้อ: ${originalBuyReceipt}] [🔴 ขายแล้ว ฿${sPrice} | หัก 3% จากกำไร: ฿${commission.toFixed(2)} | ค่าส่ง: ฿${sFee} | หลักฐานขาย: ${saleProofUrl} | สลิปส่ง: ${slipUrl} | ภาพส่ง: ${packageUrl} | เมื่อ: ${soldAt}]`;

      await productMutation.mutateAsync({ url: '/api/products', method: 'DELETE', body: { name: selectedProduct.name } });
      await productMutation.mutateAsync({ url: '/api/products', method: 'POST', body: { name: soldName, cost: selectedProduct.cost, price: sPrice, stock: 0, serial_number: selectedProduct.serial_number, category: selectedProduct.category, image_url: selectedProduct.image_url } });
      alert('🎉 ปิดยอดขายสำเร็จ!'); setSoldPrice(''); setShippingFee(''); setSaleProofFile(null); setSlipFile(null); setPackageFile(null); setIsSellModalOpen(false);
    } catch (err: any) { alert("เกิดข้อผิดพลาด: " + err.message); }
  };

  const handleDelete = async (productName: string) => {
    if (!confirm(`ต้องการลบ "${productName}" ใช่ไหม?`)) return;
    try { await productMutation.mutateAsync({ url: '/api/products', method: 'DELETE', body: { name: productName } }); } 
    catch (err) { console.error(err); }
  };

  // --- Logic Computations ---
  const stockFilteredProducts = products.filter((item) => {
    if (item.name.includes('ขายแล้ว')) return false; 
    if (stockTab !== 'ทั้งหมด' && item.category !== stockTab) return false;
    
    const cleanName = item.name.split(' [')[0].toLowerCase();
    const sQuery = stockSearchQuery.toLowerCase();
    if (stockSearchQuery && !cleanName.includes(sQuery) && !(item.serial_number || '').toLowerCase().includes(sQuery)) return false;

    const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
    const itemDate = matchReceive ? matchReceive[1] : '';
    if (stockStartDate && itemDate && itemDate < stockStartDate) return false;
    if (stockEndDate && itemDate && itemDate > stockEndDate) return false;
    return true;
  }).sort((a, b) => {
    const dateA = a.name.match(/รับเข้า: ([\d-]+)/)?.[1] || '';
    const dateB = b.name.match(/รับเข้า: ([\d-]+)/)?.[1] || '';
    if (stockSortBy === 'date-desc') return dateB.localeCompare(dateA);
    if (stockSortBy === 'date-asc') return dateA.localeCompare(dateB);
    if (stockSortBy === 'price-desc') return b.price - a.price;
    if (stockSortBy === 'price-asc') return a.price - b.price;
    return 0;
  });

  const soldFilteredProducts = products.filter((item) => {
    if (!item.name.includes('ขายแล้ว')) return false; 
    if (soldTab !== 'ทั้งหมด' && item.category !== soldTab) return false;

    const cleanName = item.name.split(' [')[0].toLowerCase();
    const sQuery = soldSearchQuery.toLowerCase();
    if (soldSearchQuery && !cleanName.includes(sQuery) && !(item.serial_number || '').toLowerCase().includes(sQuery)) return false;

    const matchSell = item.name.match(/เมื่อ: ([\d-]+)/);
    const itemDate = matchSell ? matchSell[1] : '';
    if (soldStartDate && itemDate && itemDate < soldStartDate) return false;
    if (soldEndDate && itemDate && itemDate > soldEndDate) return false;
    return true;
  }).sort((a, b) => {
    const dateA = a.name.match(/เมื่อ: ([\d-]+)/)?.[1] || '';
    const dateB = b.name.match(/เมื่อ: ([\d-]+)/)?.[1] || '';
    const priceA = parseFloat(a.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0');
    const priceB = parseFloat(b.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0');
    if (soldSortBy === 'date-desc') return dateB.localeCompare(dateA);
    if (soldSortBy === 'date-asc') return dateA.localeCompare(dateB);
    if (soldSortBy === 'price-desc') return priceB - priceA;
    if (soldSortBy === 'price-asc') return priceA - priceB;
    return 0;
  });

  const reportFilteredProducts = products.filter((item) => {
    const isSold = item.name.includes('ขายแล้ว');
    if (docStatus === 'อยู่ในสต็อก' && isSold) return false;
    if (docStatus === 'จำหน่ายแล้ว' && !isSold) return false;
    if (docCategory !== 'ทั้งหมด' && item.category !== docCategory) return false;
    const itemDate = isSold ? (item.name.match(/เมื่อ: ([\d-]+)/)?.[1] || '') : (item.name.match(/รับเข้า: ([\d-]+)/)?.[1] || '');
    if (docStartDate && itemDate && itemDate < docStartDate) return false;
    if (docEndDate && itemDate && itemDate > docEndDate) return false;
    return true;
  });

  const exportToExcelFromPanel = () => {
    if (reportFilteredProducts.length === 0) { alert('❌ ไม่พบข้อมูล!'); return; }
    const reportData = reportFilteredProducts.map((item, index) => {
      const isSold = item.name.includes('ขายแล้ว');
      const cleanName = item.name.split(' [')[0];
      const sellPrice = isSold ? parseFloat(item.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0') : item.price;
      const shipFee = isSold ? parseFloat(item.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0') : 0;
      const commission = isSold ? parseFloat(item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/)?.[1] || '0') : 0;
      const netProfit = isSold ? (sellPrice - item.cost - 30 - shipFee - commission) : 0;
      return {
        'ลำดับ': index + 1, 'ชื่อสินค้า': cleanName, 'S/N': item.serial_number || '-', 'หมวดหมู่': item.category,
        'สถานะ': isSold ? 'ขายแล้ว' : `สต็อก`, 'ทุน (บาท)': item.cost, 'ยอดขาย (บาท)': isSold ? sellPrice : '-',
        'กำไรสุทธิ (บาท)': isSold ? Math.max(0, netProfit) : '-'
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ERP_Report');
    XLSX.writeFile(workbook, `ERP_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToPDF = () => { window.print(); };

  let totalSalesAll = 0; let totalCommissionAll = 0; let totalProductCostAll = 0; 
  let totalNetProfitAll = 0; let totalStockCostValue = 0; let totalShippingFeeAll = 0; 
  let countSoldItems = 0;

  const categoryCostMap: Record<string, number> = { 'CPU': 0, 'GPU': 0, 'Memory': 0, 'Mainboard': 0, 'Storage': 0, 'Power Supply': 0, 'Case': 0, 'Cooler': 0 };
  const categoryFinancialMap: Record<string, { sales: number; profit: number }> = { 'CPU': { sales: 0, profit: 0 }, 'GPU': { sales: 0, profit: 0 }, 'Memory': { sales: 0, profit: 0 }, 'Mainboard': { sales: 0, profit: 0 }, 'Storage': { sales: 0, profit: 0 }, 'Power Supply': { sales: 0, profit: 0 }, 'Case': { sales: 0, profit: 0 }, 'Cooler': { sales: 0, profit: 0 } };

  products.forEach((item) => {
    const isSold = item.name.includes('ขายแล้ว');
    const cost = item.cost || 0;
    if (!isSold) {
      totalStockCostValue += cost;
      if (categoryCostMap[item.category] !== undefined) categoryCostMap[item.category] += cost;
    } else {
      countSoldItems++;
      const sPrice = parseFloat(item.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0');
      const ship = parseFloat(item.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0');
      const comm = parseFloat(item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/)?.[1] || '0');
      totalSalesAll += sPrice; totalCommissionAll += comm; totalProductCostAll += cost; totalShippingFeeAll += ship;
      const net = sPrice - cost - 30 - ship - comm;
      totalNetProfitAll += net;
      if (categoryFinancialMap[item.category]) { categoryFinancialMap[item.category].sales += sPrice; categoryFinancialMap[item.category].profit += net; }
    }
  });

  const donutData = Object.keys(categoryCostMap).map((cat) => ({
    name: cat, value: categoryCostMap[cat], 
    color: { 'CPU': '#f97316', 'GPU': '#3b82f6', 'Memory': '#ec4899', 'Mainboard': '#10b981', 'Storage': '#a855f7', 'Power Supply': '#eab308', 'Case': '#64748b', 'Cooler': '#06b6d4' }[cat] || '#64748b'
  })).filter(item => item.value > 0);

  const barData = Object.keys(categoryFinancialMap).map((cat) => ({
    category: cat, 'ยอดขาย': categoryFinancialMap[cat].sales, 'กำไรสุทธิ': categoryFinancialMap[cat].profit
  }));

  if (!hasMounted) return <div className="min-h-screen bg-[#0f172a]" />;
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm flex flex-col gap-4">
          <div className="text-center"><h2 className="text-xl font-black text-white">🔐 ASPC Login</h2><p className="text-slate-400 text-xs mt-1">ระบบจัดการคลังและบัญชี</p></div>
          {loginError && <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 p-2.5 rounded-xl text-center font-bold">{loginError}</div>}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="รหัสผ่านแอดมิน..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm text-center focus:border-orange-500 focus:outline-none font-mono" required />
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md">🔓 เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  // --- HTML Layout (Sidebar Dashboard Style) ---
  return (
    /* 🔥 เพิ่มคลาส app-root เพื่อเตรียมปลดล็อกความสูงเวลา Print */
    <div className="app-root flex h-screen bg-[#0f172a] overflow-hidden text-slate-100 font-sans">
      <style jsx global>{`
        /* 🔥 ชุดโค้ด CSS สำหรับระบบ Print PDF แก้บั๊กแบบปลดล็อกกรอบ */
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body, html { background-color: #ffffff !important; color: #000000 !important; height: auto !important; overflow: visible !important; }
          .no-print, .sidebar, header { display: none !important; }
          
          /* 🔥 ปลดล็อกความสูงและ Scrollbar ของทุก Container ให้กระดาษไหลลงมาได้หลายหน้า */
          .app-root, .main-content, .scroll-container, .max-w-7xl { 
            display: block !important; 
            overflow: visible !important; 
            height: auto !important; 
            min-height: auto !important; 
            width: 100% !important; 
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .print-report-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .print-table-container { display: block !important; width: 100% !important; margin-top: 15px; }
          
          /* 🔥 ให้ตารางข้ามหน้าได้แบบไม่ถูกตัดกลาง */
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; color: #000 !important; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          th, td { border: 1px solid #666 !important; padding: 8px 10px; text-align: left; }
          th { background-color: #f1f5f9 !important; font-weight: bold; font-size: 10px; }
          .text-right-print { text-align: right !important; font-family: monospace; }
          .bg-total-row { background-color: #f8fafc !important; font-weight: bold; }
        }
      `}</style>

      {/* 🟦 SIDEBAR (แถบเมนูด้านซ้าย) */}
      <div className="sidebar w-64 bg-[#1e293b] border-r border-slate-800 flex-col justify-between hidden md:flex shrink-0 z-10">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-lg">A</div>
            <div><h1 className="font-bold text-sm tracking-wide text-white">ASPC Manager</h1><p className="text-[10px] text-slate-400">ERP & Stock System</p></div>
          </div>
          <nav className="p-4 flex flex-col gap-2">
            {[
              { id: 'dashboard', label: '📊 ภาพรวม (Dashboard)' },
              { id: 'stock', label: '📦 คลังสินค้า (Stock)' },
              { id: 'sold', label: '🛒 ประวัติขาย (Sold)' },
              { id: 'reports', label: '📄 ออกรายงาน (Reports)' }
            ].map(menu => (
              <button key={menu.id} onClick={() => setActiveMenu(menu.id)} 
                className={`flex items-center w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 
                ${activeMenu === menu.id ? 'bg-orange-600/10 text-orange-500 border border-orange-600/30' : 'text-slate-400 hover:bg-[#111827] hover:text-slate-200'}`}>
                {menu.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600"></div>
            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">Admin Role</p><p className="text-[10px] text-emerald-400">🟢 Online</p></div>
            <button onClick={() => { setIsLoggedIn(false); setPassword(''); }} className="text-[10px] text-slate-500 hover:text-rose-400 font-bold px-2 py-1 rounded bg-slate-800">ออก</button>
          </div>
        </div>
      </div>

      {/* 🟩 MAIN CONTENT AREA (พื้นที่แสดงผลด้านขวา) */}
      <div className="main-content flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* TOP HEADER */}
        <header className="h-16 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 no-print">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black text-white hidden sm:block">
              {activeMenu === 'dashboard' && 'ภาพรวมระบบ (Dashboard)'}
              {activeMenu === 'stock' && 'คลังสินค้าและสต็อก (Inventory)'}
              {activeMenu === 'sold' && 'ประวัติการขายสินค้า (Sales History)'}
              {activeMenu === 'reports' && 'ศูนย์จัดการเอกสาร (Report Center)'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-[#1e293b] text-slate-300 text-xs px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 font-mono">
              <span>📅</span> พฤ 16 ก.ค. 2569
            </div>
            <button onClick={() => setIsInputModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-orange-900/20 transition-all">
              + นำเข้าสินค้า
            </button>
          </div>
        </header>

        {/* SCROLLABLE VIEW (สลับหน้าจอตามเมนู) */}
        {/* 🔥 เพิ่มคลาส scroll-container ให้ css ดึงไปทำลายเวลาพิมพ์ */}
        <div className="scroll-container flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">

            {/* =========================================================
              * 🚀 VIEW: DASHBOARD (ภาพรวม)
              * ========================================================= */}
            {activeMenu === 'dashboard' && (
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
                    <p className="text-[10px] mt-2 bg-black/20 inline-block px-2 py-0.5 rounded-full relative z-10">กำไรเข้ากระเป๋าจริง</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl items-center">
                  <div className="flex justify-center items-center lg:col-span-1 h-56 relative w-full border-r border-slate-800/60 pr-4">
                    {totalStockCostValue > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value">
                            {donutData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={((value: any, name: any) => [`฿${Number(value).toLocaleString()}`, name]) as any} contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (<div className="w-44 h-44 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center text-center text-slate-600 text-xs p-4 font-bold">ว่างเปล่า</div>)}
                    {totalStockCostValue > 0 && (
                      <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ทุนคลังสินค้า</span>
                      </div>
                    )}
                  </div>

                  <div className="h-56 lg:col-span-2 w-full flex flex-col justify-center pl-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">📊 สรุปงบรายรับและกำไรสุทธิแยกตามหมวด</h4>
                    <ResponsiveContainer width="100%" height="90%">
                      <BarChart data={barData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                        <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip formatter={((value: any) => [`฿${Number(value).toLocaleString()}`]) as any} contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                        <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                        <Bar dataKey="ยอดขาย" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="กำไรสุทธิ" fill="#f97316" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================
              * 📦 VIEW: STOCK (คลังสินค้าปัจจุบัน)
              * ========================================================= */}
            {activeMenu === 'stock' && (
              <div className="animate-in fade-in duration-300 bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-800 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="font-bold text-slate-300 text-base">รายการสินค้าอยู่ในสต็อก / พร้อมจำหน่าย</h2>
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-400 font-mono px-3 py-1 rounded-lg sm:ml-auto self-start sm:self-auto font-bold">
                    จำนวนในคลัง: {stockFilteredProducts.length} ชิ้น
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#111827]/40 p-3 rounded-xl border border-slate-800/60 items-center">
                  <input type="date" value={stockStartDate} onChange={(e) => setStockStartDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
                  <input type="date" value={stockEndDate} onChange={(e) => setStockEndDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
                  <select value={stockSortBy} onChange={(e) => setStockSortBy(e.target.value)} className="bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none">
                    <option value="date-desc">🕒 รับเข้า: ใหม่ ➔ เก่า</option><option value="date-asc">⏳ รับเข้า: เก่า ➔ ใหม่</option>
                    <option value="name-asc">🔤 ชื่อ: ก-ฮ / A-Z</option><option value="name-desc">🔤 ชื่อ: ฮ-ก / Z-A</option>
                    <option value="price-desc">💰 ราคา: สูง ➔ ต่ำ</option><option value="price-asc">🪙 ราคา: ต่ำ ➔ สูง</option>
                  </select>
                  <div className="relative w-full">
                    <input type="text" value={stockSearchQuery} onChange={(e) => setStockSearchQuery(e.target.value)} placeholder="🔍 ค้นหาชื่อ หรือ S/N..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-sans focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply', 'Case', 'Cooler'].map((tab) => (
                    <button key={`stock-tab-${tab}`} onClick={() => setStockTab(tab)} className={`text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${stockTab === tab ? 'bg-orange-600 text-white shadow-sm' : 'bg-[#111827] text-slate-400 hover:text-white'}`}>{tab === 'ทั้งหมด' ? '🌐 ทุกหมวด' : tab}</button>
                  ))}
                </div>

                {(() => {
                  const itemsPerPage = 9; const totalPages = Math.ceil(stockFilteredProducts.length / itemsPerPage);
                  const startIndex = (stockPage - 1) * itemsPerPage;
                  const displayedStockItems = stockFilteredProducts.slice(startIndex, startIndex + itemsPerPage);

                  if (stockFilteredProducts.length === 0) return <div className="text-center py-12 text-slate-500 text-xs font-sans">ไม่พบสินค้าในตัวกรองนี้</div>;
                  return (
                    <div className="flex flex-col gap-6 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
                        {displayedStockItems.map((item) => {
                          const cleanName = item.name.split(' [')[0];
                          return (
                            <ProductCard key={item.name} item={item}
                              onPreviewImage={setPreviewImageUrl} 
                              onEdit={(cItem) => { setEditingProduct(cItem); setEditName(cleanName); setEditSerialNumber(cItem.serial_number); setEditCost(cItem.cost.toString()); setEditPrice(cItem.price.toString()); setEditCategory(cItem.category); setEditStock(cItem.stock.toString()); setEditShippingFee('0'); setIsEditModalOpen(true); }}
                              onSell={(cItem) => { setSelectedProduct(cItem); setIsSellModalOpen(true); }}
                              onDelete={(name) => handleDelete(name)} />
                          );
                        })}
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
                  );
                })()}
              </div>
            )}

            {/* =========================================================
              * 🛒 VIEW: SOLD (ประวัติการขายออก)
              * ========================================================= */}
            {activeMenu === 'sold' && (
              <div className="animate-in fade-in duration-300 bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-slate-800 pb-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <h2 className="font-bold text-slate-300 text-base">ประวัติสินค้าจำหน่ายแล้ว / สรุปงบดุลบัญชี</h2>
                  </div>
                  <span className="text-xs bg-rose-950 text-rose-400 font-mono px-3 py-1 rounded-lg sm:ml-auto self-start sm:self-auto font-bold">
                    ปิดยอดไปแล้ว: {soldFilteredProducts.length} ดีล
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#111827]/40 p-3 rounded-xl border border-slate-800/60 items-center">
                  <input type="date" value={soldStartDate} onChange={(e) => setSoldStartDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
                  <input type="date" value={soldEndDate} onChange={(e) => setSoldEndDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-mono focus:border-orange-500 focus:outline-none" />
                  <select value={soldSortBy} onChange={(e) => setSoldSortBy(e.target.value)} className="bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs focus:outline-none">
                    <option value="date-desc">🕒 ขายเมื่อ: ล่าสุด ➔ เก่าสุด</option><option value="date-asc">⏳ ขายเมื่อ: เก่าสุด ➔ ล่าสุด</option>
                    <option value="name-asc">🔤 ชื่อ: ก-ฮ / A-Z</option><option value="name-desc">🔤 ชื่อ: ฮ-ก / Z-A</option>
                    <option value="price-desc">💰 ยอดขาย: สูง ➔ ต่ำ</option><option value="price-asc">🪙 ยอดขาย: ต่ำ ➔ สูง</option>
                  </select>
                  <div className="relative w-full">
                    <input type="text" value={soldSearchQuery} onChange={(e) => setSoldSearchQuery(e.target.value)} placeholder="🔍 ค้นหาชื่อ หรือ S/N..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-300 text-xs font-sans focus:border-orange-500 focus:outline-none" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply', 'Case', 'Cooler'].map((tab) => (
                    <button key={`sold-tab-${tab}`} onClick={() => setSoldTab(tab)} className={`text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all ${soldTab === tab ? 'bg-rose-600 text-white shadow-sm' : 'bg-[#111827] text-slate-400 hover:text-white'}`}>{tab === 'ทั้งหมด' ? '🌐 ทุกหมวด' : tab}</button>
                  ))}
                </div>

                {(() => {
                  const itemsPerPage = 9; const totalPages = Math.ceil(soldFilteredProducts.length / itemsPerPage);
                  const startIndex = (soldPage - 1) * itemsPerPage;
                  const displayedSoldItems = soldFilteredProducts.slice(startIndex, startIndex + itemsPerPage);

                  if (soldFilteredProducts.length === 0) return <div className="text-center py-12 text-slate-500 text-xs font-sans">ไม่พบประวัติการขายในตัวกรองนี้</div>;
                  return (
                    <div className="flex flex-col gap-6 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-2">
                        {displayedSoldItems.map((item) => {
                          const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
                          const sellPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
                          const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
                          const shipFee = matchShip ? parseFloat(matchShip[1]) : 0;
                          const cleanName = item.name.split(' [')[0];

                          return (
                            <ProductCard key={item.name} item={item}
                              onPreviewImage={setPreviewImageUrl} 
                              onEdit={(cItem) => { setEditingProduct(cItem); setEditName(cleanName); setEditSerialNumber(cItem.serial_number); setEditCost(cItem.cost.toString()); setEditPrice(sellPrice.toString()); setEditCategory(cItem.category); setEditStock(cItem.stock.toString()); setEditShippingFee(shipFee.toString()); setIsEditModalOpen(true); }}
                              onSell={(cItem) => { setSelectedProduct(cItem); setIsSellModalOpen(true); }}
                              onDelete={(name) => handleDelete(name)} />
                          );
                        })}
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
                  );
                })()}
              </div>
            )}

            {/* =========================================================
              * 📄 VIEW: REPORTS (ศูนย์ออกเอกสาร)
              * ========================================================= */}
            {activeMenu === 'reports' && (
              <div className="animate-in fade-in duration-300 bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-6 no-print">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <span className="text-xl">📄</span>
                  <div>
                    <h3 className="font-bold text-slate-200 text-lg">ศูนย์ออกเอกสารและรายงานบัญชีร้าน</h3>
                    <p className="text-xs text-slate-500">ตั้งค่าสไตล์เงื่อนไขคัดกรองก่อนสั่งพิมพ์ออกใบรายงานจริง</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#111827]/30 p-5 rounded-2xl border border-slate-800/50">
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">1. เลือกสถานะสินค้าในรายงาน</label>
                      <select value={docStatus} onChange={(e) => setDocStatus(e.target.value)} className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 text-sm focus:border-orange-500 focus:outline-none">
                        <option value="ทั้งหมด">🌐 รวมข้อมูลทุกอย่างในระบบ</option>
                        <option value="อยู่ในสต็อก">🟢 เฉพาะสินค้าอยู่ในสต็อก (คลังสินค้าปัจจุบัน)</option>
                        <option value="จำหน่ายแล้ว">🔴 เฉพาะสินค้าปิดดีลจำหน่ายแล้ว (ขาออกบัญชี)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">2. เลือกพิมพ์แยกหมวดหมู่</label>
                      <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3 text-slate-200 text-sm focus:border-orange-500 focus:outline-none">
                        {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply', 'Case', 'Cooler'].map(cat => (
                          <option key={cat} value={cat}>{cat === 'ทั้งหมด' ? '🌐 พิมพ์รวมทุกหมวดชิ้นส่วน' : cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">3. ขอบเขตวันที่เริ่มต้น</label>
                      <input type="date" value={docStartDate} onChange={(e) => setDocStartDate(e.target.value)} className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-200 text-sm font-mono focus:border-orange-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5 font-bold">4. ขอบเขตวันที่สิ้นสุด</label>
                      <input type="date" value={docEndDate} onChange={(e) => setDocEndDate(e.target.value)} className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-slate-200 text-sm font-mono focus:border-orange-500 focus:outline-none" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 pt-2 justify-between items-center bg-orange-950/20 p-4 rounded-xl border border-orange-900/30">
                  <div>
                    <p className="text-xs text-slate-400 mb-1">ผลลัพธ์จากตัวกรอง</p>
                    <p className="text-sm text-slate-300">พบเอกสารในระบบ <span className="text-orange-400 font-black text-xl px-2">{reportFilteredProducts.length}</span> แถวบัญชี</p>
                  </div>
                  <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={exportToExcelFromPanel} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                      📊 ดึงไฟล์ Excel
                    </button>
                    <button onClick={exportToPDF} className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2">
                      📄 พิมพ์ PDF
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ตารางพิมพ์รายงาน PDF ถูกซ่อนอยู่ด้านล่าง รอเวลาสั่ง print */}
            <div className="hidden print-table-container">
              <div className="print-report-header text-black">
                <h1 className="text-xl font-bold tracking-tight">รายงานประวัติสินค้าและสรุปงบดุลบัญชีการเงิน</h1>
                <p className="text-xs mt-1">สถานะ: {docStatus} | หมวดหมู่: {docCategory} | ช่วงวันที่: {docStartDate || 'ทั้งหมด'} ถึง {docEndDate || 'ปัจจุบัน'}</p>
              </div>
              <table>
                <thead>
                  <tr><th>วันที่</th><th>สินค้า</th><th>S/N</th><th>หมวด</th><th>สถานะ</th><th className="text-right-print">ทุน (฿)</th><th className="text-right-print">ขาย (฿)</th><th className="text-right-print">ค่าส่ง (฿)</th><th className="text-right-print">นายหน้า (฿)</th><th className="text-right-print">กำไร (฿)</th></tr>
                </thead>
                <tbody>
                  {reportFilteredProducts.map((item, idx) => {
                    const isSold = item.name.includes('ขายแล้ว');
                    const cost = item.cost || 0;
                    const sp = isSold ? parseFloat(item.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0') : 0;
                    const sf = isSold ? parseFloat(item.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0') : 0;
                    const cm = isSold ? parseFloat(item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/)?.[1] || '0') : 0;
                    const net = isSold ? (sp - cost - 30 - sf - cm) : 0;
                    const date = isSold ? (item.name.match(/เมื่อ: ([\d-]+)/)?.[1] || '-') : (item.name.match(/รับเข้า: ([\d-]+)/)?.[1] || '-');
                    return (
                      <tr key={`print-${idx}`}>
                        <td>{date}</td><td>{item.name.split(' [')[0]}</td><td className="font-mono">{item.serial_number || '-'}</td><td>{item.category}</td><td>{isSold ? 'ขายแล้ว' : 'สต็อก'}</td>
                        <td className="text-right-print">{cost.toLocaleString()}</td>
                        <td className="text-right-print">{isSold ? sp.toLocaleString() : '-'}</td>
                        <td className="text-right-print">{isSold ? sf.toLocaleString() : '-'}</td>
                        <td className="text-right-print">{isSold ? cm.toLocaleString() : '-'}</td>
                        <td className="text-right-print" style={{ color: isSold && net > 0 ? '#16a34a' : '#000' }}>{isSold ? net.toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-total-row">
                    <td colSpan={5} className="text-center font-bold">SUMMARY TOTAL</td>
                    <td className="text-right-print font-bold">฿{reportFilteredProducts.reduce((a, c) => a + (!c.name.includes('ขายแล้ว') ? (c.cost||0) : 0), 0).toLocaleString()}</td>
                    <td className="text-right-print font-bold">฿{reportFilteredProducts.reduce((a, c) => a + (c.name.includes('ขายแล้ว') ? parseFloat(c.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0') : 0), 0).toLocaleString()}</td>
                    <td className="text-right-print font-bold">฿{reportFilteredProducts.reduce((a, c) => a + (c.name.includes('ขายแล้ว') ? parseFloat(c.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0') : 0), 0).toLocaleString()}</td>
                    <td className="text-right-print font-bold">฿{reportFilteredProducts.reduce((a, c) => a + (c.name.includes('ขายแล้ว') ? parseFloat(c.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/)?.[1] || '0') : 0), 0).toLocaleString()}</td>
                    <td className="text-right-print font-bold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                      ฿{reportFilteredProducts.reduce((a, c) => {
                        if (!c.name.includes('ขายแล้ว')) return a;
                        const sp = parseFloat(c.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0');
                        const sf = parseFloat(c.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0');
                        const cm = parseFloat(c.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/)?.[1] || '0');
                        return a + (sp - (c.cost||0) - 30 - sf - cm);
                      }, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>

      {/* =========================================================
        * 🔥 POPUP MODALS
        * ========================================================= */}

      {/* 🖼️ POPUP 0: ขยายรูปภาพสลิปแบบ Lightbox */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImageUrl(null)} className="absolute -top-12 right-0 text-white hover:text-rose-500 font-bold text-xl bg-slate-800/50 w-10 h-10 rounded-full flex items-center justify-center transition-colors">✕</button>
            <img src={previewImageUrl} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700" alt="Slip Preview" />
          </div>
        </div>
      )}

      {/* 📥 POPUP 1: ลงทะเบียนของเข้าคลัง */}
      {isInputModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsInputModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-orange-400 text-base border-b border-slate-800 pb-2">📥 ลงทะเบียนสินค้าเข้าคลังใหม่</h2>
            {message && <div className="p-3 rounded-xl text-center text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">{message}</div>}
            <form onSubmit={handleReceiveSubmit} className="flex flex-col gap-3 text-xs">
              <div><label className="text-slate-400 block mb-1 font-bold">1. ชื่อสินค้า *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="เช่น Intel Core i5-14600K" /></div>
              <div><label className="text-slate-400 block mb-1 font-bold">2. ซีเรียลนัมเบอร์ (S/N) *</label><input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="ป้อนหมายเลขซีเรียล..." /></div>
              <div><label className="text-slate-400 block mb-1 font-bold">3. ระบุวันที่รับของ *</label><input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" /></div>
              <div><label className="text-orange-400 block mb-1 font-bold">4. 📸 เลือกอัปโหลดไฟล์รูปภาพสินค้าจริง *</label><input type="file" accept="image/*" onChange={(e) => setProductFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
              <div><label className="text-orange-400 block mb-1 font-bold">5. 🧾 อัปโหลดรูปสลิปโอนเงิน / ใบเสร็จหลักฐานการซื้อ *</label><input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 block mb-1 font-bold">6. ราคาทุนที่ได้มา *</label><input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ต้นทุนราคาสินค้า" /></div>
                <div><label className="text-slate-400 block mb-1 font-bold">7. ประเภทสินค้า *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm">
                    <option value="CPU">CPU</option><option value="GPU">GPU</option><option value="Memory">Memory</option><option value="Mainboard">Mainboard</option><option value="Storage">Storage</option><option value="Power Supply">Power Supply</option><option value="Case">Case</option><option value="Cooler">Cooler</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 block mb-1 font-bold">ราคาตั้งขายเบื้องต้น *</label><input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ตั้งเป้าขาย" /></div>
                <div><label className="text-slate-400 block mb-1 font-bold">จำนวนสินค้าเข้าคลัง *</label><input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="จำนวนชิ้น" /></div>
              </div>
              <button type="submit" disabled={productMutation.isPending} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl mt-2 text-sm">{productMutation.isPending ? '⏳ กำลังยิงไฟล์เข้าระบบ...' : '🚀 บันทึกข้อมูลและรูปภาพเข้าสต็อก'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 📝 POPUP 3: หน้าต่างแก้ไขสินค้า */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print font-sans">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md max-h-[90vh] overflow-y-auto relative no-scrollbar font-sans animate-in zoom-in-95 duration-200">
            <button onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-amber-500 text-base border-b border-slate-800 pb-2 font-sans">📝 โหมดแก้ไขและเพิ่มหลักฐานรูปภาพย้อนหลัง</h2>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 text-xs font-sans">
              <div><label className="text-slate-400 block mb-1 font-bold font-sans">แก้ไขชื่อสินค้า</label><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-sans focus:border-amber-500 focus:outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 block mb-1 font-bold font-sans">แก้ไข S/N</label><input type="text" value={editSerialNumber} onChange={(e) => setEditSerialNumber(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm focus:border-amber-500 focus:outline-none" /></div>
                <div><label className="text-slate-400 block mb-1 font-bold font-sans">แก้ไขหมวดหมู่</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-sans focus:border-amber-500 focus:outline-none">
                    <option value="CPU">CPU</option><option value="GPU">GPU</option><option value="Memory">Memory</option><option value="Mainboard">Mainboard</option><option value="Storage">Storage</option><option value="Power Supply">Power Supply</option><option value="Case">Case</option><option value="Cooler">Cooler</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-slate-400 block mb-1 font-bold font-sans">ราคาทุนสินค้า (บาท)</label><input type="number" step="0.01" value={editCost} onChange={(e) => setEditCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" /></div>
                <div><label className="text-slate-400 block mb-1 font-bold font-sans">{editingProduct.name.includes('ขายแล้ว') ? 'ราคาที่ปิดยอดขาย (บาท)' : 'ราคาตั้งขายสินค้า (บาท)'}</label><input type="number" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" /></div>
              </div>
              {!editingProduct.name.includes('ขายแล้ว') && (<div><label className="text-slate-400 block mb-1 font-bold font-sans">จำนวนสินค้าคงเหลือในคลัง</label><input type="number" value={editStock} onChange={(e) => setEditStock(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" /></div>)}
              {editingProduct.name.includes('ขายแล้ว') && (<div><label className="text-orange-400 block mb-1 font-bold font-sans">🚚 แก้ไขยอดค่าจัดส่งขนส่งจริง (บาท)</label><input type="number" step="0.01" value={editShippingFee} onChange={(e) => setEditShippingFee(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm font-mono focus:border-orange-500 focus:outline-none" /></div>)}
              <div className="border-t border-slate-800 pt-3 mt-1 flex flex-col gap-2.5 font-sans">
                <span className="text-amber-500 font-bold block text-[11px] font-sans">📸 อัปโหลดเปลี่ยนรูปภาพ / เพิ่มรูปภาพทีหลัง:</span>
                {!editingProduct.name.includes('ขายแล้ว') && (
                  <>
                    <div><label className="text-slate-400 block mb-1 text-[11px] font-sans">เปลี่ยนรูปภาพสินค้าจริง:</label><input type="file" accept="image/*" onChange={(e) => setEditProductFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs font-sans focus:outline-none" /></div>
                    <div><label className="text-slate-400 block mb-1 text-[11px] font-sans">เปลี่ยนรูปสลิปหลักฐานซื้อ (ทุนแท้):</label><input type="file" accept="image/*" onChange={(e) => setEditReceiptFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs font-sans focus:outline-none" /></div>
                  </>
                )}
                {editingProduct.name.includes('ขายแล้ว') && (
                  <>
                    <div><label className="text-emerald-400 block mb-1 text-[11px] font-sans">เปลี่ยนรูปภาพสลิปหลักฐานขายลูกค้า:</label><input type="file" accept="image/*" onChange={(e) => setEditSaleProofFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs font-sans focus:outline-none" /></div>
                    <div><label className="text-slate-400 block mb-1 text-[11px] font-sans">เพิ่ม/เปลี่ยน รูปภาพสลิปค่าจัดส่ง:</label><input type="file" accept="image/*" onChange={(e) => setEditSlipFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs font-sans focus:outline-none" /></div>
                    <div><label className="text-slate-400 block mb-1 text-[11px] font-sans">เพิ่ม/เปลี่ยน รูปถ่ายสินค้าตอนแพ็กของ:</label><input type="file" accept="image/*" onChange={(e) => setEditPackageFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs font-sans focus:outline-none" /></div>
                  </>
                )}
              </div>
              <button type="submit" disabled={productMutation.isPending} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-2 text-sm font-sans transition-colors">{productMutation.isPending ? '⏳ กำลังบันทึกและอัปเดตไฟล์ลงคลัง...' : '✅ ยืนยันและบันทึกการแก้ไขทั้งหมด'}</button>
            </form>
          </div>
        </div>
      )}

      {/* 📤 POPUP 2: บันทึกการขายออก */}
      {isSellModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsSellModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-emerald-400 text-base border-b border-slate-800 pb-2">💰 บันทึกยอดขายและสรุปหลักฐานข้อมูล</h2>
            <div className="bg-[#111827] p-3 rounded-xl border border-slate-800 text-xs">
              <p className="text-slate-400">สินค้า: <span className="text-white font-bold">{selectedProduct.name.split(' [')[0]}</span></p>
              <p className="text-slate-400 mt-1">ราคาทุนสินค้า: <span className="text-orange-400 font-mono">฿{selectedProduct.cost.toLocaleString()}</span> | ค่าแพ็กเกจบังคับ: <span className="text-slate-300 font-bold">฿30</span></p>
            </div>
            <form onSubmit={handleSellSubmit} className="flex flex-col gap-3 text-xs">
              <div><label className="text-xs font-bold text-slate-400 block mb-1">1. ใส่ราคาขายจริงที่ปิดยอดได้</label><input type="number" step="0.01" value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-base font-bold focus:border-emerald-500 focus:outline-none" placeholder="฿ ยอดขายปิดดีล..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-slate-400 block mb-1">➕ ระบุค่าส่งจริง (ชำระขนส่ง)</label><input type="number" step="0.01" value={shippingFee} onChange={(e) => setShippingFee(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" placeholder="฿ เช่น 40, 50" /></div>
                <div><label className="text-xs font-bold text-slate-400 block mb-1">🕒 ขายเมื่อไหร่</label><input type="date" value={soldAt} onChange={(e) => setSoldAt(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" /></div>
              </div>
              {soldPrice && (
                <div className="bg-[#111827] p-3 rounded-xl border border-slate-800 flex flex-col gap-1 text-[11px] text-slate-400">
                  <div className="flex justify-between"><span>💵 สูตรกำไรเบื้องต้น:</span><span className="text-slate-200 font-mono">฿{(parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between text-amber-400 font-medium"><span>✂️ ค่านายหน้าหัก 3% จากกำไร:</span><span className="font-mono">฿{((parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)) > 0 ? (parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)) * 0.03 : 0).toLocaleString(undefined, {maximumFractionDigits: 2})}</span></div>
                </div>
              )}
              <div><label className="text-emerald-400 font-bold block mb-1">🧾 อัปโหลดไฟล์ภาพหลักฐานซื้อขาย / สลิปโอนเงินลูกค้า *</label><input type="file" accept="image/*" onChange={(e) => setSaleProofFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
              <div><label className="text-slate-400 font-bold block mb-1">🚚 อัปโหลดไฟล์ภาพสลิปใบเสร็จค่าขนส่ง (ถ้ามี)</label><input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
              <div><label className="text-slate-400 font-bold block mb-1">📸 อัปโหลดไฟล์รูปถ่ายสินค้าตอนแพ็กหรือส่ง (ถ้ามี)</label><input type="file" accept="image/*" onChange={(e) => setPackageFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" /></div>
              <button type="submit" disabled={productMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-1 text-sm">{productMutation.isPending ? '⏳ กำลังอัปโหลดภาพและเซฟงบลง Database...' : '✅ ยืนยันปิดดีลและบันทึกหลักฐานทั้งหมด'}</button>
            </form>
          </div>
        </div>
      )}

      </div>
  );
}