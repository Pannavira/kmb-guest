import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";


const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400","600","700"] });


export const metadata: Metadata = {
title: "KMB Jaya Mangala — Daftar Tamu",
description: "Form daftar tamu undangan KMB Jaya Mangala",
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="id">
<body className={`${plusJakarta.className} min-h-dvh bg-gradient-to-b from-rose-50 via-white to-amber-50 text-gray-800 antialiased`}>
{children}
</body>
</html>
);
}