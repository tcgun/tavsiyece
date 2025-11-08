'use client';

import React from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { useRouter } from 'next/navigation';

export default function Header({ authUser, activeTab, setActiveTab, unreadCount, onLogout, showBackButton = false, backHref = '/' }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/giris');
    } catch (error) {
      console.error("Çıkış yaparken hata oluştu:", error);
      alert("Çıkış yapılırken bir hata oluştu.");
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-dark/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-border">
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {/* Geri Butonu (Profil sayfaları için) */}
          {showBackButton && (
            <Link
              href={backHref}
              className="p-2.5 sm:p-3 rounded-xl text-muted hover:bg-card hover:text-primary transition-all duration-300 flex-shrink-0"
              title="Ana Sayfaya Dön"
              aria-label="Ana Sayfaya Dön"
            >
              <i className="fas fa-arrow-left text-base sm:text-lg"></i>
            </Link>
          )}
          {/* Arama ve Bildirim Butonları - Sol Taraf */}
          {authUser && activeTab !== undefined && setActiveTab && (
            <>
              <button
                onClick={() => {
                  if (activeTab === 'explore') {
                    setActiveTab('following');
                  } else {
                    setActiveTab('explore');
                  }
                }}
                className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                  activeTab === 'explore' 
                    ? 'text-light bg-primary shadow-lg shadow-primary/30' 
                    : 'text-muted hover:bg-card hover:text-primary'
                }`}
                title="Keşfet"
                aria-label="Keşfet"
              >
                <i className="fas fa-search text-base sm:text-lg"></i>
              </button>
              <button
                onClick={() => {
                  if (activeTab === 'notifications') {
                    setActiveTab('following');
                  } else {
                    setActiveTab('notifications');
                  }
                }}
                className={`relative p-2.5 sm:p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                  activeTab === 'notifications' 
                    ? 'text-light bg-primary shadow-lg shadow-primary/30' 
                    : 'text-muted hover:bg-card hover:text-primary'
                }`}
                title="Bildirimler"
                aria-label="Bildirimler"
              >
                <i className="fas fa-bell text-base sm:text-lg"></i>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-4 sm:h-5 px-1 sm:px-1.5 rounded-full bg-error text-white text-[10px] sm:text-xs flex items-center justify-center font-bold shadow-lg ring-2 ring-dark animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </>
          )}
          {/* Logo */}
          {setActiveTab ? (
            <button
              onClick={() => setActiveTab('following')}
              className="flex items-center gap-2 group min-w-0 flex-shrink"
              title="Ana Sayfa"
              aria-label="Ana Sayfa"
            >
              <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-light group-hover:text-primary transition-colors truncate">
                Tavsiyece
              </span>
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-2 group min-w-0 flex-shrink">
              <span className="text-lg sm:text-xl lg:text-2xl font-extrabold text-light group-hover:text-primary transition-colors truncate">
                Tavsiyece
              </span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {authUser ? (
            <>
              {setActiveTab ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'profile'
                      ? 'text-light bg-primary shadow-lg shadow-primary/30'
                      : 'text-muted hover:bg-card hover:text-primary'
                  }`}
                  title="Profil"
                  aria-label="Profil"
                >
                  <i className="fas fa-user text-base sm:text-lg"></i>
                </button>
              ) : (
                <Link
                  href="/profil"
                  className="p-2.5 sm:p-3 rounded-xl text-muted hover:bg-card hover:text-primary transition-all duration-300"
                  title="Profil"
                  aria-label="Profil"
                >
                  <i className="fas fa-user text-base sm:text-lg"></i>
                </Link>
              )}
              {setActiveTab && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`p-2.5 sm:p-3 rounded-xl transition-all duration-300 ${
                    activeTab === 'settings'
                      ? 'text-light bg-primary shadow-lg shadow-primary/30'
                      : 'text-muted hover:bg-card hover:text-primary'
                  }`}
                  title="Ayarlar"
                  aria-label="Ayarlar"
                >
                  <i className="fas fa-cog text-base sm:text-lg"></i>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-error/20 text-error hover:bg-error/30 transition-all duration-300 font-semibold text-xs sm:text-sm border border-error/30 whitespace-nowrap"
                title="Çıkış Yap"
                aria-label="Çıkış Yap"
              >
                <span className="hidden sm:inline">Çıkış</span>
                <i className="fas fa-sign-out-alt sm:hidden"></i>
              </button>
            </>
          ) : (
            <Link
              href="/giris"
              className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-primary text-light hover:bg-primary-dark transition-all duration-300 font-semibold text-xs sm:text-sm whitespace-nowrap"
            >
              <span className="hidden sm:inline">Giriş Yap</span>
              <span className="sm:hidden">Giriş</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

