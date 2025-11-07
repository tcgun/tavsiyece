'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../firebaseConfig';

export default function NewListPage() {
    const router = useRouter();
    const [listName, setListName] = useState('');
    const [description, setDescription] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

     useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribe();
    }, [router]);
    
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
        fileInputRef.current.value = '';
    };

    const handleCreate = async () => {
        if (!listName.trim() || !currentUser) {
            setMessage("Liste adı boş bırakılamaz.");
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        let imageUrl = null;
        try {
            // Önce fotoğrafı yükle
            if (selectedFile) {
                const filePath = `lists/${currentUser.uid}/${Date.now()}-${selectedFile.name}`;
                const storageRef = ref(storage, filePath);
                const snapshot = await uploadBytes(storageRef, selectedFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            // Sonra listeyi veritabanına kaydet
            await addDoc(collection(db, "lists"), {
                userId: currentUser.uid,
                name: listName,
                description: description,
                createdAt: serverTimestamp(),
                recommendations: [],
                ...(imageUrl && { imageUrl }) // Sadece imageUrl varsa ekle
            });
            router.push('/listelerim');
        } catch (error) {
            console.error("Liste oluşturulurken hata:", error);
            setMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex justify-between items-center">
                    <Link href="/listelerim" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <h1 className="text-lg font-bold text-gray-800">Yeni Liste Oluştur</h1>
                    <button onClick={handleCreate} disabled={isSubmitting} className="text-teal-600 font-bold hover:bg-teal-50 px-3 py-1 rounded-lg disabled:opacity-50">
                        {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                </div>
            </header>
            <main className="p-6 space-y-6">
                <div className="flex flex-col items-center space-y-3">
                    {previewUrl ? (
                         <div className="relative w-24 h-24">
                            <Image src={previewUrl} className="w-24 h-24 rounded-2xl object-cover" alt="Liste önizlemesi" width={96} height={96} unoptimized />
                             <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                                <i className="fas fa-times text-xs"></i>
                            </button>
                        </div>
                    ) : (
                        <div onClick={() => fileInputRef.current.click()} className="w-24 h-24 rounded-2xl bg-gray-200 flex items-center justify-center cursor-pointer">
                            <i className="fas fa-camera text-3xl text-gray-400"></i>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                    <button onClick={() => fileInputRef.current.click()} className="text-sm font-semibold text-teal-600 hover:text-teal-700">Liste Fotoğrafı Ekle</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="list-name" className="block text-sm font-medium text-gray-700">Liste Adı</label>
                        <input 
                            type="text" 
                            name="list-name" 
                            id="list-name" 
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                            placeholder="Örn: İstanbul'daki En İyi Kahveciler" 
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="list-description" className="block text-sm font-medium text-gray-700">Açıklama (İsteğe bağlı)</label>
                        <textarea 
                            id="list-description" 
                            name="list-description" 
                            rows="3" 
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Bu liste ne hakkında?" 
                            className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                        ></textarea>
                    </div>
                     {message && <div className={`text-center text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</div>}
                </div>
            </main>
        </div>
    );
};