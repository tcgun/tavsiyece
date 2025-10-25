'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Image bileşenini import et
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function SavedPage() {
    const router = useRouter();
    const [savedRecommendations, setSavedRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    // useEffect kısmı aynı kalıyor...
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);
                const userDocRef = doc(db, "users", user.uid);
                const unsubUser = onSnapshot(userDocRef, async (userDocSnap) => {
                    setLoading(true);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        const savedIds = userData.savedRecommendations || [];

                        if (savedIds.length > 0) {
                            const recChunks = [];
                             for (let i = 0; i < savedIds.length; i += 10) {
                                 recChunks.push(savedIds.slice(i, i + 10));
                             }
                            try {
                                 const recPromises = recChunks.map(chunk =>
                                     getDocs(query(collection(db, "recommendations"), where("__name__", "in", chunk)))
                                 );
                                 const recSnapshots = await Promise.all(recPromises);
                                 const recsData = recSnapshots.flatMap(snapshot =>
                                     snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                                 );
                                 const sortedRecs = savedIds.map(id => recsData.find(rec => rec.id === id)).filter(Boolean);
                                 setSavedRecommendations(sortedRecs);

                            } catch (error) {
                                 console.error("Kaydedilen tavsiyeler çekilirken hata:", error);
                                 setSavedRecommendations([]);
                            }
                        } else {
                            setSavedRecommendations([]);
                        }
                    } else {
                         console.warn("Kaydedilenler: Kullanıcı verisi bulunamadı");
                         setSavedRecommendations([]);
                    }
                    setLoading(false);
                }, (error) => {
                     console.error("Kaydedilenler dinlenirken hata:", error);
                     setSavedRecommendations([]);
                     setLoading(false);
                });
                return () => unsubUser();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);


    if (loading) {
        return (
             <div className="bg-white min-h-screen">
                 {/* ... header ... */}
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
                 <div className="text-center py-10 flex flex-col items-center justify-center h-[calc(100vh-64px)]">
                     <div className="loader"></div>
                 </div>
             </div>
         );
    }

    return (
        <div className="bg-white min-h-screen">
             {/* Header */}
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

            {/* Kaydedilen Tavsiye Izgarası */}
            <main className="p-1 grid grid-cols-3 gap-1">
                {savedRecommendations.length > 0 ? (
                    savedRecommendations.map(rec => (
                         <Link key={rec.id} href={`/tavsiye/${rec.id}`} className="block"> {/* className="block" eklendi */}
                            <div className="relative aspect-square bg-gray-100 rounded-sm overflow-hidden">
                                {/* --- DEĞİŞİKLİK: img yerine Image kullanıldı --- */}
                                <Image
                                     src={rec.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.title || '?')}&background=10B981&color=FFFFFF&size=200`}
                                     alt={rec.title || 'Kaydedilen tavsiye'}
                                     fill // Konteynırı doldurur (aspect-square sayesinde boyutlar korunur)
                                     sizes="(max-width: 768px) 33vw, 128px" // Farklı boyutlar için optimizasyon ipuçları
                                     className="object-cover" // Görüntünün nasıl sığacağını belirler
                                     // loading="lazy" // Next.js Image varsayılan olarak lazy loading yapar
                                     unoptimized={rec.imageUrl?.includes('ui-avatars.com')} // ui-avatars için optimizasyonu kapatabiliriz
                                />
                                {/* --- DEĞİŞİKLİK SONU --- */}
                            </div>
                        </Link>
                    ))
                ) : (
                    // Kaydedilen yoksa mesaj
                    <div className="col-span-3 text-center py-20 text-gray-500">
                        <i className="far fa-bookmark text-5xl text-gray-300"></i>
                        <p className="mt-4">Henüz hiç tavsiye kaydetmedin.</p>
                    </div>
                )}
            </main>
        </div>
    );
};