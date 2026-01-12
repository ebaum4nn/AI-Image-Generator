import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "./components/SessionProvider";
import { Navbar } from "./components/Navbar";
import Footer from "./components/Footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_SITE_BRAND || "Image Generator",
  description: "Generate images using FLUX.2-dev model",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <SessionProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
              <main className="relative z-0 flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}