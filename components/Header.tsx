'use client';

interface HeaderProps {
  activeMenu: string;
  onOpenMobileMenu: () => void;
  onOpenInputModal: () => void;
}

export default function Header({ activeMenu, onOpenMobileMenu, onOpenInputModal }: HeaderProps) {
  const getTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'ภาพรวมระบบ (Dashboard)';
      case 'stock': return 'คลังสินค้าและสต็อก (Inventory)';
      case 'sold': return 'ประวัติการขายสินค้า (Sales History)';
      case 'reports': return 'ศูนย์จัดการเอกสาร (Report Center)';
      default: return '';
    }
  };

  return (
    <header className="h-16 bg-[#0f172a]/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 no-print">
      <div className="flex items-center gap-4">
        <button
    onClick={onOpenMobileMenu}
    className="md:hidden
               w-10
               h-10
               rounded-xl
               flex
               items-center
               justify-center
               text-white
               hover:bg-slate-700
               active:scale-95
               transition-all"
>
    ☰
</button>
        <h2 className="text-lg font-black text-white hidden sm:block">
          {getTitle()}
        </h2>
      </div>
      <div className="flex items-center gap-4">
        <div className="bg-[#1e293b] text-slate-300 text-xs px-4 py-2 rounded-full border border-slate-700 flex items-center gap-2 font-mono">
          <span>📅</span> {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })}
        </div>
        <button
          onClick={onOpenInputModal}
          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-orange-900/20 transition-all cursor-pointer"
        >
          + นำเข้าสินค้า
        </button>
      </div>
    </header>
  );
}