import "./globals.css";

import { Footer } from "@/components/Footer";
import { NavBar } from "@/components/NavBar";
import { ToastProvider } from "@/components/ToastProvider";
import { Web3Provider } from "@/components/Web3Provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-50 antialiased">
        <Web3Provider>
          <ToastProvider />
          <div className="min-h-screen">
            <NavBar />
            <main className="mx-auto max-w-6xl px-6 py-8">
              {children}
              <Footer />
            </main>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
