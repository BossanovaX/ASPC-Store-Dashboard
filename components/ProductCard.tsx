'use client';

interface Product {
  id?: string;
  name: string;
  cost: number;
  price: number;
  stock: number;
  serial_number: string;
  category: string;
  image_url: string;
  is_sold: boolean;
  received_at: string;
  buy_receipt_url: string;
  sold_at?: string | null;
  sold_price?: number | null;
  shipping_fee?: number | null;
  commission_fee?: number | null;
  sale_proof_url?: string | null;
  shipping_slip_url?: string | null;
  package_image_url?: string | null;
}

interface ProductCardProps {
  item: Product;
  onPreviewImage: (url: string) => void;
  onEdit: (item: Product) => void;
  onSell: (item: Product) => void;
  onDelete: (item: Product) => void;
}

export default function ProductCard({
  item,
  onPreviewImage,
  onEdit,
  onSell,
  onDelete
}: ProductCardProps) {
  
  const isSold = item.is_sold === true || item.name.includes('ขายแล้ว');
  const cleanName = item.name.split(' [')[0];

  // =========================================================
  // 💡 ระบบ FALLBACK DATA (ผูกกับตัวแปรใหม่ และรองรับ Regex แบบเก่า)
  // =========================================================
  const matchReceive = item.name.match(/รับเข้า: ([\d-]+)/);
  const receiveDate = item.received_at || (matchReceive ? matchReceive[1] : 'ไม่ระบุ');

  const matchSell = item.name.match(/เมื่อ: ([\d-]+)/);
  const soldDate = item.sold_at || (matchSell ? matchSell[1] : 'ไม่ระบุ');

  const matchBuyReceipt = item.name.match(/หลักฐานซื้อ: ([^\s|\]]+)/);
  const buyReceiptUrl = item.buy_receipt_url || (matchBuyReceipt ? matchBuyReceipt[1] : null);

  const matchSaleProof = item.name.match(/หลักฐานขาย: ([^\s|]+)/);
  const saleProofUrl = item.sale_proof_url || (matchSaleProof ? matchSaleProof[1] : null);

  const matchShippingSlip = item.name.match(/สลิปส่ง: ([^\s|]+)/);
  const shippingSlipUrl = item.shipping_slip_url || (matchShippingSlip ? matchShippingSlip[1] : null);

  const matchPackageImage = item.name.match(/ภาพส่ง: ([^\s|]+)/);
  const packageImageUrl = item.package_image_url || (matchPackageImage ? matchPackageImage[1] : null);

  const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
  const displaySoldPrice = item.sold_price ?? parseFloat(matchPrice ? matchPrice[1] : '0');

  const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
  const displayShippingFee = item.shipping_fee ?? parseFloat(matchShip ? matchShip[1] : '0');

  // คำนวณกำไรตาม Logic ดั้งเดิมของการ์ด
  const packFee = 30;
  const baseProfit = displaySoldPrice - item.cost - packFee - displayShippingFee;
  const displayCommission = item.commission_fee ?? (baseProfit > 0 ? baseProfit * 0.03 : 0);
  const netProfit = baseProfit - displayCommission;

  // สีตามหมวดหมู่ชิ้นส่วน (ความเข้มระดับ 400 ยอดฮิต)
  const categoryColors: Record<string, string> = {
    CPU: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    GPU: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Memory: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Mainboard: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Storage: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'Power Supply': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    Case: 'bg-slate-400/10 text-slate-300 border-slate-400/20',
    Cooler: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    /* 🧱 โทนการ์ด Midnight Navy เข้มขรึมลดแสงสะท้อน */
    <div className="bg-[#151f32] rounded-3xl border border-slate-800/80 p-5 shadow-lg hover:shadow-2xl hover:border-slate-700/60 transition-all flex flex-col justify-between gap-4 font-sans text-xs">
      
      {/* ส่วนหัวภาพสินค้าและรายละเอียดพื้นฐาน */}
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden bg-[#111827] border border-slate-800 shrink-0 relative">
          <img 
            src={item.image_url || 'https://via.placeholder.com/150'} 
            alt={cleanName} 
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${categoryColors[item.category] || 'bg-slate-500/10 text-slate-400'}`}>
              {item.category}
            </span>
            <span className={`flex items-center gap-1.5 font-bold text-[10px] ${isSold ? 'text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded-md' : 'text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-md'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSold ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
              {isSold ? 'จำหน่ายแล้ว' : `สต็อก (${item.stock} ชิ้น)`}
            </span>
          </div>
          
          <h4 className="font-bold text-slate-100 text-sm truncate mt-1" title={cleanName}>
            {cleanName}
          </h4>
          <p className="text-[11px] text-slate-400 font-mono">
            S/N: <span className="text-amber-400 font-bold">{item.serial_number || '-'}</span> {/* 💡 คืนค่าความเข้ม 400 */}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            📅 รับเข้า: {receiveDate}
          </p>
        </div>
      </div>

      {/* 💵 ส่วนข้อมูลงบบัญชีภายในตัวการ์ด (สีเฉด 400 คมชัด สว่างพอดีตา) */}
      <div className="flex flex-col gap-2 font-sans bg-[#0b111e]/90 p-3.5 rounded-2xl border border-slate-900/40">
        
        {/* แถวทุนสินค้า */}
        <div className="flex justify-between items-center text-slate-400">
          <span className="flex items-center gap-1">🟩 ต้นทุนรับเข้าสินค้า (ทุนแท้):</span>
          <span className="font-mono font-bold text-slate-200">฿{item.cost.toLocaleString()}</span>
        </div>

        {/* ลิงก์รูปสลิปทุน */}
        {buyReceiptUrl && buyReceiptUrl !== 'ไม่มีหลักฐานซื้อ' && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-500 flex items-center gap-1">📄 หลักฐานสลิปทุนซื้อ:</span>
            <button 
              type="button"
              onClick={() => onPreviewImage(buyReceiptUrl)}
              className="text-amber-400 hover:text-amber-300 font-bold transition-colors underline cursor-pointer flex items-center gap-1" /* 💡 คืนค่าความเข้ม 400 */
            >
              🔗 ดูรูปสลิปตอนซื้อ
            </button>
          </div>
        )}

        {isSold ? (
          /* =========================================================
           * 🔴 CASE: สินค้าที่จำหน่ายแล้ว
           * ========================================================= */
          <div className="flex flex-col gap-2 border-t border-slate-800/80 pt-2 mt-1">
            <div className="flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1">💡 ราคาที่ขายได้:</span>
              <span className="font-mono font-bold text-emerald-400">฿{displaySoldPrice.toLocaleString()}</span> {/* 💡 คืนค่าความเข้ม 400 */}
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1">📦 ค่าแพ็คกล่องบรรจุภัณฑ์:</span>
              <span className="font-mono text-slate-400">฿{packFee}</span>
            </div>

            <div className="flex justify-between items-center text-slate-400">
              <span className="flex items-center gap-1">📦 ค่าจัดส่งจริง:</span>
              <span className="font-mono text-rose-400">฿{displayShippingFee.toLocaleString()}</span> {/* 💡 คืนค่าความเข้ม 400 */}
            </div>

            <div className="flex justify-between items-center text-slate-500 text-[11px] border-t border-dashed border-slate-800/60 pt-1.5">
              <span>📊 กำไรก่อนหักนายหน้า:</span>
              <span className="font-mono text-slate-400">฿{Math.max(0, baseProfit).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>

            <div className="flex justify-between items-center text-[#505050]">
              <span className="flex items-center gap-1 text-rose-400">✂️ หักนายหน้า 3% จากกำไร:</span>
              <span className="font-mono text-amber-400">฿{displayCommission.toLocaleString(undefined, {maximumFractionDigits: 2})}</span> {/* 💡 คืนค่าความเข้ม 400 */}
            </div>

            {/* แถบไฮไลท์สำหรับ NET PROFIT */}
            <div className="bg-orange-600/10 border border-orange-500/20 p-2.5 rounded-xl flex justify-between items-center my-1 shadow-sm">
              <span className="text-orange-400 font-bold flex items-center gap-1">🔥 กำไรสุทธิส่วนของคุณ (NET PROFIT):</span> {/* 💡 คืนค่าความเข้ม 400 */}
              <span className="font-mono font-black text-orange-400 text-sm">฿{Math.max(0, netProfit).toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
            </div>

            {/* ลิงก์รูปหลักฐานฝั่งขาออก */}
            <div className="flex justify-between items-center text-slate-400 border-t border-slate-800/80 pt-2 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1">📄 หลักฐานการซื้อขาย/โอนเงิน:</span>
              {saleProofUrl && saleProofUrl !== 'ไม่มีหลักฐาน' ? (
                <button type="button" onClick={() => onPreviewImage(saleProofUrl)} className="text-emerald-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer">🔗 ดูรูปสลิปซื้อขาย</button> /* 💡 คืนค่าความเข้ม 400 */
              ) : <span className="text-slate-600">ไม่มีหลักฐาน</span>}
            </div>

            {shippingSlipUrl && shippingSlipUrl !== 'ไม่มีหลักฐาน' && (
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">📄 หลักฐานสลิปค่าส่งสินค้า:</span>
                <button type="button" onClick={() => onPreviewImage(shippingSlipUrl)} className="text-cyan-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer">🔗 ดูสลิปค่าส่ง</button>
              </div>
            )}

            {packageImageUrl && packageImageUrl !== 'ไม่มีภาพถ่ายเพิ่มเติม' && (
              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">📄 ภาพถ่ายสินค้าตอนแพ็กของ:</span>
                <button type="button" onClick={() => onPreviewImage(packageImageUrl)} className="text-purple-400 font-bold hover:underline flex items-center gap-0.5 cursor-pointer">🔗 ดูภาพแพ็กของ</button>
              </div>
            )}

            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-1 border-t border-slate-800/40 pt-1.5">
              <span>📅 วันที่ปิดดีลขาย:</span>
              <span>{soldDate}</span>
            </div>
          </div>
        ) : (
          /* =========================================================
           * 🟢 CASE: สินค้าที่พร้อมจำหน่ายในสต็อก
           * ========================================================= */
          <div className="flex justify-between items-center border-t border-slate-800/80 pt-2 mt-1 text-slate-400">
            <span className="text-slate-400">✨ ราคาตั้งขายไว้:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">฿{item.price.toLocaleString()}</span> {/* 💡 คืนค่าความเข้ม 400 */}
          </div>
        )}
      </div>

      {/* 🎮 กลุ่มปุ่มกดควบคุม Action ด้านล่างชิดขวา */}
      <div className="flex gap-2 justify-end pt-2 border-t border-slate-800/40 mt-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white py-1.5 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-md shadow-orange-950/20 cursor-pointer"
        >
          📄 แก้ไขรายการ
        </button>
        
        {!isSold && (
          <button
            type="button"
            onClick={() => onSell(item)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-4 rounded-xl font-bold text-[11px] transition-all shadow-md shadow-emerald-900/10 flex items-center gap-1 cursor-pointer"
          >
            💰 บันทึกขายออก
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete(item)}
          className="text-rose-400/80 hover:text-rose-400 hover:bg-rose-950/30 px-3 py-1.5 rounded-xl transition-all font-bold flex items-center gap-1 text-[11px] cursor-pointer"
          title="ลบสินค้า"
        >
          🗑️ ลบ
        </button>
      </div>

    </div>
  );
}