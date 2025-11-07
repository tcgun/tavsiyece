'use client'; 

import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '../contexts/AuthContext';

const inter = Inter({ 
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <title>Tavsiye Çemberi</title>
        <meta name="description" content="Güvenilir tavsiyelerle dolu bir dünya." />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body className={`${inter.className} bg-dark text-light`}>
        <AuthProvider>
          <div className="w-full min-h-screen">
              {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

