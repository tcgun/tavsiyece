'use client';

import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../../firebaseConfig';

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
        <li className="p-4 flex justify-between items-center border-b border-border">
            <div>
                <h3 className="text-light font-semibold">{label}</h3>
                <p className="text-sm text-muted">{description}</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                    type="checkbox"
                    name={settingKey}
                    id={settingKey}
                    checked={enabled}
                    onChange={handleChange}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <label
                    htmlFor={settingKey}
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${enabled ? 'bg-primary' : 'bg-border'}`}
                />
            </div>
        </li>
    );
};

export default function NotificationSettingsSubTab({ onClose }) {
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
                            setSettings(defaultSettings);
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
                setLoading(false);
                setCurrentUser(null);
                setSettings(null);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const handleSettingChange = async (key, newState) => {
        if (!currentUser || !settings) return;

        setSettings((prev) => ({ ...prev, [key]: newState }));

        const settingsRef = doc(db, "users", currentUser.uid, "settings", "notifications");
        try {
            await setDoc(settingsRef, { [key]: newState }, { merge: true });
        } catch (error) {
            console.error("Ayar güncellenirken Firestore hatası:", error);
            setSettings((prev) => ({ ...prev, [key]: !newState }));
            alert("Ayar kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.");
        }
    };

    if (loading || settings === null) {
        return (
            <div className="flex justify-center py-12">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Bildirim Ayarları</h2>
                <div className="w-10"></div>
            </div>

            <div>
                <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-muted uppercase">Etkileşimler</p>
                </div>
                <ul className="bg-dark rounded-xl border border-border divide-y divide-border">
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
                    <p className="text-xs font-semibold text-muted uppercase">Güncellemeler</p>
                </div>
                <ul className="bg-dark rounded-xl border border-border divide-y divide-border">
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
            </div>
        </div>
    );
}

