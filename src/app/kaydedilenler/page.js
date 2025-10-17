'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function SavedPage() {
    const router = useRouter();
    const [savedRecommendations, setSavedRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const unsubUser = onSnapshot(userDocRef, async (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        const savedIds = userData.savedRecommendations || [];
                        
                        if (savedIds.length > 0) {
                            const recsQuery = query(collection(db, "recommendations"), where("__name__", "in", savedIds));
                            const recsSnapshot = await getDocs(recsQuery);
                            const recsData = recsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                            setSavedRecommendations(recsData);
                        } else {
                            setSavedRecommendations([]);
                        }
                    }
                    setLoading(false);
                });
                return () => unsubUser();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return <div className="text-center py-10 flex flex-col items-center justify-center h-screen"><div className="loader"></div></div>;
    }

    return (
        <div className="bg-white min-h-screen">
             <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex items-center">
                    <Link href="/profil" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                     <div className="text-center flex-grow">
                         <h1 className="text-lg font-bold text-gray-800">Kaydedilenler</h1>
                     </div>
                     <div className="w-10"></div>
                </div>
            </header>

            <main className="p-1 grid grid-cols-3 gap-1">
                {savedRecommendations.length > 0 ? (
                    savedRecommendations.map(rec => (
                         <Link key={rec.id} href={`/tavsiye/${rec.id}`}>
                            <div className="relative aspect-square bg-gray-100">
                                <img src={rec.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.title || rec.businessName)}&background=10B981&color=FFFFFF&size=200`} 
                                     className="rounded-sm object-cover w-full h-full" 
                                     alt={rec.title} />
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-3 text-center py-20 text-gray-500">
                        <i className="far fa-bookmark text-5xl text-gray-300"></i>
                        <p className="mt-4">Henüz hiç tavsiye kaydetmedin.</p>
                    </div>
                )}
            </main>
        </div>
    );
};