'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setIsSubmitting(true);

        try {
            await sendPasswordResetEmail(auth, email);
            setMessage({ type: 'success', text: 'Şifre sıfırlama bağlantısı e-posta adresine gönderildi. Lütfen kutunu kontrol et.' });
        } catch (error) {
            console.error("Şifre sıfırlama hatası:", error.code);
            if (error.code === 'auth/user-not-found') {
                setMessage({ type: 'error', text: 'Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.' });
            } else {
                setMessage({ type: 'error', text: 'Bir hata oluştu. Lütfen tekrar dene.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white min-h-screen container mx-auto max-w-lg">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex items-center">
                    <Link href="/giris" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <div className="text-center flex-grow">
                        <h1 className="text-lg font-bold text-gray-800">Şifremi Unuttum</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="p-6">
                <p className="text-center text-sm text-gray-600 mb-6">
                    Hesabına bağlı e-posta adresini gir. Sana şifreni sıfırlaman için bir bağlantı göndereceğiz.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">E-posta Adresi</label>
                        <input 
                            type="email" 
                            name="email" 
                            id="email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="ornek@mail.com" 
                            required 
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        />
                    </div>
                    <div className="pt-4">
                        <button type="submit" disabled={isSubmitting} className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                        </button>
                    </div>
                    {message.text && (
                        <div className={`mt-4 text-center text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                            {message.text}
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
};