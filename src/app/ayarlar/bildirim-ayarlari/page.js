'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../firebaseConfig';
import { useRouter } from 'next/navigation';

// ToggleSwitch Bileşeni
const ToggleSwitch = ({ label, description, isEnabled, onToggle, settingKey }) => {
    const [enabled, setEnabled] = useState(isEnabled);

    useEffect(() => {
        setEnabled(isEnabled);
    }, [isEnabled]);

    const handleChange = () => {
        const newState = !enabled;
        setEnabled(newState);
        if (onToggle) onToggle(settingKey, newState);
    };

    return (
        <li className="p-4 flex justify-between items-center">
            <div>
                <h3 className="text-gray-800">{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                    type="checkbox"
                    name={settingKey}
                    id={settingKey}
                    checked={enabled}
                    onChange={handleChange}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
                <label
                    htmlFor={settingKey}
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${enabled ? 'bg-teal-500' : 'bg-gray-300'}`}
                ></label>
            </div>
        </li>
    );
};

export default function NotificationSettingsPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const defaultSettings = {
            yeniTakipciler: true,
            begeniler: true,
            arkadasAktivitesi: false,
            duyurular: true,
        };

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                const settingsRef = doc(db, "users", user.uid, "settings", "notifications");

                const unsubscribeSettings = onSnapshot(
                    settingsRef,
                    (docSnap) => {
                        if (docSnap.exists()) {
                            setSettings({ ...defaultSettings, ...docSnap.data() });
                        } else {
                            console.log("Bildirim ayarları bulunamadı, varsayılanlar kullanılıyor.");
                            setSettings(defaultSettings);
                            // İlk defa ayarlar sayfasına giriliyorsa varsayılanları DB'ye yazabiliriz
                            // setDoc(settingsRef, defaultSettings, { merge: true });
                        }
                        setLoading(false);
                    },
                    (error) => {
                        console.error("Bildirim ayarları alınırken hata:", error);
                        setSettings(defaultSettings);
                        setLoading(false);
                    }
                );

                return () => unsubscribeSettings();
            } else {
                router.push('/giris');
                setLoading(false);
                setCurrentUser(null);
                setSettings(null);
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    const handleSettingChange = async (key, newState) => {
        if (!currentUser || !settings) return;

        setSettings((prev) => ({ ...prev, [key]: newState }));

        const settingsRef = doc(db, "users", currentUser.uid, "settings", "notifications");
        try {
            await setDoc(settingsRef, { [key]: newState }, { merge: true });
            console.log(`Ayar başarıyla güncellendi: ${key} -> ${newState}`);
        } catch (error) {
            console.error("Ayar güncellenirken Firestore hatası:", error);
            setSettings((prev) => ({ ...prev, [key]: !newState }));
            alert("Ayar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    if (loading || settings === null) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex items-center">
                    <Link href="/ayarlar" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                        <h1 className="text-lg font-bold text-gray-800">Bildirim Ayarları</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="py-4">
                <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Etkileşimler</p>
                </div>
                <ul className="divide-y divide-gray-200">
                    <ToggleSwitch
                        label="Yeni Takipçiler"
                        description="Biri seni takip ettiğinde"
                        settingKey="yeniTakipciler"
                        isEnabled={settings.yeniTakipciler}
                        onToggle={handleSettingChange}
                    />
                    <ToggleSwitch
                        label="Beğeniler"
                        description="Biri tavsiyeni beğendiğinde"
                        settingKey="begeniler"
                        isEnabled={settings.begeniler}
                        onToggle={handleSettingChange}
                    />
                </ul>

                <div className="px-4 py-2 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Güncellemeler</p>
                </div>
                <ul className="divide-y divide-gray-200">
                    <ToggleSwitch
                        label="Arkadaş Aktivitesi"
                        description="Takip ettiğin biri yeni tavsiye eklediğinde"
                        settingKey="arkadasAktivitesi"
                        isEnabled={settings.arkadasAktivitesi}
                        onToggle={handleSettingChange}
                    />
                    <ToggleSwitch
                        label="Duyurular"
                        description="Uygulama ile ilgili önemli haberler"
                        settingKey="duyurular"
                        isEnabled={settings.duyurular}
                        onToggle={handleSettingChange}
                    />
                </ul>
            </main>
        </div>
    );
}
