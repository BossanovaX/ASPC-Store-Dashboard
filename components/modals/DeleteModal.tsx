'use client';

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToDelete: any;
  onConfirmDelete: (product: any) => Promise<void>;
  successMessage: string;
}

export default function DeleteModal({ isOpen, onClose, productToDelete, onConfirmDelete, successMessage }: DeleteModalProps) {
  if (!isOpen || !productToDelete) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-md relative animate-in zoom-in-95 duration-200">
        <h2 className="font-bold text-rose-500 text-base border-b border-slate-800 pb-2 flex items-center gap-2">🚨 ยืนยันการลบข้อมูลสินค้า</h2>
        {successMessage ? (
          <div className="p-4 rounded-xl text-center text-sm font-bold bg-rose-950/40 text-rose-400 border border-rose-900/50 my-2 animate-pulse">{successMessage}</div>
        ) : (
          <>
            <p className="text-xs text-slate-400">คุณแน่ใจใช่ไหมว่าต้องการลบสินค้าชิ้นนี้ออกจากฐานข้อมูล? เมื่อลบแล้วจะไม่สามารถกู้คืนได้</p>
            <div className="bg-[#111827] p-4 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs font-sans">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">📦 ชื่อสินค้า:</span>
                <span className="text-white font-bold text-sm">{productToDelete.name.split(' [')[0]}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-800/60 pt-2">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">🔢 S/N:</span>
                  <span className="text-amber-400 font-mono font-bold">{productToDelete.serial_number || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold">📅 ลงข้อมูลเมื่อ:</span>
                  <span className="text-slate-300 font-mono">
                    {(productToDelete.received_at || productToDelete.sold_at || 'ไม่ระบุ').slice(0, 10)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer">ยกเลิก</button>
              <button type="button" onClick={() => onConfirmDelete(productToDelete)} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md cursor-pointer">💥 ยืนยันลบ</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}