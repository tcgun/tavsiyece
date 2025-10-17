'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link'; // HATA BURADAYDI: Bu satır eklendi
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const AddToListModal = ({ recommendationId, userId, onClose }) => {
    const [myLists, setMyLists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const q = query(collection(db, "lists"), where("userId", "==", userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const listsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    // Bu tavsiyenin bu listede olup olmadığını kontrol et
                    hasRecommendation: data.recommendations?.includes(recommendationId)
                };
            });
            setMyLists(listsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId, recommendationId]);

    const handleToggleToList = async (listId, hasRecommendation) => {
        const listRef = doc(db, "lists", listId);
        if (hasRecommendation) {
            await updateDoc(listRef, { recommendations: arrayRemove(recommendationId) });
        } else {
            await updateDoc(listRef, { recommendations: arrayUnion(recommendationId) });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl max-w-sm w-full max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800">Listeye Kaydet</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <i className="fas fa-times w-4 h-4"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="text-center p-8">Yükleniyor...</div>
                    ) : myLists.length > 0 ? (
                        myLists.map(list => (
                            <div key={list.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                                <span className="font-semibold text-gray-700">{list.name}</span>
                                <input 
                                    type="checkbox" 
                                    checked={list.hasRecommendation}
                                    onChange={() => handleToggleToList(list.id, list.hasRecommendation)}
                                    className="h-6 w-6 rounded text-teal-600 focus:ring-teal-500 border-gray-300"
                                />
                            </div>
                        ))
                    ) : (
                        <div className="text-center p-8 text-gray-500">
                            <p>Henüz hiç liste oluşturmadın.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t">
                    <Link href="/yeni-liste" className="w-full text-center bg-teal-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                        Yeni Liste Oluştur
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AddToListModal;