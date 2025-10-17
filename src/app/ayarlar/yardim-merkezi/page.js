'use client';

import React from 'react';
import Link from 'next/link';

const AccordionItem = ({ title, content }) => {
    const [isOpen, setIsOpen] = React.useState(false);

    return (
        <div className="border border-gray-200 rounded-lg">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left p-4">
                <span className="font-semibold text-gray-800">{title}</span>
                <i className={`fas fa-chevron-down transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}></i>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600">{content}</p>
                </div>
            </div>
        </div>
    );
};

export default function HelpPage() {
    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex items-center">
                    <Link href="/ayarlar" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                         <h1 className="text-lg font-bold text-gray-800">Yardım Merkezi</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="p-4">
                <div className="space-y-3">
                    <AccordionItem 
                        title="Nasıl tavsiye eklerim?"
                        content="Ana akış sayfasının sağ üst köşesindeki '+' ikonuna dokunarak veya arama sonuçlarından bir işletme seçip 'Tavsiye Et' butonuna tıklayarak kolayca yeni bir tavsiye oluşturabilirsiniz."
                    />
                    <AccordionItem 
                        title="Listeler ne işe yarar?"
                        content="Listeler, yaptığınız tavsiyeleri 'İstanbul'daki Kahveciler' veya 'Gidilecek Tatil Otelleri' gibi başlıklar altında gruplayarak kendi koleksiyonlarınızı oluşturmanızı sağlar. Bu listeleri arkadaşlarınızla paylaşabilirsiniz."
                    />
                    <AccordionItem 
                        title="Profilimi nasıl gizli yapabilirim?"
                        content="Şu anki versiyonda tüm profiller herkese açıktır. Profil gizliliği özelliği üzerinde çalışıyoruz ve en kısa zamanda Ayarlar menüsüne eklenecektir."
                    />
                </div>
            </main>
        </div>
    );
};