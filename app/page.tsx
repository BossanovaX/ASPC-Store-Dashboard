'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

import DashboardView from '../components/views/DashboardView';
import StockView from '../components/views/StockView';
import SoldView from '../components/views/SoldView';
import ReportsView from '../components/views/ReportsView';

import ProfileModal from '../components/modals/ProfileModal';
import InputModal from '../components/modals/InputModal';
import SellModal from '../components/modals/SellModal';
import EditModal from '../components/modals/EditModal';
import DeleteModal from '../components/modals/DeleteModal';

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
  buy_receipt_url?: string | null;
  sold_at?: string | null;
  sold_price?: number | null;
  shipping_fee?: number | null;
  commission_fee?: number | null;
  sale_proof_url?: string | null;
  shipping_slip_url?: string | null;
  package_image_url?: string | null;
}

interface UserProfile {
  display_name: string;
  avatar_url: string;
}

export default function HomeMonitor() {
  const queryClient = useQueryClient();

  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [hasMounted, setHasMounted] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loginError, setLoginError] = useState('');

  // Modals States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [inputMessage, setInputMessage] = useState('');
  const [sellSuccessMessage, setSellSuccessMessage] = useState('');
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // TanStack Query
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('โหลดข้อมูลคลังสินค้าล้มเหลว');
      const data = await response.json();
      return Array.isArray(data) ? data.reverse() : [];
    },
    enabled: isLoggedIn,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 10,
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

  // Auth Listener
  useEffect(() => {
    const fetchUserProfile = async (userId: string) => {
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', userId).single();
      if (profile) setCurrentUser(profile);
      setIsLoggedIn(true);
    };

    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) await fetchUserProfile(session.user.id);
    };
    checkActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) await fetchUserProfile(session.user.id);
      else { setIsLoggedIn(false); setCurrentUser(null); }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('⏳ กำลังตรวจสอบสิทธิ์...');
    const formattedEmail = `${username.trim().toLowerCase()}@aspc.local`;
    const { data, error } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });

    if (error) { setLoginError(`❌ ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง`); return; }
    if (data.user) {
      const { data: profile } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', data.user.id).single();
      if (profile) setCurrentUser(profile);
      setIsLoggedIn(true); setLoginError(''); setPassword('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false); setCurrentUser(null); setUsername(''); setPassword('');
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

  // Modal Action Handlers
  const handleInputSubmit = async (formData: any) => {
    setInputMessage('⏳ กำลังยิงไฟล์เข้าระบบ...');
    try {
      const finalImageUrl = await uploadImageToStorage(formData.productFile, 'items');
      const receiptUrl = await uploadImageToStorage(formData.receiptFile, 'receipts');

      await productMutation.mutateAsync({
        url: '/api/products', method: 'POST',
        body: {
          name: formData.name,
          cost: parseFloat(formData.cost) || 0,
          price: parseFloat(formData.price) || 0,
          stock: parseFloat(formData.stock) || 1,
          serial_number: formData.serialNumber || '',
          category: formData.category,
          image_url: finalImageUrl,
          is_sold: false,
          received_at: formData.receivedAt || new Date().toISOString(),
          buy_receipt_url: receiptUrl
        }
      });
      setInputMessage("🎉 บันทึกข้อมูลสำเร็จ!");
      setTimeout(() => { setIsInputModalOpen(false); setInputMessage(''); }, 1200);
    } catch (err: any) { setInputMessage("ข้อผิดพลาด: " + err.message); }
  };

  const handleSellSubmit = async (formData: any) => {
    if (!selectedProduct) return;
    try {
      setSellSuccessMessage('⏳ กำลังอัปโหลดภาพและเซฟงบ...');
      let saleProofUrl = await uploadImageToStorage(formData.saleProofFile, 'sales_proofs');
      let slipUrl = formData.slipFile ? await uploadImageToStorage(formData.slipFile, 'slips') : null;
      let packageUrl = formData.packageFile ? await uploadImageToStorage(formData.packageFile, 'packages') : null;

      const sPrice = parseFloat(formData.soldPrice) || 0;
      const sFee = parseFloat(formData.shippingFee) || 0;
      const packFee = 30;
      const baseProfit = sPrice - selectedProduct.cost - packFee - sFee;
      const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;

      const matchBuyReceipt = selectedProduct.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
      const matchReceive = selectedProduct.name.match(/รับเข้า: ([\d-]+)/);

      await productMutation.mutateAsync({ url: '/api/products', method: 'DELETE', body: { name: selectedProduct.name } });
      await productMutation.mutateAsync({
        url: '/api/products', method: 'POST',
        body: {
          name: selectedProduct.name.split(' [')[0],
          cost: selectedProduct.cost,
          price: selectedProduct.price,
          stock: 0,
          serial_number: selectedProduct.serial_number,
          category: selectedProduct.category,
          image_url: selectedProduct.image_url,
          is_sold: true,
          sold_at: formData.soldAt,
          sold_price: sPrice,
          shipping_fee: sFee,
          commission_fee: commission,
          sale_proof_url: saleProofUrl,
          shipping_slip_url: slipUrl,
          package_image_url: packageUrl,
          buy_receipt_url: selectedProduct.buy_receipt_url || (matchBuyReceipt ? matchBuyReceipt[1] : null),
          received_at: selectedProduct.received_at || (matchReceive ? matchReceive[1] : null)
        }
      });

      setSellSuccessMessage('🎉 ปิดยอดขายสำเร็จ!');
      setTimeout(() => { setIsSellModalOpen(false); setSellSuccessMessage(''); }, 1200);
    } catch (err: any) { alert("เกิดข้อผิดพลาด: " + err.message); setSellSuccessMessage(''); }
  };

  const handleEditSubmit = async (formData: any) => {
    if (!editingProduct) return;
    try {
      const isSold = editingProduct.is_sold === true || editingProduct.name.includes('ขายแล้ว');
      let finalProductImageUrl = editingProduct.image_url;
      let finalBuyReceiptUrl = editingProduct.buy_receipt_url;

      if (!isSold && formData.editProductFile) finalProductImageUrl = await uploadImageToStorage(formData.editProductFile, 'items');
      if (!isSold && formData.editReceiptFile) finalBuyReceiptUrl = await uploadImageToStorage(formData.editReceiptFile, 'receipts');

      const nCost = parseFloat(formData.editCost) || 0;
      const nPrice = parseFloat(formData.editPrice) || 0;

      let updateBody: any = {
        name: formData.editName, cost: nCost, price: nPrice,
        serial_number: formData.editSerialNumber, category: formData.editCategory,
        image_url: finalProductImageUrl, buy_receipt_url: finalBuyReceiptUrl,
        is_sold: isSold, received_at: editingProduct.received_at
      };

      if (isSold) {
        let finalSaleProofUrl = editingProduct.sale_proof_url;
        let finalShippingSlipUrl = editingProduct.shipping_slip_url;
        let finalPackageImageUrl = editingProduct.package_image_url;

        if (formData.editSaleProofFile) finalSaleProofUrl = await uploadImageToStorage(formData.editSaleProofFile, 'sales_proofs');
        if (formData.editSlipFile) finalShippingSlipUrl = await uploadImageToStorage(formData.editSlipFile, 'slips');
        if (formData.editPackageFile) finalPackageImageUrl = await uploadImageToStorage(formData.editPackageFile, 'packages');

        const newShipFee = parseFloat(formData.editShippingFee) || 0;
        const baseProfit = nPrice - nCost - 30 - newShipFee;
        const commission = baseProfit > 0 ? baseProfit * 0.03 : 0;

        updateBody = {
          ...updateBody, stock: 0, sold_at: editingProduct.sold_at, sold_price: nPrice,
          shipping_fee: newShipFee, commission_fee: commission,
          sale_proof_url: finalSaleProofUrl, shipping_slip_url: finalShippingSlipUrl, package_image_url: finalPackageImageUrl
        };
      } else {
        updateBody.stock = parseFloat(formData.editStock) || 0;
      }

      await productMutation.mutateAsync({ url: '/api/products', method: 'DELETE', body: { name: editingProduct.name } });
      await productMutation.mutateAsync({ url: '/api/products', method: 'POST', body: updateBody });
      alert('🎉 อัปเดตสำเร็จ!'); setIsEditModalOpen(false); setEditingProduct(null);
    } catch (err: any) { alert("ข้อผิดพลาด: " + err.message); }
  };

  const handleDeleteConfirm = async (product: Product) => {
    try {
      setDeleteSuccessMessage('⏳ กำลังลบข้อมูล...');
      await productMutation.mutateAsync({ url: '/api/products', method: 'DELETE', body: { name: product.name } });
      setDeleteSuccessMessage('🎉 ลบสำเร็จ!');
      setTimeout(() => { setIsDeleteModalOpen(false); setProductToDelete(null); setDeleteSuccessMessage(''); }, 1000);
    } catch (err: any) { alert("เกิดข้อผิดพลาด: " + err.message); setDeleteSuccessMessage(''); }
  };

  if (!hasMounted) return <div className="min-h-screen bg-[#0f172a]" />;
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-sm flex flex-col gap-4">
          <div className="text-center"><h2 className="text-xl font-black text-white">🔐 ASPC Account Login</h2><p className="text-slate-400 text-xs mt-1">ระบบยืนยันตัวตนพนักงาน</p></div>
          {loginError && <div className="text-xs text-red-400 bg-red-950/40 border border-red-900 p-2.5 rounded-xl text-center font-bold">{loginError}</div>}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400">ชื่อผู้ใช้งาน (Username)</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="พิมพ์ชื่อผู้ใช้ของคุณ..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3.5 text-white text-sm focus:border-orange-500 focus:outline-none" required />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-bold text-slate-400">รหัสผ่านบัญชี (Password)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3.5 text-white text-sm focus:border-orange-500 focus:outline-none font-mono" required />
          </div>
          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md mt-1 cursor-pointer">🔓 เข้าสู่ระบบ</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-root flex h-screen bg-[#0f172a] overflow-hidden text-slate-100 font-sans">
      {/* Desktop Sidebar */}
<div className="hidden md:flex">
    <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
    />

</div>
{/* Mobile Sidebar */}

<div
    className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${
        isMobileMenuOpen
            ? "opacity-100"
            : "opacity-0 pointer-events-none"
    }`}
    onClick={() => setIsMobileMenuOpen(false)}
/>

<div
    className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-out md:hidden ${
        isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full"
    }`}
>
    <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        currentUser={currentUser}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        onClose={() => setIsMobileMenuOpen(false)}
    />
</div>

      <div className="main-content flex-1 flex flex-col h-screen overflow-hidden pb-20 relative">
        <Header
          activeMenu={activeMenu}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenInputModal={() => setIsInputModalOpen(true)}
        />

        <div className="scroll-container flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">
            {activeMenu === 'dashboard' && <DashboardView products={products} />}
            {activeMenu === 'stock' && (
              <StockView
                products={products}
                onPreviewImage={setPreviewImageUrl}
                onEdit={(item) => { setEditingProduct(item); setIsEditModalOpen(true); }}
                onSell={(item) => { setSelectedProduct(item); setIsSellModalOpen(true); }}
                onDelete={(item) => { setProductToDelete(item); setIsDeleteModalOpen(true); }}
              />
            )}
            {activeMenu === 'sold' && (
              <SoldView
                products={products}
                onPreviewImage={setPreviewImageUrl}
                onEdit={(item) => { setEditingProduct(item); setIsEditModalOpen(true); }}
                onSell={(item) => { setSelectedProduct(item); setIsSellModalOpen(true); }}
                onDelete={(item) => { setProductToDelete(item); setIsDeleteModalOpen(true); }}
              />
            )}
            {activeMenu === 'reports' && <ReportsView products={products} />}
          </div>
        </div>
      </div>

      {/* Lightbox Pop-up */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999]" onClick={() => setPreviewImageUrl(null)}>
          <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewImageUrl(null)} className="absolute -top-12 right-0 text-white hover:text-rose-500 font-bold text-xl bg-slate-800/50 w-10 h-10 rounded-full flex items-center justify-center">✕</button>
            <img src={previewImageUrl} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700" alt="Preview" />
          </div>
        </div>
      )}

      {/* Modals Assembly */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} currentUser={currentUser} onUpdateSuccess={(updated) => setCurrentUser(updated)} />
      <InputModal isOpen={isInputModalOpen} onClose={() => setIsInputModalOpen(false)} onSubmit={handleInputSubmit} isPending={productMutation.isPending} message={inputMessage} />
      <SellModal isOpen={isSellModalOpen} onClose={() => setIsSellModalOpen(false)} selectedProduct={selectedProduct} onSubmit={handleSellSubmit} isPending={productMutation.isPending} successMessage={sellSuccessMessage} />
      <EditModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} editingProduct={editingProduct} onSubmit={handleEditSubmit} isPending={productMutation.isPending} />
      <DeleteModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} productToDelete={productToDelete} onConfirmDelete={handleDeleteConfirm} successMessage={deleteSuccessMessage} />
    </div>
  );
}