'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import * as XLSX from 'xlsx'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
}

export default function HomeMonitor() {
  const queryClient = useQueryClient();

  // --- ตัวแปรเช็คการ Mount ของคอมโพเนนต์ป้องกันปัญหาฝั่ง Client ---
  const [hasMounted, setHasMounted] = useState(false);

  // --- ระบบล็อกอินความปลอดภัยหน้าร้าน ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ระบบเปิด/ปิด Popup ---
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); 

  // --- ระบบ Filter หมวดหมู่, ช่วงวันที่ และสถานะสินค้า ---
  const [selectedTab, setSelectedTab] = useState('ทั้งหมด');
  const [startDate, setStartDate] = useState(''); 
  const [endDate, setEndDate] = useState('');     
  const [selectedStatus, setSelectedStatus] = useState('ทั้งหมด'); 

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
  const [editShippingFee, setEditShippingFee] = useState('');

  // ฟอร์มบันทึกการขายออก
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [soldPrice, setSoldPrice] = useState('');
  const [shippingFee, setShippingFee] = useState(''); 
  const [saleProofFile, setSaleProofFile] = useState<File | null>(null); // ➕ เพิ่มเก็บไฟล์หลักฐานซื้อขายของลูกค้า
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

  // ==========================================
  // ⚡ 2. ใช้ MUTATIONS จัดการ CUD และล้าง Cache อัตโนมัติ
  // ==========================================
  const productMutation = useMutation({
    mutationFn: async ({ url, method, body }: { url: string; method: string; body: any }) => {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error('เกิดข้อผิดพลาดในการประมวลผลเซิร์ฟเวอร์');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) { 
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('❌ รหัสผ่านแอดมินไม่ถูกต้อง!');
    }
  };

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
    setMessage('');
    
    try {
      let finalImageUrl = 'https://picsum.photos/200'; 
      let receiptUrl = 'ไม่มีหลักฐานซื้อ';
      
      if (productFile) {
        setMessage('⏳ กำลังยิงไฟล์รูปภาพสินค้าเข้า Database...');
        finalImageUrl = await uploadImageToStorage(productFile, 'items');
      }

      if (receiptFile) {
        setMessage('⏳ กำลังยิงไฟล์รูปหลักฐานการซื้อเข้า Database...');
        receiptUrl = await uploadImageToStorage(receiptFile, 'receipts');
      }

      const finalCost = parseFloat(cost) || 0;
      const finalName = `${name} [รับเข้า: ${receivedAt} | หลักฐานซื้อ: ${receiptUrl}]`;

      setMessage('⏳ กำลังบันทึกข้อมูลเข้าคลัง...');
      
      await productMutation.mutateAsync({
        url: '/api/products',
        method: 'POST',
        body: {
          name: finalName,
          cost: finalCost, 
          price: parseFloat(price) || 0,
          stock: parseFloat(stock) || 1,
          serial_number: serialNumber || '',
          category: category,
          image_url: finalImageUrl 
        }
      });

      setMessage("🎉 บันทึกข้อมูลและจัดเก็บรูปภาพสินค้าสำเร็จ!");
      setName(''); setSerialNumber(''); setProductFile(null); setReceiptFile(null); setCost(''); setPrice('');
      setTimeout(() => { setIsInputModalOpen(false); setMessage(''); }, 1200);
      
    } catch (err: any) {
      setMessage("ข้อผิดพลาด: " + err.message);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const isSold = editingProduct.name.includes('ขายแล้ว');
      let updatedName = '';

      if (isSold) {
        const matchPrice = editingProduct.name.match(/ขายแล้ว ฿([\d.]+)/);
        const matchReceipt = editingProduct.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
        const matchSaleProof = editingProduct.name.match(/หลักฐานขาย: ([^\s|]+)/);
        const matchProof = editingProduct.name.match(/สลิปส่ง: ([^\s|]+)/);
        const matchPkg = editingProduct.name.match(/ภาพส่ง: ([^\s|]+)/);
        const matchTime = editingProduct.name.match(/เมื่อ: ([\d-]+)/);

        const sPrice = matchPrice ? parseFloat(matchPrice[1]) : editingProduct.price;
        const originalBuyReceipt = matchReceipt ? matchReceipt[1] : 'ไม่มีหลักฐานซื้อ';
        const saleProofUrl = matchSaleProof ? matchSaleProof[1] : 'ไม่มีหลักฐาน';
        const slipUrl = matchProof ? matchProof[1] : 'ไม่มีหลักฐาน';
        const packageUrl = matchPkg ? matchPkg[1] : 'ไม่มีภาพถ่ายเพิ่มเติม';
        const soldDate = matchTime ? matchTime[1] : 'ไม่ระบุ';

        const newShipFee = parseFloat(editShippingFee) || 0;
        const baseProfit = sPrice - editingProduct.cost - 30 - newShipFee;
        const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;

        updatedName = `${editName} [หลักฐานซื้อ: ${originalBuyReceipt}] [🔴 ขายแล้ว ฿${sPrice} | หัก 3% จากกำไร: ฿${commission.toFixed(2)} | ค่าส่ง: ฿${newShipFee} | หลักฐานขาย: ${saleProofUrl} | สลิปส่ง: ${slipUrl} | ภาพส่ง: ${packageUrl} | เมื่อ: ${soldDate}]`;
      } else {
        const matchReceive = editingProduct.name.match(/รับเข้า: ([\d-]+)/);
        const matchReceipt = editingProduct.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
        const originalDate = matchReceive ? matchReceive[1] : new Date().toISOString().slice(0, 10);
        const originalReceipt = matchReceipt ? matchReceipt[1] : 'ไม่มีหลักฐานซื้อ';

        updatedName = `${editName} [รับเข้า: ${originalDate} | หลักฐานซื้อ: ${originalReceipt}]`;
      }

      await productMutation.mutateAsync({
        url: '/api/products',
        method: 'DELETE',
        body: { name: editingProduct.name }
      });

      await productMutation.mutateAsync({
        url: '/api/products',
        method: 'POST',
        body: {
          name: updatedName,
          cost: editingProduct.cost,
          price: isSold ? parseFloat(editingProduct.price.toString()) : editingProduct.price,
          stock: editingProduct.stock,
          serial_number: editSerialNumber,
          category: editingProduct.category,
          image_url: editingProduct.image_url
        }
      });

      alert('🎉 อัปเดตข้อมูลและคำนวณงบบัญชีใหม่สำเร็จ!');
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      alert("ข้อผิดพลาด: " + err.message);
    }
  };

  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    // 🛑 บังคับเช็ค: ต้องเลือกไฟล์ภาพหลักฐานซื้อขาย/โอนเงินของลูกค้าก่อนปิดดีล
    if (!saleProofFile) {
      alert("❌ บังคับ! กรุณาอัปโหลดไฟล์ภาพหลักฐานซื้อขายหรือสลิปโอนเงินของลูกค้าก่อนยืนยัน");
      return;
    }

    try {
      let saleProofUrl = 'ไม่มีหลักฐาน';
      let slipUrl = 'ไม่มีหลักฐาน';
      let packageUrl = 'ไม่มีภาพถ่ายเพิ่มเติม';

      saleProofUrl = await uploadImageToStorage(saleProofFile, 'sales_proofs');

      if (slipFile) {
        slipUrl = await uploadImageToStorage(slipFile, 'slips');
      }

      if (packageFile) {
        packageUrl = await uploadImageToStorage(packageFile, 'packages');
      }

      const sPrice = parseFloat(soldPrice) || 0;
      const sFee = parseFloat(shippingFee) || 0; 
      const packFee = 30;
      
      const baseProfit = sPrice - selectedProduct.cost - packFee - sFee;
      const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;

      const matchBuyReceipt = selectedProduct.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
      const originalBuyReceipt = matchBuyReceipt ? matchBuyReceipt[1] : 'ไม่มีหลักฐานซื้อ';

      const cleanBaseName = selectedProduct.name.split(' [')[0];
      const soldName = `${cleanBaseName} [หลักฐานซื้อ: ${originalBuyReceipt}] [🔴 ขายแล้ว ฿${sPrice} | หัก 3% จากกำไร: ฿${commission.toFixed(2)} | ค่าส่ง: ฿${sFee} | หลักฐานขาย: ${saleProofUrl} | สลิปส่ง: ${slipUrl} | ภาพส่ง: ${packageUrl} | เมื่อ: ${soldAt}]`;

      await productMutation.mutateAsync({
        url: '/api/products',
        method: 'DELETE',
        body: { name: selectedProduct.name }
      });

      await productMutation.mutateAsync({
        url: '/api/products',
        method: 'POST',
        body: {
          name: soldName,
          cost: selectedProduct.cost,
          price: sPrice, 
          stock: 0,      
          serial_number: selectedProduct.serial_number,
          category: selectedProduct.category,
          image_url: selectedProduct.image_url
        }
      });

      alert('🎉 บันทึกยอดขายและเก็บหลักฐานเข้า Database สำเร็จ!');
      setSoldPrice('');
      setShippingFee('');
      setSaleProofFile(null);
      setSlipFile(null);
      setPackageFile(null);
      setIsSellModalOpen(false);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  const handleDelete = async (productName: string) => {
    if (!confirm(`ต้องการลบรายการคลัง "${productName}" ออกถาวรใช่ไหม?`)) return;
    try {
      await productMutation.mutateAsync({
        url: '/api/products',
        method: 'DELETE',
        body: { name: productName }
      });
    } catch (err) { 
      console.error(err); 
    }
  };

  // --- ระบบคัดกรองข้อมูล ---
  const filteredProducts = products.filter((item) => {
    if (selectedTab !== 'ทั้งหมด' && item.category !== selectedTab) return false;

    const isSold = item.name.includes('ขายแล้ว');
    if (selectedStatus === 'อยู่ในสต็อก' && isSold) return false;
    if (selectedStatus === 'จำหน่ายแล้ว' && !isSold) return false;

    const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
    const matchSell = item.name.match(/เมื่อ: ([\d-]+)/);
    const itemDate = matchSell ? matchSell[1] : (matchReceive ? matchReceive[1] : '');
    if (startDate && itemDate && itemDate < startDate) return false;
    if (endDate && itemDate && itemDate > endDate) return false;

    return true;
  });

  const exportToExcel = () => {
    if (filteredProducts.length === 0) {
      alert('❌ ไม่มีข้อมูลในตารางที่จะ Export ในขณะนี้!');
      return;
    }

    const reportData = filteredProducts.map((item, index) => {
      const isSold = item.name.includes('ขายแล้ว');
      const cleanName = item.name.split(' [')[0];
      
      const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
      const matchReceipt = item.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
      const matchSaleProof = item.name.match(/หลักฐานขาย: ([^\s|]+)/);
      const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
      const matchComm = item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/);
      const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
      const matchProof = item.name.match(/สลิปส่ง: ([^\s|]+)/);
      const matchPkg = item.name.match(/ภาพส่ง: ([^\s|]+)/);
      const matchTime = item.name.match(/เมื่อ: ([\d-]+)/);

      const sellPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
      const shipFee = matchShip ? parseFloat(matchShip[1]) : 0;
      const baseProfit = isSold ? (sellPrice - item.cost - 30 - shipFee) : 0;
      const commission = matchComm ? parseFloat(matchComm[1]) : (baseProfit > 0 ? baseProfit * 0.03 : 0);
      const netProfit = baseProfit - commission;

      return {
        'ลำดับ': index + 1,
        'ชื่อสินค้า': cleanName,
        'Serial Number (S/N)': item.serial_number || 'ไม่มีรหัส',
        'หมวดหมู่': item.category,
        'สถานะ': isSold ? 'ขายแล้ว' : `สต็อก (${item.stock} ชิ้น)`,
        'ราคาทุนรับเข้า (บาท)': item.cost,
        'ราคาปิดยอดขาย (บาท)': isSold ? sellPrice : '-',
        'ค่าจัดส่งขนส่ง (บาท)': isSold ? shipFee : '-',
        'ค่านายหน้า 3% (บาท)': isSold ? Math.max(0, commission) : '-',
        'กำไรสุทธิ NET PROFIT (บาท)': isSold ? Math.max(0, netProfit) : '-',
        'วันที่รับเข้า': matchReceive ? matchReceive[1] : 'ไม่ระบุ',
        'วันที่ปิดดีลขาย': isSold ? (matchTime ? matchTime[1] : 'ไม่ระบุ') : '-',
        'ลิงก์ภาพสินค้าจริง': item.image_url || 'ไม่มีรูป',
        'ลิงก์สลิปทุนซื้อ': matchReceipt ? matchReceipt[1] : 'ไม่มีสลิป',
        'ลิงก์หลักฐานซื้อขายลูกค้า': matchSaleProof ? matchSaleProof[1] : 'ไม่มีหลักฐาน',
        'ลิงก์สลิปจัดส่ง': matchProof ? matchProof[1] : 'ไม่มีสลิป',
        'ลิงก์ภาพถ่ายตอนแพ็ก': matchPkg ? matchPkg[1] : 'ไม่มีภาพ'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ERP_Financial_Report');

    const fileName = `ERP_Report_${selectedTab}_${selectedStatus}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const exportToPDF = () => {
    window.print();
  };

  // --- แผงคำนวณงบภาพรวมหน้าร้าน ---
  let totalSalesAll = 0;
  let totalCommissionAll = 0;
  let totalProductCostAll = 0; 
  let totalNetProfitAll = 0;   
  let totalStockCostValue = 0; 
  let totalShippingFeeAll = 0; 

  const categoryCostMap: Record<string, number> = {
    'CPU': 0, 'GPU': 0, 'Memory': 0, 'Mainboard': 0, 'Storage': 0, 'Power Supply / Case': 0
  };

  const categoryColors: Record<string, { stroke: string; text: string; bg: string }> = {
    'CPU': { stroke: '#f97316', text: 'text-orange-500', bg: 'bg-orange-500' },
    'GPU': { stroke: '#3b82f6', text: 'text-blue-500', bg: 'bg-blue-500' },
    'Memory': { stroke: '#ec4899', text: 'text-pink-500', bg: 'bg-pink-500' },
    'Mainboard': { stroke: '#10b981', text: 'text-emerald-500', bg: 'bg-emerald-500' },
    'Storage': { stroke: '#a855f7', text: 'text-purple-500', bg: 'bg-purple-500' },
    'Power Supply / Case': { stroke: '#eab308', text: 'text-yellow-500', bg: 'bg-yellow-500' }
  };

  products.forEach((item) => {
    const isSold = item.name.includes('ขายแล้ว');
    const cost = item.cost || 0;

    if (!isSold) {
      totalStockCostValue += cost;
      if (categoryCostMap[item.category] !== undefined) {
        categoryCostMap[item.category] += cost;
      }
    }
  });

  // --- จัดเตรียมข้อมูลการเงินแยกตามหมวดหมู่ (สำหรับกราฟแท่ง) ---
  const categoryFinancialMap: Record<string, { sales: number; profit: number }> = {
    'CPU': { sales: 0, profit: 0 },
    'GPU': { sales: 0, profit: 0 },
    'Memory': { sales: 0, profit: 0 },
    'Mainboard': { sales: 0, profit: 0 },
    'Storage': { sales: 0, profit: 0 },
    'Power Supply / Case': { sales: 0, profit: 0 }
  };

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
      totalShippingFeeAll += ship;

      if (categoryFinancialMap[item.category]) {
        categoryFinancialMap[item.category].sales += sPrice;
        categoryFinancialMap[item.category].profit += netProfit;
      }
    }
  });

  const donutData = Object.keys(categoryCostMap).map((cat) => ({
    name: cat,
    value: categoryCostMap[cat],
    color: categoryColors[cat]?.stroke || '#64748b'
  })).filter(item => item.value > 0);

  const barData = Object.keys(categoryFinancialMap).map((cat) => ({
    category: cat,
    'ยอดขาย': categoryFinancialMap[cat].sales,
    'กำไรสุทธิ': categoryFinancialMap[cat].profit
  }));

  if (!hasMounted) {
    return <div className="min-h-screen bg-[#0f172a]" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xl font-black text-white">🔐 ERP Login</h2>
            <p className="text-slate-400 text-xs mt-1">กรุณากรอกรหัสผ่านแอดมินเพื่อเข้าสู่บอร์ดควบคุม</p>
          </div>
          {loginError && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 p-2.5 rounded-xl text-center font-bold">
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

  const globalLoading = isProductsLoading || productMutation.isPending;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 p-4 md:p-8">
      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 15mm; }
          body { background-color: #ffffff !important; color: #000000 !important; font-family: sans-serif; }
          .no-print { display: none !important; }
          .min-h-screen { background-color: transparent !important; padding: 0 !important; }
          .print-report-header { display: block !important; margin-bottom: 20px; border-bottom: 2px solid #000000; padding-bottom: 10px; }
          .print-table-container { display: block !important; width: 100% !important; margin-top: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; color: #000000 !important; }
          th, td { border: 1px solid #666666 !important; padding: 8px 10px; text-align: left; }
          th { background-color: #f1f5f9 !important; font-weight: bold; text-transform: uppercase; font-size: 10px; }
          .text-right-print { text-align: right !important; font-family: monospace; }
          .bg-total-row { background-color: #f8fafc !important; font-weight: bold; }
        }
      `}</style>

      {/* 📄 ส่วนหัวรายงานสำหรับพิมพ์ลงกระดาษ PDF */}
      <div className="hidden print-report-header text-black">
        <h1 className="text-xl font-bold tracking-tight">รายงานประวัติสินค้าและสรุปงบดุลบัญชีการเงิน</h1>
        <p className="text-xs mt-1">ประเภทหมวดหมู่: <span className="font-bold">{selectedTab}</span> | ตัวกรองสถานะ: <span className="font-bold">{selectedStatus}</span></p>
        <p className="text-[11px] text-gray-600 mt-1">
          ช่วงวันที่: {startDate ? startDate : 'เริ่มต้นระบบ'} ถึง {endDate ? endDate : new Date().toISOString().slice(0, 10)}
        </p>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        
        {/* หัวเว็บ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1e293b] p-5 rounded-2xl border border-slate-800 shadow-xl no-print">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white">🖥️ ERP Monitor & Stock Manager</h1>
              {isProductsFetching && <span className="text-xs text-orange-400 animate-pulse bg-orange-950/50 border border-orange-900 px-2 py-0.5 rounded-full">🔄 ซิงค์ข้อมูลอัตโนมัติ...</span>}
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-1">บอร์ดคลังสินค้าอัจฉริยะ (ขับเคลื่อนด้วย TanStack Query & Recharts)</p>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button onClick={() => setIsInputModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold py-2.5 px-5 rounded-xl shadow-md">📥 ลงทะเบียนรับสินค้า</button>
            <button onClick={() => { setIsLoggedIn(false); setPassword(''); }} className="bg-slate-800 text-slate-400 border border-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl">🚪 ออก</button>
          </div>
        </div>

        {/* 📊 แผงสรุปผลกำไร */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
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

        {/* 📊 แผง Dashboard อัจฉริยะด้วย Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-xl items-center no-print">
          
          {/* ฝั่งซ้าย: ข้อมูลตัวเลขสรุปทรัพย์สิน */}
          <div className="flex flex-col justify-between gap-4 lg:col-span-1 h-full py-1">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">📦 สรุปมูลค่าทรัพย์สินคลังปัจจุบัน</h3>
              <div className="text-3xl font-black text-white mt-1">฿{totalStockCostValue.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
              <p className="text-xs text-slate-500 leading-relaxed mt-2">คำนวณจากราคาทุนเพียว ๆ ของรายการสินค้าทั้งหมดที่ยังสแตนด์บายอยู่ในสถานะสต็อกแยกตามประเภท</p>
            </div>
            
            {/* รายการ Badge บอกสัดส่วน */}
            <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-400 mt-2">
              {Object.keys(categoryCostMap).map((cat) => {
                const costValue = categoryCostMap[cat];
                const percent = totalStockCostValue > 0 ? (costValue / totalStockCostValue) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center justify-between bg-[#111827]/40 py-1.5 px-3 rounded-xl border border-slate-900/60 hover:border-slate-800 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: categoryColors[cat]?.stroke }} />
                      <span className="font-bold text-slate-200 truncate text-[11px]">{cat}</span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 shrink-0 ml-2">
                      ฿{costValue.toLocaleString()} <span className="text-slate-500 text-[10px]">({percent.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* ฝั่งกลาง: กราฟวงกลม Donut Chart */}
          <div className="flex justify-center items-center lg:col-span-1 h-56 relative w-full">
            {totalStockCostValue > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={((value: any, name: any) => [`฿${Number(value).toLocaleString()}`, name]) as any}
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '12px', color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-44 h-44 rounded-full border-4 border-dashed border-slate-800 flex items-center justify-center text-center text-slate-600 text-xs p-4 font-bold">🛒 คลังสินค้าว่างเปล่า</div>
            )}
            {totalStockCostValue > 0 && (
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Asset</span>
                <span className="text-xs font-black text-white mt-0.5">คลังสินค้า</span>
              </div>
            )}
          </div>

          {/* ฝั่งขวา: กราฟแท่งเปรียบเทียบ ยอดขาย VS กำไรสุทธิ */}
          <div className="h-56 lg:col-span-1 w-full flex flex-col justify-center">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 text-center lg:text-left">📊 สรุปงบรายรับและกำไรสุทธิแยกตามหมวด</h4>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <XAxis 
                  dataKey="category" 
                  tick={{ fill: '#94a3b8', fontSize: 9 }} 
                  axisLine={false} 
                  tickLine={false} 
                  interval={0}
                  angle={-25}        
                  textAnchor="end"   
                  height={45}        
                />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={((value: any) => [`฿${Number(value).toLocaleString()}`]) as any}
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                <Bar dataKey="ยอดขาย" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="กำไรสุทธิ" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* 📅 แผงเครื่องมือควบคุม */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-[#1e293b] p-4 rounded-xl border border-slate-800 items-center no-print">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white font-mono text-sm" />
          
          <button onClick={exportToExcel} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5">
            📊 Export เป็น Excel
          </button>
          <button onClick={exportToPDF} className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-black py-2.5 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5">
            📄 Print / Save เป็น PDF
          </button>
          
          <div className="text-xs text-slate-400 md:text-right md:col-span-1">กรองพบทั้งหมด <span className="text-orange-400 font-bold text-sm">{filteredProducts.length}</span> ชิ้น</div>
        </div>

        {/* ตัวกรองสถานะสินค้า */}
        <div className="flex flex-wrap gap-2 bg-[#1e293b] p-3 rounded-xl border border-slate-800 no-print">
          {[
            { id: 'ทั้งหมด', label: '🌐 แสดงทุกสถานะ' },
            { id: 'อยู่ในสต็อก', label: '🟢 อยู่ในสต็อก (คลังสินค้า)' },
            { id: 'จำหน่ายแล้ว', label: '🔴 จำหน่ายแล้ว (ปิดดีล)' }
          ].map((status) => (
            <button
              key={status.id}
              onClick={() => setSelectedStatus(status.id)}
              className={`text-xs font-bold py-2 px-4 rounded-lg transition-all ${selectedStatus === status.id ? 'bg-emerald-600 text-white shadow-md font-extrabold' : 'bg-[#111827] text-slate-400 hover:text-white'}`}
            >
              {status.label}
            </button>
          ))}
        </div>

        {/* หมวดหมู่ */}
        <div className="flex flex-wrap gap-2 bg-[#1e293b] p-3 rounded-xl border border-slate-800 no-print">
          {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply / Case'].map((tab) => (
            <button key={tab} onClick={() => setSelectedTab(tab)} className={`text-xs font-bold py-2 px-4 rounded-lg transition-all ${selectedTab === tab ? 'bg-orange-600 text-white shadow-md' : 'bg-[#111827] text-slate-400 hover:text-white'}`}>{tab === 'ทั้งหมด' ? '🌐 รวมทุกชนิด' : tab}</button>
          ))}
        </div>

        {/* 📋 SECTION ตารางสำหรับปริ้น (PDF) */}
        <div className="hidden print-table-container">
          <table>
            <thead>
              <tr>
                <th>วันที่ทำรายการ</th>
                <th>รายละเอียดสินค้า</th>
                <th>Serial Number (S/N)</th>
                <th>หมวดหมู่</th>
                <th>สถานะ</th>
                <th className="text-right-print">ต้นทุนรับเข้า (฿)</th>
                <th className="text-right-print">ราคาปิดการขาย (฿)</th>
                <th className="text-right-print">ค่าขนส่งจริง (฿)</th>
                <th className="text-right-print">นายหน้า 3% (฿)</th>
                <th className="text-right-print">กำไรสุทธิ (฿)</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => {
                const isSold = item.name.includes('ขายแล้ว');
                const cost = item.cost || 0;
                const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
                const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
                const matchComm = item.name.match(/หัก 3% จากกำไร: ฿([\d.]+)/);
                const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
                const matchTime = item.name.match(/เมื่อ: ([\d-]+)/);

                const sellPrice = matchPrice ? parseFloat(matchPrice[1]) : item.price;
                const shipFee = matchShip ? parseFloat(matchShip[1]) : 0;
                const displayDate = isSold ? (matchTime ? matchTime[1] : 'ไม่ระบุ') : (matchReceive ? matchReceive[1] : 'ไม่ระบุ');
                const cleanName = item.name.split(' [')[0];

                const baseProfit = sellPrice - cost - 30 - shipFee;
                const commission = matchComm ? parseFloat(matchComm[1]) : (baseProfit > 0 ? baseProfit * 0.03 : 0);
                const itemNetProfit = baseProfit - commission;

                return (
                  <tr key={item.name}>
                    <td>{displayDate}</td>
                    <td>{cleanName}</td>
                    <td className="font-mono">{item.serial_number || '-'}</td>
                    <td>{item.category}</td>
                    <td>{isSold ? 'ขายแล้ว' : 'ในสต็อก'}</td>
                    <td className="text-right-print">฿{cost.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="text-right-print">{isSold ? `฿${sellPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>
                    <td className="text-right-print">{isSold ? `฿${shipFee.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>
                    <td className="text-right-print">{isSold ? `฿${commission.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}</td>
                    <td className="text-right-print" style={{ color: isSold && itemNetProfit > 0 ? '#10b981' : '#000' }}>
                      {isSold ? `฿${itemNetProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}` : '-'}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-total-row">
                <td colSpan={5} style={{ textAlign: 'center', fontWeight: 'bold' }}>รวมผลยอดบัญชีทั้งหมด (TOTAL)</td>
                <td className="text-right-print font-bold">฿{products.reduce((acc, cur) => acc + (!cur.name.includes('ขายแล้ว') ? cur.cost : 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2})} (ในคลัง)</td>
                <td className="text-right-print font-bold">฿{totalSalesAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td className="text-right-print font-bold">฿{totalShippingFeeAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td className="text-right-print font-bold">฿{totalCommissionAll.toLocaleString(undefined, {maximumFractionDigits: 2})}</td>
                <td className="text-right-print font-bold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  ฿{totalNetProfitAll.toLocaleString(undefined, {maximumFractionDigits: 2})}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ตู้โชว์การ์ดสินค้า Monitor บนหน้าเว็บ */}
        <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-800 flex flex-col gap-4 no-print">
          <h2 className="font-bold text-slate-300 text-base border-b border-slate-800 pb-3">📦 รายการสต็อกสินค้าและบันทึกประวัติงบการเงิน ({selectedTab} | {selectedStatus})</h2>

          {globalLoading ? (
            <div className="text-center py-24 text-slate-400 text-sm animate-pulse">⏳ ระบบกำลังประมวลผลข้อมูล Realtime...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-24 text-slate-500 text-sm">ไม่พบประวัติสินค้าในช่วงนี้</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[650px] pb-6 pr-1 no-scrollbar">
              {filteredProducts.map((item) => {
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
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">💵 ต้นทุนรับเข้าสินค้า (ทุนแท้):</span>
                          <span className="text-slate-200 font-bold">฿{cost.toLocaleString()}</span>
                        </div>
                        {buyReceiptUrl && buyReceiptUrl.startsWith('http') && (
                          <div className="flex justify-between text-[11px] items-center mt-0.5 border-b border-dashed border-slate-800/60 pb-1.5">
                            <span className="text-slate-500">🧾 หลักฐานสลิปทุนซื้อ:</span>
                            <a href={buyReceiptUrl} target="_blank" rel="noreferrer" className="text-orange-400 underline font-semibold hover:text-orange-300">🔗 ดูรูปสลิปตอนซื้อ</a>
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
                              <a href={saleProofUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold hover:text-emerald-300">🔗 ดูรูปสลิปซื้อขาย</a>
                            </div>
                          )}

                          {proofUrl && proofUrl.startsWith('http') && (
                            <div className="flex justify-between text-[11px] items-center mt-0.5">
                              <span className="text-slate-500">🧾 สลิปส่งของ:</span>
                              <a href={proofUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold hover:text-indigo-300">🔗 ดูรูปสลิปค่าส่งของ</a>
                            </div>
                          )}

                          {pkgUrl && pkgUrl.startsWith('http') && (
                            <div className="flex justify-between text-[11px] items-center mt-0.5">
                              <span className="text-slate-500">📸 ภาพถ่ายแพ็กของสินค้า:</span>
                              <a href={pkgUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline font-semibold hover:text-indigo-300">🔗 ดูรูปสินค้าตอนแพ็ก</a>
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
                        <button 
                          onClick={() => { 
                            setEditingProduct(item); 
                            setEditName(cleanName); 
                            setEditSerialNumber(item.serial_number); 
                            const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
                            setEditShippingFee(matchShip ? matchShip[1] : '0');
                            setIsEditModalOpen(true); 
                          }} 
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1.5 px-3.5 rounded-lg transition-colors"
                        >
                          📝 แก้ไข
                        </button>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
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
              <div>
                <label className="text-orange-400 block mb-1 font-bold">5. 🧾 อัปโหลดรูปสลิปโอนเงิน / ใบเสร็จหลักฐานการซื้อ (ทุนแท้)</label>
                <input type="file" accept="image/*" onChange={(e) => setReceiptFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">6. ราคาทุนที่ได้มา (ทุนแท้เพียวๆ)</label>
                  <input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm" placeholder="฿ ต้นทุนราคาสินค้า" />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-bold">7. ประเภทสินค้า</label>
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
              <button type="submit" disabled={productMutation.isPending} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-xl mt-2 text-sm">
                {productMutation.isPending ? '⏳ กำลังยิงไฟล์เข้าระบบ...' : '🚀 บันทึกข้อมูลและรูปภาพเข้าสต็อก'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📝 POPUP 3: หน้าต่างแก้ไขสินค้า */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
            <button onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-amber-500 text-base border-b border-slate-800 pb-2">📝 แก้ไขรายละเอียดข้อมูลสินค้า</h2>
            <div className="bg-[#111827] p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <p>⚠️ ระบบอนุญาตให้แก้ไขเฉพาะ ชื่อสินค้า, S/N และค่าจัดส่ง (สำหรับชิ้นที่ขายออกแล้ว)</p>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-bold">1. แก้ไขชื่อสินค้า</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-slate-400 block mb-1 font-bold">2. แก้ไขรหัสซีเรียลนัมเบอร์ (S/N)</label>
                <input type="text" value={editSerialNumber} onChange={(e) => setEditSerialNumber(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm font-mono focus:border-amber-500 focus:outline-none" />
              </div>
              
              {/* ช่องกรอกค่าส่งที่จะโชว์ให้แก้เฉพาะรายการสินค้าที่ขายแล้วเท่านั้น */}
              {editingProduct.name.includes('ขายแล้ว') && (
                <div>
                  <label className="text-orange-400 block mb-1 font-bold">➕ แก้ไขยอดค่าจัดส่งจริง (ชำระขนส่ง)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editShippingFee} 
                    onChange={(e) => setEditShippingFee(e.target.value)} 
                    required 
                    className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm font-mono focus:border-orange-500 focus:outline-none" 
                    placeholder="แก้ไขจำนวนเงินค่าส่ง..." 
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-[#111827]/40 p-2.5 rounded-xl border border-slate-800/60 text-[11px] text-slate-500">
                <div>📁 หมวดหมู่: <span className="text-slate-300 font-bold">{editingProduct.category}</span></div>
                <div>💰 ราคาทุนคลัง: <span className="text-slate-300 font-bold">฿{editingProduct.cost.toLocaleString()}</span></div>
              </div>
              <button type="submit" disabled={productMutation.isPending} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-1 text-sm transition-colors">
                {productMutation.isPending ? '⏳ กำลังบันทึกข้อมูลแก้ไขลง Database...' : '✅ ยืนยันและบันทึกการแก้ไข'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 📤 POPUP 2: บันทึกการขายออก */}
      {isSellModalOpen && selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative">
            <button onClick={() => setIsSellModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
            <h2 className="font-bold text-emerald-400 text-base border-b border-slate-800 pb-2">💰 บันทึกยอดขายและสรุปหลักฐานข้อมูล</h2>
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
                    <span>💵 สูตรกำไรเบื้องต้น:</span>
                    <span className="text-slate-200 font-mono">
                      ฿{(parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-medium">
                    <span>✂️ ค่านายหน้าหัก 3% จากกำไร:</span>
                    <span className="font-mono">
                      ฿{((parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)) > 0 
                        ? (parseFloat(soldPrice) - selectedProduct.cost - 30 - (parseFloat(shippingFee) || 0)) * 0.03 
                        : 0).toLocaleString(undefined, {maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              )}

              {/* ➕ 1. ช่องบังคับใส่ใหม่: รูปภาพสลิปใบเสร็จซื้อขาย/หลักฐานโอนเงินของลูกค้า */}
              <div>
                <label className="text-emerald-400 font-bold block mb-1">🧾 อัปโหลดไฟล์ภาพหลักฐานซื้อขาย / สลิปโอนเงินลูกค้า <span className="text-red-400">* บังคับ</span></label>
                <input type="file" accept="image/*" onChange={(e) => setSaleProofFile(e.target.files?.[0] || null)} required className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>

              {/* 🔍 2. ช่องเดิม: ปรับปรุงให้เป็นออปชันเสริม ไม่บังคับใส่แล้ว (ลบ required ออก) */}
              <div>
                <label className="text-slate-400 font-bold block mb-1">🚚 อัปโหลดไฟล์ภาพสลิปใบเสร็จค่าขนส่ง (ถ้ามี)</label>
                <input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">📸 อัปโหลดไฟล์รูปถ่ายสินค้าตอนแพ็กหรือส่ง (ถ้ามี)</label>
                <input type="file" accept="image/*" onChange={(e) => setPackageFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-2 px-3 text-xs" />
              </div>
              
              <button type="submit" disabled={productMutation.isPending} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl shadow-md mt-1 text-sm">
                {productMutation.isPending ? '⏳ กำลังอัปโหลดภาพและเซฟงบลง Database...' : '✅ ยืนยันปิดดีลและบันทึกหลักฐานทั้งหมด'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}