'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { collection, addDoc, serverTimestamp, doc, getDoc, query, getDocs, orderBy, updateDoc, increment } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrlWithFallback } from '../utils';

export default function AddRecommendationModal({ isOpen, onClose, onSuccess }) {
    const { user: authUser } = useAuth();
    const [currentUserData, setCurrentUserData] = useState(null);
    const [formData, setFormData] = useState({ title: '', category: '', text: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    const [categories, setCategories] = useState([]);

    // Kullanıcı verilerini çek
    useEffect(() => {
        if (!authUser?.uid || !isOpen) return;

        const fetchUserData = async () => {
            try {
                const userDocRef = doc(db, "users", authUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setCurrentUserData({ uid: authUser.uid, ...userDocSnap.data() });
                }
            } catch (error) {
                // Permission hatası veya başka bir hata
                if (error.code !== 'permission-denied') {
                    console.error("Kullanıcı verisi çekilirken hata:", error);
                }
                setCurrentUserData(null);
            }
        };

        fetchUserData();
    }, [authUser?.uid, isOpen]);

    // Kategorileri çek
    useEffect(() => {
        if (!isOpen) return;

        const fetchCategories = async () => {
            try {
                // Önce order field'ı ile dene
                try {
                    const catQuery = query(collection(db, 'categories'), orderBy('order', 'asc'));
                    const catSnapshot = await getDocs(catQuery);
                    if (!catSnapshot.empty) {
                        const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setCategories(fetchedCategories);
                        return;
                    }
                } catch (orderError) {
                    // Permission hatası ise sessizce devam et
                    if (orderError.code === 'permission-denied') {
                        setCategories([]);
                        return;
                    }
                    // order field yoksa normal çek
                }
                
                // order field yoksa normal çek
                try {
                    const catQuery = query(collection(db, 'categories'));
                    const catSnapshot = await getDocs(catQuery);
                    const fetchedCategories = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCategories(fetchedCategories);
                } catch (queryError) {
                    // Permission hatası veya başka bir hata
                    if (queryError.code !== 'permission-denied') {
                        console.error("Kategoriler çekilirken hata:", queryError);
                    }
                    setCategories([]);
                }
            } catch (error) {
                // Permission hatası veya başka bir hata
                if (error.code !== 'permission-denied') {
                    console.error("Kategoriler çekilirken genel hata:", error);
                }
                setCategories([]);
            }
        };

        fetchCategories();
    }, [isOpen]);

    // Modal kapandığında form'u sıfırla
    useEffect(() => {
        if (!isOpen) {
            setFormData({ title: '', category: '', text: '' });
            setSelectedFile(null);
            setPreviewUrl(null);
            setMessage({ type: '', text: '' });
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [isOpen]);

    // ESC tuşu ile modal'ı kapat ve body scroll'unu engelle
    useEffect(() => {
        if (!isOpen) return;

        // Body scroll'unu engelle
        document.body.style.overflow = 'hidden';

        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isSubmitting) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => {
            window.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, isSubmitting, onClose]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Dosya boyutu kontrolü (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setMessage({ type: 'error', text: 'Dosya boyutu 5MB\'dan küçük olmalıdır.' });
                return;
            }
            // Dosya tipi kontrolü
            if (!file.type.startsWith('image/')) {
                setMessage({ type: 'error', text: 'Sadece resim dosyaları yüklenebilir.' });
                return;
            }
            setSelectedFile(file);
            setMessage({ type: '', text: '' });
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const removeImage = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim() || !formData.category.trim() || !formData.text.trim()) {
            setMessage({ type: 'error', text: 'Lütfen tüm zorunlu alanları doldurun.' });
            return;
        }
        
        if (!authUser?.uid) {
            setMessage({ type: 'error', text: 'Giriş yapmanız gerekiyor.' });
            return;
        }
        
        setIsSubmitting(true);
        setMessage({ type: 'info', text: 'Tavsiyeniz yükleniyor, lütfen bekleyin...' });

        let imageUrl = null;
        try {
            if (selectedFile) {
                const filePath = `recommendations/${authUser.uid}/${Date.now()}-${selectedFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // Keywords oluştur (arama için)
            const titleWords = formData.title.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
            const categoryWords = formData.category.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
            const textWords = formData.text.toLowerCase().trim().split(/\s+/).filter(w => w.length > 2);
            const allKeywords = [...new Set([...titleWords, ...categoryWords, ...textWords])]; // Duplicate'leri kaldır

            await addDoc(collection(db, "recommendations"), {
                userId: authUser.uid,
                title: formData.title.trim(),
                category: formData.category.trim(),
                text: formData.text.trim(),
                title_lowercase: formData.title.toLowerCase().trim(),
                category_lowercase: formData.category.toLowerCase().trim(),
                text_lowercase: formData.text.toLowerCase().trim(),
                keywords: allKeywords,
                createdAt: serverTimestamp(),
                likes: [],
                ...(imageUrl && { image: imageUrl, imageUrl })
            });

            // Kullanıcının recommendationsCount'unu artır
            try {
                const userRef = doc(db, 'users', authUser.uid);
                const userSnap = await getDoc(userRef);
                
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    const currentCount = userData.recommendationsCount || 0;
                    
                    // increment kullan (field varsa artırır, yoksa 1'e set eder)
                    await updateDoc(userRef, {
                        recommendationsCount: increment(1)
                    });
                } else {
                    // Kullanıcı profili yoksa oluştur (normalde olmaması gerekir)
                    console.warn("Kullanıcı profili bulunamadı, recommendationsCount güncellenemedi");
                }
            } catch (error) {
                console.error("RecommendationsCount güncellenirken hata:", error);
                // Hata olsa bile tavsiye eklendi, devam et
            }

            setMessage({ type: 'success', text: 'Tavsiyeniz başarıyla eklendi!' });
            
            // Başarılı olduktan sonra callback çağır ve modal'ı kapat
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                }
                onClose();
            }, 1000);

        } catch (error) {
            console.error("Tavsiye eklenirken hata oluştu: ", error);
            setMessage({ type: 'error', text: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const profileAvatar = currentUserData ? getAvatarUrlWithFallback(currentUserData.photoURL, currentUserData.name, currentUserData.username) : 'https://ui-avatars.com/api/?name=?&background=random';

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={handleBackdropClick}
        >
            <div 
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border bg-dark/50">
                    <h2 className="text-xl sm:text-2xl font-extrabold text-light">Yeni Tavsiye</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-card hover:bg-primary/20 text-muted hover:text-primary transition-all duration-300 flex items-center justify-center"
                        aria-label="Kapat"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} id="add-recommendation-form" className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="space-y-6">
                        {/* Kullanıcı Bilgisi */}
                        {currentUserData && (
                            <div className="flex items-center space-x-3 pb-4 border-b border-border">
                                <Image
                                    src={profileAvatar}
                                    alt={currentUserData.name || 'Kullanıcı'}
                                    width={48}
                                    height={48}
                                    className="rounded-full object-cover"
                                    unoptimized
                                />
                                <div>
                                    <p className="font-bold text-light">{currentUserData.name || 'Kullanıcı'}</p>
                                    {currentUserData.username && (
                                        <p className="text-xs text-muted">@{currentUserData.username}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Başlık */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-semibold text-light mb-2">
                                Başlık <span className="text-error">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                                placeholder="Tavsiyenin başlığı (Örn: Harika Bir Film)"
                                className="w-full px-4 py-3 bg-dark border border-border rounded-xl text-light placeholder-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                            />
                        </div>

                        {/* Kategori */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-semibold text-light mb-2">
                                Kategori <span className="text-error">*</span>
                            </label>
                            {categories.length > 0 ? (
                                <select
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-dark border border-border rounded-xl text-light focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                                >
                                    <option value="">Kategori seçin</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    id="category"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="Kategori (Örn: Film, Restoran, Kitap)"
                                    className="w-full px-4 py-3 bg-dark border border-border rounded-xl text-light placeholder-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300"
                                />
                            )}
                        </div>

                        {/* Metin */}
                        <div>
                            <label htmlFor="text" className="block text-sm font-semibold text-light mb-2">
                                Tavsiye <span className="text-error">*</span>
                            </label>
                            <textarea
                                id="text"
                                name="text"
                                value={formData.text}
                                onChange={handleInputChange}
                                rows="6"
                                required
                                placeholder="Bu tavsiyeyi neden yapıyorsun? Deneyimlerini paylaş..."
                                className="w-full px-4 py-3 bg-dark border border-border rounded-xl text-light placeholder-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 resize-none"
                            />
                        </div>

                        {/* Fotoğraf Yükleme */}
                        <div>
                            <label className="block text-sm font-semibold text-light mb-2">
                                Fotoğraf Ekle (İsteğe Bağlı)
                            </label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                id="image-upload-input"
                                className="hidden"
                                accept="image/png, image/jpeg, image/jpg, image/webp"
                                onChange={handleFileChange}
                            />
                            {previewUrl ? (
                                <div className="relative w-full h-64 rounded-xl overflow-hidden border border-border">
                                    <Image
                                        src={previewUrl}
                                        alt="Seçilen fotoğrafın önizlemesi"
                                        fill
                                        className="object-cover"
                                        sizes="100vw"
                                        unoptimized
                                    />
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-300"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex justify-center items-center px-6 py-12 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 hover:bg-dark/50 transition-all duration-300"
                                >
                                    <div className="text-center">
                                        <i className="fas fa-camera text-4xl text-muted mb-2"></i>
                                        <p className="text-sm text-muted">Bir fotoğraf sürükle veya seç</p>
                                        <p className="text-xs text-muted mt-1">PNG, JPG, WEBP (Max 5MB)</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mesaj */}
                        {message.text && (
                            <div
                                className={`p-4 rounded-xl text-sm font-medium ${
                                    message.type === 'error'
                                        ? 'bg-error/20 text-error border border-error/30'
                                        : message.type === 'success'
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                        : 'bg-primary/20 text-primary border border-primary/30'
                                }`}
                            >
                                {message.text}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border bg-dark/50">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-3 rounded-xl font-bold text-sm bg-card hover:bg-primary/20 text-muted hover:text-primary border border-border transition-all duration-300 disabled:opacity-50"
                    >
                        İptal
                    </button>
                    <button
                        type="submit"
                        form="add-recommendation-form"
                        disabled={isSubmitting}
                        className="px-6 py-3 rounded-xl font-bold text-sm bg-primary text-light hover:bg-primary-dark transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                Paylaşılıyor...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-paper-plane mr-2"></i>
                                Paylaş
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

