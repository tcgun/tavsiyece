'use client';

import React from 'react';

export default function PrivacySubTab({ onClose }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Gizlilik Politikası</h2>
                <div className="w-10"></div>
            </div>

            <div className="space-y-6">
                <p className="text-sm text-muted">Son Güncelleme: 16 Ekim 2025</p>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">1. Topladığımız Bilgiler</h4>
                    <p className="text-muted leading-relaxed mb-3">
                        Tavsiye Çemberi&apos;ni kullandığınızda, hizmetlerimizi sunmak ve iyileştirmek için bazı bilgileri toplarız. Bu bilgiler şunları içerebilir:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted ml-4">
                        <li><strong className="text-light">Hesap Bilgileri:</strong> İsim, kullanıcı adı, e-posta adresi ve şifre gibi kayıt sırasında sağladığınız bilgiler.</li>
                        <li><strong className="text-light">Profil Bilgileri:</strong> Biyografi ve profil fotoğrafı gibi profilinize eklediğiniz bilgiler.</li>
                        <li><strong className="text-light">İçerik:</strong> Yaptığınız tavsiyeler, yorumlar, beğeniler ve oluşturduğunuz listeler.</li>
                    </ul>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">2. Bilgilerinizi Nasıl Kullanıyoruz?</h4>
                    <p className="text-muted leading-relaxed">
                        Topladığımız bilgileri, platformu işletmek, kişiselleştirmek ve geliştirmek için kullanırız. Bu, tavsiye akışınızı düzenlemek, arkadaş önerilerinde bulunmak ve hizmetlerimizi daha güvenli hale getirmek gibi amaçları içerir.
                    </p>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">3. Bilgilerinizin Paylaşımı</h4>
                    <p className="text-muted leading-relaxed">
                        Profiliniz ve herkese açık olarak paylaştığınız içerikler (tavsiyeler, listeler vb.) platformdaki diğer kullanıcılar tarafından görülebilir. Kişisel iletişim bilgilerinizi (e-posta adresi gibi) izniniz olmadan üçüncü taraflarla paylaşmayız.
                    </p>
                </div>
            </div>
        </div>
    );
}

