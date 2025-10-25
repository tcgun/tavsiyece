'use client';

import React from 'react';
import Image from 'next/image';

export default function CommentInput({ text, setText, author, onSubmit }) {
  return (
    <form onSubmit={(e) => onSubmit(e)} className="flex items-start space-x-3 p-4 border-t">
      <Image
        src={author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name || 'User')}&format=png&background=random&color=fff`}
        alt={author.name || 'User'}
        className="w-10 h-10 rounded-full object-cover"
        width={40}
        height={40}
        unoptimized
      />
      <div className="flex-1">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Yorumunu ekle..."
          rows="2"
          className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" // Odak rengi de değiştirildi (isteğe bağlı)
        />
        <button
          type="submit"
          disabled={!text.trim()}
          // --- RENK DEĞİŞİKLİĞİ BURADA ---
          className="mt-2 float-right bg-blue-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
          // --- ESKİ HALİ: bg-teal-600 ... hover:bg-teal-700 ---
        >
          Gönder
        </button>
      </div>
    </form>
  );
}