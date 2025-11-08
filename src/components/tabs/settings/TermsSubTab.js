'use client';

import React from 'react';

export default function TermsSubTab({ onClose }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Kullanım Koşulları</h2>
                <div className="w-10"></div>
            </div>

            <div className="space-y-6">
                <p className="text-sm text-muted">Son Güncelleme: 16 Ekim 2025</p>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">1. Hizmetin Kabulü</h4>
                    <p className="text-muted leading-relaxed">
                        Bu platformu kullanarak, burada belirtilen kullanım koşullarını kabul etmiş sayılırsınız. Lütfen koşulları dikkatlice okuyunuz. Bu koşulları kabul etmiyorsanız, platformu kullanmamalısınız.
                    </p>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">2. Kullanıcı Sorumlulukları</h4>
                    <p className="text-muted leading-relaxed">
                        Platformda paylaştığınız içeriklerin (tavsiyeler, yorumlar, fotoğraflar) yasalara uygun, doğru ve yanıltıcı olmamasından siz sorumlusunuz. Diğer kullanıcılara saygılı davranmayı, taciz edici veya yasa dışı içerik paylaşmamayı kabul edersiniz.
                    </p>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">3. Hizmetin Sonlandırılması</h4>
                    <p className="text-muted leading-relaxed">
                        Bu koşullara uymamanız durumunda, hesabınıza erişiminizi askıya alma veya tamamen sonlandırma hakkını saklı tutarız.
                    </p>
                </div>
            </div>
        </div>
    );
}

