'use client';

import React from 'react';

export default function AboutSubTab({ onClose }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Hakkımızda</h2>
                <div className="w-10"></div>
            </div>

            <div className="space-y-6">
                <div className="text-center">
                    <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-hands-helping text-4xl text-primary"></i>
                    </div>
                    <h3 className="text-2xl font-bold text-light">Güven Paylaştıkça Büyür</h3>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">Misyonumuz</h4>
                    <p className="text-muted leading-relaxed">
                        Tavsiye Çemberi olarak misyonumuz, insanların en çok güvendiği kaynağa, yani birbirlerinin deneyimlerine kolayca ulaşmalarını sağlamaktır. Reklamların ve sponsorlu içeriklerin gürültüsünde kaybolan gerçek ve samimi tavsiyeleri ön plana çıkararak, herkesin daha iyi kararlar vermesine yardımcı olmak için yola çıktık.
                    </p>
                </div>

                <div>
                    <h4 className="text-lg font-bold text-light mb-2">Vizyonumuz</h4>
                    <p className="text-muted leading-relaxed">
                        En büyük hayalimiz, sadece bir &quot;tavsiye uygulaması&quot; olmanın ötesine geçerek, insanların güvendiği işletmeleri, ustaları ve hizmetleri desteklediği, yerel ekonomiyi canlandıran ve dürüstlüğü ödüllendiren dijital bir güven ağı oluşturmaktır. Her tavsiyenin bir dost sohbeti kadar sıcak ve samimi olduğu bir platform yaratmayı hedefliyoruz.
                    </p>
                </div>
            </div>
        </div>
    );
}

