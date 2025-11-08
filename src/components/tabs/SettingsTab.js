'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import EditProfileSubTab from './settings/EditProfileSubTab';
import ChangePasswordSubTab from './settings/ChangePasswordSubTab';
import NotificationSettingsSubTab from './settings/NotificationSettingsSubTab';
import AboutSubTab from './settings/AboutSubTab';
import HelpSubTab from './settings/HelpSubTab';
import PrivacySubTab from './settings/PrivacySubTab';
import TermsSubTab from './settings/TermsSubTab';

export default function SettingsTab({ onProfileUpdate }) {
    const router = useRouter();
    const [activeSubTab, setActiveSubTab] = useState(null); // null = main, 'edit-profile', 'change-password', etc.

    // URL'den sub parametresini oku
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            const sub = searchParams.get('sub');
            if (sub) {
                setActiveSubTab(sub);
            }
        }
    }, []);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/giris');
        } catch (error) {
            console.error("Çıkış yaparken hata oluştu:", error);
        }
    };

    // Sub-tab kapatıldığında URL'yi güncelle
    const handleCloseSubTab = () => {
        setActiveSubTab(null);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            url.searchParams.delete('sub');
            window.history.replaceState({}, '', url);
        }
    };

    // Sub-tab değiştiğinde URL'yi güncelle
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = new URL(window.location);
            if (activeSubTab) {
                url.searchParams.set('sub', activeSubTab);
            } else {
                url.searchParams.delete('sub');
            }
            window.history.replaceState({}, '', url);
        }
    }, [activeSubTab]);

    // Sub-tab varsa onu göster
    if (activeSubTab) {
        const commonProps = { onClose: handleCloseSubTab };
        
        switch (activeSubTab) {
            case 'edit-profile':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <EditProfileSubTab {...commonProps} onProfileUpdate={onProfileUpdate} />
                    </div>
                );
            case 'change-password':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <ChangePasswordSubTab {...commonProps} />
                    </div>
                );
            case 'notifications':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <NotificationSettingsSubTab {...commonProps} />
                    </div>
                );
            case 'about':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <AboutSubTab {...commonProps} />
                    </div>
                );
            case 'help':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <HelpSubTab {...commonProps} />
                    </div>
                );
            case 'privacy':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <PrivacySubTab {...commonProps} />
                    </div>
                );
            case 'terms':
                return (
                    <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
                        <TermsSubTab {...commonProps} />
                    </div>
                );
            default:
                return null;
        }
    }

    // Ana ayarlar listesi
    return (
        <div className="bg-card border border-border rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-xl">
            <h1 className="text-2xl font-bold text-light mb-6">Ayarlar</h1>

            <div className="space-y-6">
                {/* Hesap Bölümü */}
                <div>
                    <p className="text-xs font-semibold text-muted uppercase mb-3">Hesap</p>
                    <div className="bg-dark rounded-xl border border-border divide-y divide-border">
                        <button
                            onClick={() => setActiveSubTab('edit-profile')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-user-edit text-primary w-5 text-center"></i>
                                <span className="text-light">Profili Düzenle</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('change-password')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-key text-primary w-5 text-center"></i>
                                <span className="text-light">Şifre Değiştir</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                    </div>
                </div>

                {/* Uygulama Bölümü */}
                <div>
                    <p className="text-xs font-semibold text-muted uppercase mb-3">Uygulama</p>
                    <div className="bg-dark rounded-xl border border-border divide-y divide-border">
                        <button
                            onClick={() => setActiveSubTab('notifications')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-bell text-primary w-5 text-center"></i>
                                <span className="text-light">Bildirim Ayarları</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('about')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-info-circle text-primary w-5 text-center"></i>
                                <span className="text-light">Hakkımızda</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('help')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-question-circle text-primary w-5 text-center"></i>
                                <span className="text-light">Yardım Merkezi</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                    </div>
                </div>

                {/* Yasal Bölümü */}
                <div>
                    <p className="text-xs font-semibold text-muted uppercase mb-3">Yasal</p>
                    <div className="bg-dark rounded-xl border border-border divide-y divide-border">
                        <button
                            onClick={() => setActiveSubTab('privacy')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-shield-alt text-primary w-5 text-center"></i>
                                <span className="text-light">Gizlilik Politikası</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                        <button
                            onClick={() => setActiveSubTab('terms')}
                            className="w-full p-4 flex justify-between items-center hover:bg-primary/10 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <i className="fas fa-file-contract text-primary w-5 text-center"></i>
                                <span className="text-light">Kullanım Koşulları</span>
                            </div>
                            <i className="fas fa-chevron-right text-muted"></i>
                        </button>
                    </div>
                </div>

                {/* Çıkış Yap */}
                <div className="pt-4">
                    <button
                        onClick={handleLogout}
                        className="w-full text-left text-error font-semibold p-4 rounded-xl bg-error/10 border border-error/30 hover:bg-error/20 transition-colors"
                    >
                        <i className="fas fa-sign-out-alt mr-2"></i>
                        Çıkış Yap
                    </button>
                </div>
            </div>
        </div>
    );
}
