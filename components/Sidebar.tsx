'use client';

interface UserProfile {
  display_name: string;
  avatar_url: string;
}

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  currentUser: UserProfile | null;
  onOpenProfile: () => void;
  onLogout: () => void;
  onClose?: () => void;   // เพิ่ม
}

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  currentUser,
  onOpenProfile,
  onLogout,
  onClose
}: SidebarProps) {
  return (
    <div className="sidebar w-[85vw] max-w-[340px] h-full bg-[#1e293b] border-r border-slate-800 flex flex-col justify-between">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-lg">A</div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">ASPC Manager</h1>
            <p className="text-[10px] text-slate-400">ERP & Stock System</p>
          </div>
        </div>
        <nav className="p-4 flex flex-col gap-2">
          {[
            { id: 'dashboard', label: '📊 ภาพรวม (Dashboard)' },
            { id: 'stock', label: '📦 คลังสินค้า (Stock)' },
            { id: 'sold', label: '🛒 ประวัติขาย (Sold)' },
            { id: 'reports', label: '📄 ออกรายงาน (Reports)' }
          ].map(menu => (
            <button
              key={menu.id}
              onClick={() => {
    setActiveMenu(menu.id);
    onClose?.();
}}
              className={`flex items-center w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeMenu === menu.id
                  ? 'bg-orange-600/10 text-orange-500 border border-orange-600/30'
                  : 'text-slate-400 hover:bg-[#111827] hover:text-slate-200'
              }`}
            >
              {menu.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 border border-slate-600 shrink-0">
            <img
              src={currentUser?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=ASPC'}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 ml-1">
            <p className="text-xs font-bold text-white truncate">{currentUser?.display_name || 'พนักงาน'}</p>
            <p className="text-[10px] text-emerald-400 font-medium">🟢 Online</p>
          </div>

          <button
            onClick={() => {
    onOpenProfile();
    onClose?.();
}}
            className="text-slate-400 hover:text-orange-400 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="ตั้งค่าบัญชีผู้ใช้"
          >
            ⚙️
          </button>

          <button
            onClick={() => {
    onLogout();
    onClose?.();
}}
            className="text-[10px] text-slate-500 hover:text-rose-400 font-bold px-2 py-1 rounded bg-slate-800 transition-colors cursor-pointer"
          >
            ออก
          </button>
        </div>
      </div>
    </div>
  );
}