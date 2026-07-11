'use client'; // 👈 ต้องใส่ไว้บนสุดเพราะเราต้องใช้ Context ฝั่ง Client

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// 📦 1. อิมพอร์ตตัวจัดการ Client ของ TanStack Query เข้ามา
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// หมายเหตุ: ใน Next.js App Router ถ้าใช้ 'use client' จะส่งออก metadata ตรงๆ แบบนี้ไม่ได้ 
// ถ้าแอปขึ้น Warning ให้ลบก้อน metadata นี้ออกได้เลยครับ แต่ตอนนี้คงไว้ตามเดิมก่อนได้

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 📦 2. สร้าง QueryClient instance ไว้ใน State เพื่อให้ผูกกับ Lifecycle ของแอป
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false, // ปิดไม่ให้มันแอบ fetch ใหม่ทุกครั้งที่เราสลับหน้าจอคอมพิวเตอร์
      },
    },
  }));

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 📦 3. ครอบ QueryClientProvider หุ้ม children ทั้งหมดไว้ */}
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}