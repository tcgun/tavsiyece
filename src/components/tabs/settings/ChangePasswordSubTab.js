'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../../firebaseConfig';

export default function ChangePasswordSubTab({ onClose }) {
    const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

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

        setIsSubmitting(true);
        
        try {
            const credential = EmailAuthProvider.credential(user.email, formData.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, formData.newPassword);
            
            setMessage({ type: 'success', text: 'Şifreniz başarıyla güncellendi!' });
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setTimeout(() => onClose(), 2000);

        } catch (error) {
            console.error("Şifre güncellenirken hata:", error.code);
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                setMessage({ type: 'error', text: 'Mevcut şifreniz yanlış.' });
            } else {
                setMessage({ type: 'error', text: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Şifre Değiştir</h2>
                <div className="w-10"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-light mb-2">Mevcut Şifre</label>
                    <input
                        type="password"
                        name="currentPassword"
                        id="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-dark border border-border rounded-xl text-light focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-light mb-2">Yeni Şifre</label>
                    <input
                        type="password"
                        name="newPassword"
                        id="newPassword"
                        value={formData.newPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-dark border border-border rounded-xl text-light focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-light mb-2">Yeni Şifre (Tekrar)</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        id="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 bg-dark border border-border rounded-xl text-light focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary text-light font-bold py-3 px-4 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                    >
                        {isSubmitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                    </button>
                </div>
                {message.text && (
                    <div className={`text-center text-sm font-medium ${message.type === 'error' ? 'text-error' : 'text-primary'}`}>
                        {message.text}
                    </div>
                )}
            </form>
        </div>
    );
}

