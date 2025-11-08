'use client';

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../../firebaseConfig';
import { getAvatarUrlWithFallback } from '../../../utils/avatarUtils';

export default function EditProfileSubTab({ onClose, onProfileUpdate }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({ name: '', username: '', bio: '' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
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
                    setProfileImageUrl(userData.photoURL);
                }
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

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
            if (profileImageFile) {
                const filePath = `profile_pictures/${currentUser.uid}/${profileImageFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, profileImageFile);
                newPhotoURL = await getDownloadURL(snapshot.ref);
            }

            const userDocRef = doc(db, "users", currentUser.uid);
            await updateDoc(userDocRef, {
                name: formData.name,
                username: formData.username,
                bio: formData.bio,
                name_lowercase: formData.name.toLowerCase(),
                username_lowercase: formData.username.toLowerCase(),
                photoURL: newPhotoURL
            });
            
            setMessage('Profil başarıyla güncellendi!');
            if (onProfileUpdate) {
                onProfileUpdate({ ...formData, photoURL: newPhotoURL });
            }
            setTimeout(() => onClose(), 1500);

        } catch (error) {
            console.error("Profil güncellenirken hata:", error);
            setMessage('Bir hata oluştu. Lütfen tekrar deneyin.');
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-muted hover:bg-primary/10 hover:text-primary transition-colors"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h2 className="text-xl font-bold text-light">Profili Düzenle</h2>
                <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-primary text-light font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                    {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>

            <div className="space-y-6">
                <div className="flex flex-col items-center space-y-3">
                    <img
                        className="w-24 h-24 rounded-full bg-dark border-4 border-primary object-cover"
                        src={getAvatarUrlWithFallback(profileImageUrl, formData.name, formData.username)}
                        alt="Profil Fotoğrafı"
                    />
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/png, image/jpeg"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm font-semibold text-primary hover:text-primary-dark"
                    >
                        Profil Fotoğrafını Değiştir
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-light mb-2">İsim</label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-dark border border-border rounded-xl text-light focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-light mb-2">Kullanıcı Adı</label>
                        <div className="flex rounded-xl overflow-hidden border border-border">
                            <span className="inline-flex items-center px-3 bg-dark text-muted border-r border-border">@</span>
                            <input
                                type="text"
                                name="username"
                                id="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                className="flex-1 px-4 py-2 bg-dark text-light focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-light mb-2">Biyografi</label>
                        <textarea
                            id="bio"
                            name="bio"
                            rows="3"
                            value={formData.bio}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 bg-dark border border-border rounded-xl text-light focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>
                    {message && (
                        <div className={`text-center text-sm font-medium ${message.includes('hata') ? 'text-error' : 'text-primary'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

