'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { display_name: string; avatar_url: string } | null;
  onUpdateSuccess: (updated: { display_name: string; avatar_url: string }) => void;
}

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdateSuccess }: ProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [password, setPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('⏳ กำลังอัปเดตข้อมูลบัญชี...');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('ไม่พบเซสชันผู้ใช้งาน');

      let finalAvatarUrl = currentUser?.avatar_url || '';

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `avatar_${session.user.id}_${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('products').upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('products').getPublicUrl(filePath);
        finalAvatarUrl = data.publicUrl;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ display_name: displayName, avatar_url: finalAvatarUrl })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      if (password.trim() !== '') {
        if (password.length < 6) throw new Error('รหัสผ่านใหม่ต้องมีความยาว 6 ตัวอักษรขึ้นไป');
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      }

      onUpdateSuccess({ display_name: displayName, avatar_url: finalAvatarUrl });
      setPassword('');
      setAvatarFile(null);
      setMessage('🎉 อัปเดตข้อมูลบัญชีสำเร็จ!');
      setTimeout(() => { onClose(); setMessage(''); }, 1200);
    } catch (err: any) {
      setMessage(`❌ ข้อผิดพลาด: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] no-print">
      <div className="bg-[#1e293b] p-6 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-4 w-full max-w-sm relative animate-in zoom-in-95 duration-200">
        <button onClick={() => { onClose(); setMessage(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 w-7 h-7 flex items-center justify-center rounded-full">✕</button>
        <h2 className="font-bold text-orange-400 text-base border-b border-slate-800 pb-2">⚙️ ตั้งค่าและแก้ไขข้อมูลบัญชีผู้ใช้</h2>
        
        {message && <div className="p-2.5 rounded-xl text-center text-xs font-bold bg-[#111827] text-orange-300 border border-slate-800">{message}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-xs">
          <div className="flex flex-col items-center justify-center gap-2 border-b border-slate-800/60 pb-3">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 border-2 border-orange-500/20 shadow-lg">
              <img src={currentUser?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=ASPC'} alt="Current Profile" className="w-full h-full object-cover" />
            </div>
            <span className="text-[10px] text-slate-500">รูปภาพโปรไฟล์พนักงานปัจจุบัน</span>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-bold">1. เปลี่ยนชื่อแสดงผล (Display Name)</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:border-orange-500 focus:outline-none" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-slate-400 font-bold">2. เปลี่ยนรหัสผ่านใหม่ (ทิ้งว่างไว้ได้ถ้าไม่เปลี่ยน)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="ป้อนรหัสผ่าน 6 ตัวขึ้นไป..." className="w-full bg-[#111827] border border-slate-700 rounded-xl py-2 px-3 text-white text-sm focus:border-orange-500 focus:outline-none font-mono" />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-orange-400 font-bold">3. อัปโหลดรูปภาพโปรไฟล์ใหม่ (Avatar)</label>
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} className="w-full bg-[#111827] border border-slate-700 text-slate-300 rounded-xl py-1.5 px-3 text-xs" />
          </div>

          <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md mt-1 cursor-pointer">💾 บันทึกและอัปเดตข้อมูลบัญชี</button>
        </form>
      </div>
    </div>
  );
}