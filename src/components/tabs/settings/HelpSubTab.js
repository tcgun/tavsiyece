'use client';

import React, { useState } from 'react';

const AccordionItem = ({ title, content }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-border rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center text-left p-4 hover:bg-primary/10 transition-colors"
            >
                <span className="font-semibold text-light">{title}</span>
                <i className={`fas fa-chevron-down transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} text-muted`}></i>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="px-4 pb-4">
                    <p className="text-sm text-muted">{content}</p>
                </div>
            </div>
        </div>
    );
};

export default function HelpSubTab({ onClose }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Yardım Merkezi</h2>
                <div className="w-10"></div>
            </div>

            <div className="space-y-3">
                <AccordionItem
                    title="Nasıl tavsiye eklerim?"
                    content="Ana akış sayfasının sağ üst köşesindeki '+' ikonuna dokunarak veya arama sonuçlarından bir işletme seçip 'Tavsiye Et' butonuna tıklayarak kolayca yeni bir tavsiye oluşturabilirsiniz."
                />
                <AccordionItem
                    title="Profilimi nasıl gizli yapabilirim?"
                    content="Şu anki versiyonda tüm profiller herkese açıktır. Profil gizliliği özelliği üzerinde çalışıyoruz ve en kısa zamanda Ayarlar menüsüne eklenecektir."
                />
            </div>
        </div>
    );
}

