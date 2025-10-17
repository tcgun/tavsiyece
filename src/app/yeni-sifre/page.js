'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

const NewPasswordComponent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [actionCode, setActionCode] = useState(null);

    useEffect(() => {
        const oobCode = searchParams.get('oobCode');
        if (oobCode) {
            setActionCode(oobCode);
        } else {
            setMessage({ type: 'error', text: 'Geçersiz veya eksik şifre sıfırlama kodu.' });
        }
    }, [searchParams]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Yeni şifreler eşleşmiyor.' });
            return;
        }
        if (formData.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Yeni şifre en az 6 karakter olmalıdır.' });
            return;
        }
        if (!actionCode) {
             setMessage({ type: 'error', text: 'Şifre sıfırlama kodu bulunamadı.' });
            return;
        }

        setIsSubmitting(true);
        
        try {
            await confirmPasswordReset(auth, actionCode, formData.newPassword);
            setMessage({ type: 'success', text: 'Şifreniz başarıyla güncellendi! Giriş sayfasına yönlendiriliyorsunuz...' });
            setTimeout(() => router.push('/giris'), 3000);

        } catch (error) {
            console.error("Şifre güncellenirken hata:", error.code);
            setMessage({ type: 'error', text: 'Şifre sıfırlama linki geçersiz veya süresi dolmuş olabilir. Lütfen tekrar deneyin.' });
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
                        <h1 className="text-lg font-bold text-gray-800">Yeni Şifre Belirle</h1>
                    </div>
                    <div className="w-10"></div>
                </div>
            </header>
            <main className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">Yeni Şifre</label>
                        <input type="password" name="newPassword" id="newPassword" value={formData.newPassword} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Yeni Şifre (Tekrar)</label>
                        <input type="password" name="confirmPassword" id="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div className="pt-4">
                         <button type="submit" disabled={isSubmitting || !actionCode} className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
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

// Next.js'in Suspense boundary'si ile sarmalayarak URL parametrelerinin okunmasını sağlıyoruz.
export default function NewPasswordPage() {
    return (
        <Suspense fallback={<div>Yükleniyor...</div>}>
            <NewPasswordComponent />
        </Suspense>
    );
}