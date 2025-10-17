'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function SettingsPage() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/giris');
        } catch (error) {
            console.error("Çıkış yaparken hata oluştu:", error);
        }
    };

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex items-center">
                    <Link href="/profil" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                        <h1 className="text-lg font-bold text-gray-800">Ayarlar</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="py-4">
                <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Hesap</p>
                </div>
                <ul className="divide-y divide-gray-200">
                    <Link href="/ayarlar/profili-duzenle" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-user-edit text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Profili Düzenle</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                    <Link href="/ayarlar/sifre-degistir" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-key text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Şifre Değiştir</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                </ul>
                <div className="px-4 py-2 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Uygulama</p>
                </div>
                <ul className="divide-y divide-gray-200">
                     <Link href="/ayarlar/bildirim-ayarlari" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-bell text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Bildirim Ayarları</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                    <Link href="/ayarlar/hakkimizda" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-info-circle text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Hakkımızda</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                     <Link href="/ayarlar/yardim-merkezi" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-question-circle text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Yardım Merkezi</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                </ul>
                <div className="px-4 py-2 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Yasal</p>
                </div>
                <ul className="divide-y divide-gray-200">
                     <Link href="/ayarlar/gizlilik-politikasi" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-shield-alt text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Gizlilik Politikası</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                    <Link href="/ayarlar/kullanim-kosullari" className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                            <i className="fas fa-file-contract text-gray-500 w-5 text-center"></i>
                            <span className="text-gray-800">Kullanım Koşulları</span>
                        </div>
                        <i className="fas fa-chevron-right text-gray-400"></i>
                    </Link>
                </ul>
                <div className="mt-6 px-4">
                    <button onClick={handleLogout} className="w-full text-left text-red-600 font-semibold p-4 rounded-lg hover:bg-red-50 transition-colors">
                        Çıkış Yap
                    </button>
                </div>
            </main>
        </div>
    );
};

