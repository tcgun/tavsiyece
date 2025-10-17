'use client';

import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex items-center">
                    <Link href="/ayarlar" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                        <h1 className="text-lg font-bold text-gray-800">Hakkımızda</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="p-6 prose max-w-full">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
                        <i className="fas fa-hands-helping text-4xl text-teal-500"></i>
                    </div>
                    <h2 className="mt-4 text-3xl font-bold text-gray-900">Güven Paylaştıkça Büyür</h2>
                </div>

                <h3>Misyonumuz</h3>
                <p>
                    Tavsiye Çemberi olarak misyonumuz, insanların en çok güvendiği kaynağa, yani birbirlerinin deneyimlerine kolayca ulaşmalarını sağlamaktır. Reklamların ve sponsorlu içeriklerin gürültüsünde kaybolan gerçek ve samimi tavsiyeleri ön plana çıkararak, herkesin daha iyi kararlar vermesine yardımcı olmak için yola çıktık.
                </p>

                <h3>Vizyonumuz</h3>
                <p>
                    En büyük hayalimiz, sadece bir &quot;tavsiye uygulaması&quot; olmanın ötesine geçerek, insanların güvendiği işletmeleri, ustaları ve hizmetleri desteklediği, yerel ekonomiyi canlandıran ve dürüstlüğü ödüllendiren dijital bir güven ağı oluşturmaktır. Her tavsiyenin bir dost sohbeti kadar sıcak ve samimi olduğu bir platform yaratmayı hedefliyoruz.
                </p>
            </main>
        </div>
    );
};