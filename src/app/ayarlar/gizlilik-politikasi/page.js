'use client';

import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex items-center">
                    {/* Geri butonu artık /ayarlar'a gidiyor */}
                    <Link href="/ayarlar" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                         <h1 className="text-lg font-bold text-gray-800">Gizlilik Politikası</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="p-6 prose max-w-full">
                <p className="text-sm text-gray-500">Son Güncelleme: 16 Ekim 2025</p>
                
                <h3>1. Topladığımız Bilgiler</h3>
                <p>
                    Tavsiye Çemberi&apos;ni kullandığınızda, hizmetlerimizi sunmak ve iyileştirmek için bazı bilgileri toplarız. Bu bilgiler şunları içerebilir:
                </p>
                <ul className="list-disc list-inside space-y-2">
                    <li><strong>Hesap Bilgileri:</strong> İsim, kullanıcı adı, e-posta adresi ve şifre gibi kayıt sırasında sağladığınız bilgiler.</li>
                    <li><strong>Profil Bilgileri:</strong> Biyografi ve profil fotoğrafı gibi profilinize eklediğiniz bilgiler.</li>
                    <li><strong>İçerik:</strong> Yaptığınız tavsiyeler, yorumlar, beğeniler ve oluşturduğunuz listeler.</li>
                </ul>

                <h3 className="mt-6">2. Bilgilerinizi Nasıl Kullanıyoruz?</h3>
                <p>
                    Topladığımız bilgileri, platformu işletmek, kişiselleştirmek ve geliştirmek için kullanırız. Bu, tavsiye akışınızı düzenlemek, arkadaş önerilerinde bulunmak ve hizmetlerimizi daha güvenli hale getirmek gibi amaçları içerir.
                </p>

                <h3 className="mt-6">3. Bilgilerinizin Paylaşımı</h3>
                <p>
                    Profiliniz ve herkese açık olarak paylaştığınız içerikler (tavsiyeler, listeler vb.) platformdaki diğer kullanıcılar tarafından görülebilir. Kişisel iletişim bilgilerinizi (e-posta adresi gibi) izniniz olmadan üçüncü taraflarla paylaşmayız.
                </p>
            </main>
        </div>
    );
};