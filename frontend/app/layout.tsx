// app/layout.tsx (YE SABSE BAHAR HONA CHAHIYE)
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import StoreProvider from "./components/storeProvider"; 
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <StoreProvider>
          {children} {/* Isme (main) ya (dashboard) ka content aayega */}
          <ToastContainer position="top-center" limit={1} />
        </StoreProvider>
      </body>
    </html>
  );
}