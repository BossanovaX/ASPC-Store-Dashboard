'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';

export default function ReportsView({ products }: { products: any[] }) {
  const [docStatus, setDocStatus] = useState('ทั้งหมด'); 
  const [docCategory, setDocCategory] = useState('ทั้งหมด');
  const [docStartDate, setDocStartDate] = useState('');
  const [docEndDate, setDocEndDate] = useState('');

  const reportFilteredProducts = products.filter((item) => {
    const isSold = item.is_sold === true || item.name.includes('ขายแล้ว');
    if (docStatus === 'อยู่ในสต็อก' && isSold) return false;
    if (docStatus === 'จำหน่ายแล้ว' && !isSold) return false;
    if (docCategory !== 'ทั้งหมด' && item.category !== docCategory) return false;
    
    const matchDate = isSold ? item.name.match(/เมื่อ: ([\d-]+)/) : item.name.match(/รับเข้า: ([\d-]+)/);
    const itemDate = isSold ? (item.sold_at || (matchDate ? matchDate[1] : '')) : (item.received_at || (matchDate ? matchDate[1] : ''));
    if (docStartDate && itemDate && itemDate < docStartDate) return false;
    if (docEndDate && itemDate && itemDate > docEndDate) return false;
    return true;
  });

  const exportToExcelFromPanel = () => {
    if (reportFilteredProducts.length === 0) { alert('❌ ไม่พบข้อมูล!'); return; }
    const reportData = reportFilteredProducts.map((item, index) => {
      const isSold = item.is_sold === true || item.name.includes('ขายแล้ว');
      const cleanName = item.name.split(' [')[0];
      const cost = item.cost || 0;
      const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
      const sellPrice = item.sold_price ?? parseFloat(matchPrice ? matchPrice[1] : '0');
      const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
      const shipFee = item.shipping_fee ?? parseFloat(matchShip ? matchShip[1] : '0');
      const packFee = 30;
      const baseProfit = sellPrice - cost - packFee - shipFee;
      const commission = item.commission_fee ?? (baseProfit > 0 ? baseProfit * 0.03 : 0);
      const netProfit = baseProfit - commission;

      return {
        'ลำดับ': index + 1, 'ชื่อสินค้า': cleanName, 'S/N': item.serial_number || '-', 'หมวดหมู่': item.category,
        'สถานะ': isSold ? 'ขายแล้ว' : 'สต็อก', 'ทุน (บาท)': cost, 'ยอดขาย (บาท)': isSold ? sellPrice : '-',
        'กำไรสุทธิ (บาท)': isSold ? Math.max(0, netProfit) : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ERP_Report');
    XLSX.writeFile(workbook, `ERP_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 📄 ฟังก์ชันดึงเฉพาะเนื้อหาตารางไปสั่งพิมพ์ PDF หน้าใหม่
  const exportToPDF = () => {
    const report = document.getElementById("print-report");
    if (!report) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>รายงานสรุปงบดุลบัญชีสินค้า - ASPC</title>
          <style>
            @page { size: A4 landscape; margin: 15mm; }
            body { font-family: 'Sarabun', Tahoma, sans-serif; color: #000; margin: 0; padding: 0; }
            h1 { font-size: 18px; font-weight: bold; margin-bottom: 5px; text-align: center; }
            p { font-size: 11px; color: #555; text-align: center; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; text-align: center; }
            .text-right { text-align: right; font-family: monospace; }
            .text-center { text-align: center; }
            .bg-total { background-color: #f8fafc; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>รายงานประวัติสินค้าและสรุปงบดุลบัญชีการเงิน</h1>
          <p>สถานะ: ${docStatus} | หมวดหมู่: ${docCategory} | ช่วงวันที่: ${docStartDate || 'ทั้งหมด'} ถึง ${docEndDate || 'ปัจจุบัน'}</p>
          ${report.innerHTML}
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  return (
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
              {['ทั้งหมด', 'CPU', 'GPU', 'Memory', 'Mainboard', 'Storage', 'Power Supply', 'Case', 'Cooler', 'Monitor'].map(cat => (
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
          <button onClick={exportToExcelFromPanel} className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
            📊 ดึงไฟล์ Excel
          </button>
          <button onClick={exportToPDF} className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-500 text-white text-sm font-black py-3 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
            📄 พิมพ์ PDF
          </button>
        </div>
      </div>

      {/* 📌 ตารางสำหรับ Print PDF (ซ่อนไว้รอให้ exportToPDF ดึง innerHTML ไปใช้) */}
      <div className="hidden">
        <div id="print-report">
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>สินค้า</th>
                <th>S/N</th>
                <th>หมวด</th>
                <th>สถานะ</th>
                <th className="text-right">ทุน (฿)</th>
                <th className="text-right">ขาย (฿)</th>
                <th className="text-right">ค่าส่ง (฿)</th>
                <th className="text-right">นายหน้า (฿)</th>
                <th className="text-right">กำไร (฿)</th>
              </tr>
            </thead>
            <tbody>
              {reportFilteredProducts.map((item, idx) => {
                const isSold = item.is_sold === true || item.name.includes('ขายแล้ว');
                const cost = item.cost || 0;
                const matchPrice = item.name.match(/ขายแล้ว ฿([\d.]+)/);
                const sp = item.sold_price ?? parseFloat(matchPrice ? matchPrice[1] : '0');
                const matchShip = item.name.match(/ค่าส่ง: ฿([\d.]+)/);
                const sf = item.shipping_fee ?? parseFloat(matchShip ? matchShip[1] : '0');
                const packFee = 30;
                const baseProfit = sp - cost - packFee - sf;
                const cm = item.commission_fee ?? (baseProfit > 0 ? baseProfit * 0.03 : 0);
                const net = baseProfit - cm;
                
                const matchDate = isSold ? item.name.match(/เมื่อ: ([\d-]+)/) : item.name.match(/รับเข้า: ([\d-]+)/);
                const fallbackDate = matchDate ? matchDate[1] : '-';
                const rawDate = isSold ? (item.sold_at || fallbackDate) : (item.received_at || fallbackDate);
                const date = rawDate && rawDate !== '-' ? rawDate.slice(0, 10) : '-';

                return (
                  <tr key={`print-row-${idx}`}>
                    <td className="text-center">{date}</td>
                    <td>{item.name.split(' [')[0]}</td>
                    <td className="text-center">{item.serial_number || '-'}</td>
                    <td className="text-center">{item.category}</td>
                    <td className="text-center">{isSold ? 'ขายแล้ว' : 'สต็อก'}</td>
                    <td className="text-right">{cost.toLocaleString()}</td>
                    <td className="text-right">{isSold ? sp.toLocaleString() : '-'}</td>
                    <td className="text-right">{isSold ? sf.toLocaleString() : '-'}</td>
                    <td className="text-right">{isSold ? cm.toLocaleString(undefined, {maximumFractionDigits: 2}) : '-'}</td>
                    <td className="text-right" style={{ color: isSold && net > 0 ? '#16a34a' : '#000' }}>
                      {isSold ? Math.max(0, net).toLocaleString(undefined, {maximumFractionDigits: 2}) : '-'}
                    </td>
                  </tr>
                );
              })}

              {/* 📊 แถวสรุปผลรวมท้ายตาราง */}
              <tr className="bg-total">
                <td colSpan={5} className="text-center font-bold">SUMMARY TOTAL</td>
                <td className="text-right font-bold">
                  ฿{reportFilteredProducts.reduce((a, c) => a + (c.cost || 0), 0).toLocaleString()}
                </td>
                <td className="text-right font-bold">
                  ฿{reportFilteredProducts.reduce((a, c) => {
                    const isSold = c.is_sold === true || c.name.includes('ขายแล้ว');
                    if (!isSold) return a;
                    return a + (c.sold_price ?? parseFloat(c.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0'));
                  }, 0).toLocaleString()}
                </td>
                <td className="text-right font-bold">
                  ฿{reportFilteredProducts.reduce((a, c) => {
                    const isSold = c.is_sold === true || c.name.includes('ขายแล้ว');
                    if (!isSold) return a;
                    return a + (c.shipping_fee ?? parseFloat(c.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0'));
                  }, 0).toLocaleString()}
                </td>
                <td className="text-right font-bold">
                  ฿{reportFilteredProducts.reduce((a, c) => {
                    const isSold = c.is_sold === true || c.name.includes('ขายแล้ว');
                    if (!isSold) return a;
                    const cost = c.cost || 0;
                    const sp = c.sold_price ?? parseFloat(c.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0');
                    const sf = c.shipping_fee ?? parseFloat(c.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0');
                    const baseProfit = sp - cost - 30 - sf;
                    return a + (c.commission_fee ?? (baseProfit > 0 ? baseProfit * 0.03 : 0));
                  }, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </td>
                <td className="text-right font-bold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                  ฿{reportFilteredProducts.reduce((a, c) => {
                    const isSold = c.is_sold === true || c.name.includes('ขายแล้ว');
                    if (!isSold) return a;
                    const cost = c.cost || 0;
                    const sp = c.sold_price ?? parseFloat(c.name.match(/ขายแล้ว ฿([\d.]+)/)?.[1] || '0');
                    const sf = c.shipping_fee ?? parseFloat(c.name.match(/ค่าส่ง: ฿([\d.]+)/)?.[1] || '0');
                    const baseProfit = sp - cost - 30 - sf;
                    const cm = c.commission_fee ?? (baseProfit > 0 ? baseProfit * 0.03 : 0);
                    return a + (baseProfit - cm);
                  }, 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}