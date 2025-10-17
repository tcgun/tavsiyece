'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc, arrayUnion, query, where, onSnapshot } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../firebaseConfig';

// URL'den parametre okuma mantığı bu bileşende olacak
const AddRecommendationForm = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const listIdFromUrl = searchParams.get('listId'); // URL'den listId'yi al

    const [currentUserData, setCurrentUserData] = useState(null);
    const [formData, setFormData] = useState({ title: '', category: '', text: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef(null);
    
    // YENİ STATE'LER
    const [myLists, setMyLists] = useState([]);
    const [selectedList, setSelectedList] = useState(listIdFromUrl || '');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setCurrentUserData({ uid: user.uid, ...userDocSnap.data() });
                }

                // Kullanıcının listelerini çek
                const q = query(collection(db, "lists"), where("userId", "==", user.uid));
                const unsubscribeLists = onSnapshot(q, (snapshot) => {
                    const listsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setMyLists(listsData);
                });
                return () => unsubscribeLists();

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
            setSelectedFile(file);
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

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.category.trim() || !formData.text.trim()) {
            setMessage({ type: 'error', text: 'Lütfen tüm zorunlu alanları doldurun.' });
            return;
        }
        
        setIsSubmitting(true);
        setMessage({ type: 'info', text: 'Tavsiyeniz yükleniyor, lütfen bekleyin...' });

        let imageUrl = null;
        try {
            if (selectedFile) {
                const filePath = `recommendations/${currentUserData.uid}/${Date.now()}-${selectedFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const newRecRef = await addDoc(collection(db, "recommendations"), {
                userId: currentUserData.uid,
                title: formData.title,
                category: formData.category,
                text: formData.text,
                title_lowercase: formData.title.toLowerCase(),
                category_lowercase: formData.category.toLowerCase(),
                text_lowercase: formData.text.toLowerCase(),
                createdAt: serverTimestamp(),
                likes: [],
                ...(imageUrl && { imageUrl })
            });

            // Eğer bir liste seçildiyse, bu tavsiyeyi o listeye ekle
            if (selectedList) {
                const listRef = doc(db, "lists", selectedList);
                await updateDoc(listRef, {
                    recommendations: arrayUnion(newRecRef.id)
                });
                router.push(`/liste/${selectedList}`); // Listeye geri dön
            } else {
                router.push('/'); // Ana sayfaya dön
            }

        } catch (error) {
            console.error("Tavsiye eklenirken hata oluştu: ", error);
            setMessage({ type: 'error', text: 'Bir hata oluştu. Lütfen tekrar deneyin.' });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <button onClick={() => router.back()} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                    <h1 className="text-lg font-bold text-gray-800">Yeni Tavsiye</h1>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="text-teal-600 font-bold hover:bg-teal-50 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                        {isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}
                    </button>
                </div>
            </header>
             <main className="p-4">
                <div className="space-y-4">
                    {currentUserData && (
                        <div className="flex items-center space-x-3">
                            <img src={currentUserData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserData.name)}&background=random&color=fff`} className="w-10 h-10 rounded-full bg-gray-200" alt="Kullanıcı avatarı" />
                            <div>
                                <p className="font-semibold text-gray-800">{currentUserData.name}</p>
                            </div>
                        </div>
                    )}
                    {/* ... Diğer form alanları (başlık, kategori, metin) ... */}
                    <div>
                        <input type="text" name="title" value={formData.title} onChange={handleInputChange} required placeholder="Tavsiyenin Başlığı (Örn: Harika Bir Film)" className="w-full text-lg font-semibold border-0 border-b border-gray-200 focus:ring-0 focus:border-teal-500 placeholder-gray-400 py-2" />
                    </div>
                    <div>
                        <input type="text" name="category" value={formData.category} onChange={handleInputChange} required placeholder="Kategori (Örn: Film, Restoran, Kitap)" className="w-full border-0 border-b border-gray-200 focus:ring-0 focus:border-teal-500 placeholder-gray-400 py-2 text-sm" />
                    </div>
                    <div>
                        <textarea name="text" value={formData.text} onChange={handleInputChange} rows="5" required placeholder="Bu tavsiyeyi neden yapıyorsun? Deneyimlerini paylaş..." className="mt-1 block w-full border-0 focus:ring-0 placeholder-gray-400 sm:text-sm resize-none"></textarea>
                    </div>

                    {/* Fotoğraf Yükleme Alanı */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Fotoğraf Ekle (İsteğe Bağlı)</label>
                        <input type="file" ref={fileInputRef} id="image-upload-input" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
                        {previewUrl ? (
                            <div className="relative w-full h-48">
                                <img src={previewUrl} className="w-full h-full object-cover rounded-md" alt="Seçilen fotoğrafın önizlemesi" />
                                <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/70">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        ) : (
                            <div onClick={() => fileInputRef.current.click()} className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-teal-500">
                                <div className="space-y-1 text-center">
                                    <i className="fas fa-camera text-4xl text-gray-400"></i>
                                    <p className="text-sm text-gray-600">Bir fotoğraf sürükle veya seç</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* YENİ: Listeye Ekleme Alanı */}
                    <div>
                        <label htmlFor="list-selection" className="block text-sm font-medium text-gray-700">Bir Listeye Ekle (İsteğe Bağlı)</label>
                        <select
                            id="list-selection"
                            name="list-selection"
                            value={selectedList}
                            onChange={(e) => setSelectedList(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        >
                            <option value="">-- Bir liste seç --</option>
                            {myLists.map(list => (
                                <option key={list.id} value={list.id}>{list.name}</option>
                            ))}
                        </select>
                    </div>
                    
                     {message.text && (
                        <div className={`text-center text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

// Next.js'in Suspense boundary'si ile sarmalayarak URL parametrelerinin okunmasını sağlıyoruz.
export default function AddRecommendationPage() {
    return (
        <Suspense fallback={<div className="text-center py-10"><div className="loader mx-auto"></div></div>}>
            <AddRecommendationForm />
        </Suspense>
    );
}