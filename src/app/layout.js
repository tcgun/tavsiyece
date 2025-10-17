    import { Inter } from "next/font/google";
    import "./globals.css";
    import BottomNav from "../components/BottomNav"; // Yeni bileşenimizi import ediyoruz

    const inter = Inter({ subsets: ["latin"] });

    export const metadata = {
      title: "Tavsiye Çemberi",
      description: "Güvenilir tavsiyelerle dolu bir dünya.",
    };

    export default function RootLayout({ children }) {
      return (
        <html lang="tr">
          <head>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
          </head>
          <body className={inter.className}>
            <div className="container mx-auto max-w-lg min-h-screen bg-white pb-20">
                {children}
            </div>
            <BottomNav />
          </body>
        </html>
      );
    }