'use client';

import React from 'react';
import Link from 'next/link';

export default function TermsPage() {
    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex items-center">
                    {/* Geri butonu artık /ayarlar'a gidiyor */}
                    <Link href="/ayarlar" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                         <h1 className="text-lg font-bold text-gray-800">Kullanım Koşulları</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="p-6 prose max-w-full">
                <p className="text-sm text-gray-500">Son Güncelleme: 16 Ekim 2025</p>
                
                <h3>1. Hizmetin Kabulü</h3>
                <p>
                    Bu platformu kullanarak, burada belirtilen kullanım koşullarını kabul etmiş sayılırsınız. Lütfen koşulları dikkatlice okuyunuz. Bu koşulları kabul etmiyorsanız, platformu kullanmamalısınız.
                </p>

                <h3 className="mt-6">2. Kullanıcı Sorumlulukları</h3>
                <p>
                    Platformda paylaştığınız içeriklerin (tavsiyeler, yorumlar, fotoğraflar) yasalara uygun, doğru ve yanıltıcı olmamasından siz sorumlusunuz. Diğer kullanıcılara saygılı davranmayı, taciz edici veya yasa dışı içerik paylaşmamayı kabul edersiniz.
                </p>

                 <h3 className="mt-6">3. Hizmetin Sonlandırılması</h3>
                <p>
                    Bu koşullara uymamanız durumunda, hesabınıza erişiminizi askıya alma veya tamamen sonlandırma hakkını saklı tutarız.
                </p>
            </main>
        </div>
    );
};