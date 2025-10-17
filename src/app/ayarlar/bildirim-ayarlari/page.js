'use client';

import React, { useState } from 'react';
import Link from 'next/link';

// Bu bileşen, her bir ayar satırını temsil eder
const ToggleSwitch = ({ label, description, isEnabled }) => {
    const [enabled, setEnabled] = useState(isEnabled);

    return (
        <li className="p-4 flex justify-between items-center">
            <div>
                <h3 className="text-gray-800">{label}</h3>
                <p className="text-sm text-gray-500">{description}</p>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                    type="checkbox" 
                    name={label} 
                    id={label} 
                    checked={enabled}
                    onChange={() => setEnabled(!enabled)}
                    className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label 
                    htmlFor={label} 
                    className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${enabled ? 'bg-teal-500' : 'bg-gray-300'}`}
                ></label>
            </div>
        </li>
    );
};


export default function NotificationSettingsPage() {
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
                    <ToggleSwitch label="Yeni Takipçiler" description="Biri seni takip ettiğinde" isEnabled={true} />
                    <ToggleSwitch label="Beğeniler" description="Biri tavsiyeni beğendiğinde" isEnabled={true} />
                    <ToggleSwitch label="Yorumlar" description="Biri tavsiyene yorum yaptığında" isEnabled={true} />
                </ul>
                
                <div className="px-4 py-2 mt-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Güncellemeler</p>
                </div>
                 <ul className="divide-y divide-gray-200">
                    <ToggleSwitch label="Arkadaş Aktivitesi" description="Takip ettiğin biri yeni tavsiye eklediğinde" isEnabled={false} />
                    <ToggleSwitch label="Duyurular" description="Uygulama ile ilgili önemli haberler" isEnabled={true} />
                </ul>
            </main>
        </div>
    );
};