'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { auth, db } from '../../../../firebaseConfig';

export default function EditListPage() {
    const params = useParams();
    const router = useRouter();
    const { listId } = params;

    const [listDetails, setListDetails] = useState(null);
    const [allMyRecommendations, setAllMyRecommendations] = useState([]);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);

                const listDocRef = doc(db, "lists", listId);
                const unsubList = onSnapshot(listDocRef, (listDocSnap) => {
                    if (listDocSnap.exists() && listDocSnap.data().userId === user.uid) {
                        const listData = listDocSnap.data();
                        setListDetails({ id: listDocSnap.id, ...listData });
                        setFormData({
                            name: listData.name,
                            description: listData.description
                        });
                        setLoading(false);
                    } else {
                        router.push('/');
                    }
                });

                // DÜZELTME: Kategorisi "Liste" OLMAYAN tavsiyeleri getir.
                const recsQuery = query(
                    collection(db, "recommendations"), 
                    where("userId", "==", user.uid),
                    where("category", "!=", "Liste"),
                    orderBy("category"),
                    orderBy("createdAt", "desc")
                );
                const unsubRecs = onSnapshot(recsQuery, (snapshot) => {
                    const recsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setAllMyRecommendations(recsData);
                });

                return () => {
                    unsubList();
                    unsubRecs();
                };

            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribe();
    }, [listId, router]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveDetails = async () => {
        setIsSubmitting(true);
        setMessage('');
        try {
            const listDocRef = doc(db, "lists", listId);
            await updateDoc(listDocRef, {
                name: formData.name,
                description: formData.description
            });
            setMessage('Liste bilgileri güncellendi!');
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error("Liste güncellenirken hata:", error);
            setMessage('Bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleRecommendation = async (recId, isInList) => {
        const listRef = doc(db, "lists", listId);
        if (isInList) {
            await updateDoc(listRef, { recommendations: arrayRemove(recId) });
        } else {
            await updateDoc(listRef, { recommendations: arrayUnion(recId) });
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Bu listeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            try {
                await deleteDoc(doc(db, "lists", listId));
                router.push('/listelerim');
            } catch (error) {
                console.error("Liste silinirken hata:", error);
                setMessage('Liste silinirken bir hata oluştu.');
            }
        }
    };

    if (loading || !listDetails) {
        return <div className="text-center py-10"><div className="loader mx-auto"></div></div>;
    }

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex justify-between items-center">
                    <Link href={`/liste/${listId}`} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <h1 className="text-lg font-bold text-gray-800">Listeyi Düzenle</h1>
                    <button onClick={handleSaveDetails} disabled={isSubmitting} className="text-teal-600 font-bold hover:bg-teal-50 px-3 py-1 rounded-lg disabled:opacity-50">
                        {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                </div>
            </header>
            <main className="p-6 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Liste Adı</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"/>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Açıklama</label>
                        <textarea id="description" name="description" rows="3" value={formData.description} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"></textarea>
                    </div>
                    {message && <div className="text-center text-sm font-medium text-green-600">{message}</div>}
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Tavsiyeleri Yönet</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {allMyRecommendations.map(rec => {
                            const isInList = listDetails.recommendations?.includes(rec.id);
                            const title = rec.title || 'Başlıksız';
                            return (
                                <div key={rec.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center space-x-3">
                                        <img src={rec.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(title.substring(0,2))}&background=random&color=fff&size=48`} className="w-12 h-12 rounded-md object-cover" alt={title}/>
                                        <div>
                                            <p className="font-semibold text-gray-800">{title}</p>
                                            <p className="text-xs text-gray-500">{rec.category}</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isInList}
                                        onChange={() => handleToggleRecommendation(rec.id, isInList)}
                                        className="h-6 w-6 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <button onClick={handleDelete} className="w-full text-left text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                       <i className="fas fa-trash-alt w-5 mr-2"></i> Listeyi Sil
                    </button>
                </div>
            </main>
        </div>
    );
};