'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from '../../firebaseConfig';

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState('login');
    const [message, setMessage] = useState({ type: '', text: '' });
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.push('/'); // Eğer kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
            }
        });
        return () => unsubscribe();
    }, [router]);

    const showMessage = (text, type = 'error') => {
        setMessage({ type, text });
    };

    const isUsernameTaken = async (username) => {
        const lowercaseUsername = username.toLowerCase();
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username_lowercase", "==", lowercaseUsername));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        const { name, username, email, password } = e.target.elements;
        const submitButton = e.target.querySelector('button');
        
        submitButton.disabled = true;
        submitButton.textContent = 'Kontrol Ediliyor...';
        showMessage('', 'info');

        if (username.value.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username.value)) {
            showMessage('Kullanıcı adı en az 3 karakter olmalı ve sadece harf, rakam ve alt çizgi içermelidir.');
            submitButton.disabled = false;
            submitButton.textContent = 'Kayıt Ol';
            return;
        }

        const usernameExists = await isUsernameTaken(username.value);
        if (usernameExists) {
            showMessage('Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane deneyin.');
            submitButton.disabled = false;
            submitButton.textContent = 'Kayıt Ol';
            return;
        }

        submitButton.textContent = 'Kaydediliyor...';
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
            const user = userCredential.user;

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid, 
                name: name.value, 
                email: email.value,
                name_lowercase: name.value.toLowerCase(),
                username: username.value,
                username_lowercase: username.value.toLowerCase(),
                bio: 'Tavsiye Çemberi\'ne yeni katıldım!',
                photoURL: '', 
                createdAt: new Date(), 
                following: [], 
                followers: [], 
                savedRecommendations: []
            });
            
            // Yönlendirme useEffect tarafından yapılacak.

        } catch (error) {
            showMessage(getFriendlyErrorMessage(error.code));
            submitButton.disabled = false;
            submitButton.textContent = 'Kayıt Ol';
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const { email, password } = e.target.elements;
        const submitButton = e.target.querySelector('button');

        submitButton.disabled = true;
        submitButton.textContent = 'Giriş Yapılıyor...';
        showMessage('', 'info');
        
        try {
            await signInWithEmailAndPassword(auth, email.value, password.value);
            // Yönlendirme useEffect tarafından yapılacak.
        } catch (error) {
            showMessage(getFriendlyErrorMessage(error.code));
            submitButton.disabled = false;
            submitButton.textContent = 'Giriş Yap';
        }
    };
    
    const getFriendlyErrorMessage = (errorCode) => {
        switch (errorCode) {
            case 'auth/email-already-in-use': return 'Bu e-posta adresi zaten kullanılıyor.';
            case 'auth/invalid-email': return 'Geçersiz e-posta adresi formatı.';
            case 'auth/weak-password': return 'Şifre en az 6 karakter olmalıdır.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential': return 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.';
            default: return 'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        }
    };

    return (
        <div className="container mx-auto max-w-lg min-h-screen bg-white">
            <header className="p-6 text-center">
                <h1 className="text-3xl font-bold text-gray-800">Tavsiye Çemberi&apos;ne Hoş Geldin</h1>
                <p className="mt-2 text-gray-600">Güvenilir tavsiyelerle dolu bir dünyaya adım at.</p>
            </header>
            
            <div className="border-b border-gray-200">
                <div className="tabs flex justify-around">
                    <button onClick={() => setActiveTab('login')} className={`w-full py-3 text-sm font-semibold border-b-2 hover:bg-gray-50 ${activeTab === 'login' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent'}`}>Giriş Yap</button>
                    <button onClick={() => setActiveTab('signup')} className={`w-full py-3 text-sm font-semibold border-b-2 hover:bg-gray-50 ${activeTab === 'signup' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent'}`}>Kayıt Ol</button>
                </div>
            </div>

            <main className="p-6">
                {activeTab === 'login' && (
                    <div id="login">
                        <form id="login-form" className="space-y-4" onSubmit={handleLogin}>
                            <div>
                                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">E-posta Adresi</label>
                                <input type="email" name="email" id="login-email" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Şifre</label>
                                <input type="password" name="password" id="login-password" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                            </div>
                            <div className="text-right">
                                <Link href="/sifremi-unuttum" className="text-sm font-medium text-teal-600 hover:text-teal-700">Şifreni mi unuttun?</Link>
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors">Giriş Yap</button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'signup' && (
                    <div id="signup">
                        <form id="signup-form" className="space-y-4" onSubmit={handleSignup}>
                            <div>
                                <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700">İsim</label>
                                <input type="text" name="name" id="signup-name" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="signup-username" className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">@</span>
                                    <input type="text" name="username" id="signup-username" required className="flex-1 min-w-0 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-none rounded-r-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" placeholder="mecnun" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700">E-posta Adresi</label>
                                <input type="email" name="email" id="signup-email" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                            </div>
                            <div>
                                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700">Şifre</label>
                                <input type="password" name="password" id="signup-password" required className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                            </div>
                            <div className="pt-2">
                                <button type="submit" className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors">Kayıt Ol</button>
                            </div>
                        </form>
                    </div>
                )}
                
                {message.text && (
                    <div className={`mt-4 text-center text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                        {message.text}
                    </div>
                )}
            </main>
        </div>
    );
};