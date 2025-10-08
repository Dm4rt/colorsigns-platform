import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header"; // <-- 1. IMPORT YOUR HEADER
import Providers from './providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Color Signs NY",
  description: "Your one-stop shop for signs, banners, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
        <Header /> 
        {children}
        {/* You can also add a <Footer /> component here later */}
        </Providers>
      </body>
    </html>
  );
}
