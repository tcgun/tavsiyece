'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../firebaseConfig';

export default function EditProfilePage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', username: '', bio: '' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Fotoğraf yükleme için state'ler
    const [profileImageFile, setProfileImageFile] = useState(null);
    const [profileImageUrl, setProfileImageUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setFormData({
                        name: userData.name || '',
                        username: userData.username || '',
                        bio: userData.bio || ''
                    });
                    setProfileImageUrl(userData.photoURL); // Mevcut fotoğrafı yükle
                }
                setLoading(false);
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImageUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!currentUser) return;

        setIsSubmitting(true);
        setMessage('');
        let newPhotoURL = profileImageUrl;

        try {
            // 1. Yeni bir fotoğraf seçildiyse, onu yükle
            if (profileImageFile) {
                const filePath = `profile_pictures/${currentUser.uid}/${profileImageFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, profileImageFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            // 2. Firestore'daki kullanıcı belgesini güncelle
            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, {
                name: formData.name,
                username: formData.username,
                bio: formData.bio,
                name_lowercase: formData.name.toLowerCase(),
                username_lowercase: formData.username.toLowerCase(),
                photoURL: newPhotoURL // Yeni fotoğraf URL'sini kaydet
            });
            
            setMessage('Profil başarıyla güncellendi!');
            setTimeout(() => router.push('/profil'), 1500);

        } catch (error) {
            console.error("Profil güncellenirken hata:", error);
            setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
            setIsSubmitting(false);
        }
    };

    if (loading) {
         return <div className="text-center py-10 flex flex-col items-center justify-center h-screen"><div className="loader"></div></div>;
    }

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <Link href="/profil" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <h1 className="text-lg font-bold text-gray-800">Profili Düzenle</h1>
                    <button onClick={handleSave} disabled={isSubmitting} className="text-teal-600 font-bold hover:bg-teal-50 px-3 py-1 rounded-lg disabled:opacity-50">
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </header>
            <main className="p-6 space-y-6">
                <div className="flex flex-col items-center space-y-3">
                    <img className="w-24 h-24 rounded-full bg-gray-200 object-cover" src={profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}&background=random&color=fff&size=96`} alt="Profil Fotoğrafı" />
                    {/* Gizli dosya input'u */}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                    <button onClick={() => fileInputRef.current.click()} className="text-sm font-semibold text-teal-600 hover:text-teal-700">Profil Fotoğrafını Değiştir</button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">İsim</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                        <div className="mt-1 flex rounded-md shadow-sm">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">@</span>
                            <input type="text" name="username" id="username" value={formData.username} onChange={handleInputChange} className="flex-1 min-w-0 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-none rounded-r-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">Biyografi</label>
                        <textarea id="bio" name="bio" rows="3" value={formData.bio} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                    </div>
                    {message && <div className={`text-center text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</div>}
                </div>
            </main>
        </div>
    );
};