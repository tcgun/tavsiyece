'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'; // Next.js Image bileşenini import ediyoruz
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, orderBy } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

export default function OtherProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { userId } = params;
    
    const [profileUser, setProfileUser] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.uid === userId) {
                    router.push('/profil');
                    return;
                }
                const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()){
                        setCurrentUserData({ uid: user.uid, ...docSnap.data() });
                    }
                });
                return () => unsubUser();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribeAuth();
    }, [userId, router]);

    useEffect(() => {
        if (!userId) return;

        const unsubProfile = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                setProfileUser({ uid: docSnap.id, ...docSnap.data() });
            } else {
                console.error("Kullanıcı bulunamadı!");
            }
            setLoading(false);
        });

        const q = query(collection(db, "recommendations"), where("userId", "==", userId), orderBy("createdAt", "desc"));
        const unsubRecs = onSnapshot(q, (querySnapshot) => {
            const recsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecommendations(recsData);
        });

        return () => {
            unsubProfile();
            unsubRecs();
        };
    }, [userId]);

    const handleFollow = async () => {
        // ... (takip etme mantığı aynı) ...
    };

    if (loading || !profileUser) {
        // ... (yükleme animasyonu aynı) ...
    }
    
    const isFollowing = currentUserData?.following?.includes(profileUser.uid);

    return (
        <div className="bg-white min-h-screen">
             <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <button onClick={() => router.back()} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">@{profileUser.username}</h1>
                    <div className="w-10"></div>
                </div>
            </header>
             <main className="p-4 md:p-6">
                <div className="flex items-center space-x-4">
                    <Image 
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-gray-100 shadow" 
                        src={profileUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name)}&background=random&color=fff`} 
                        alt={profileUser.name}
                        width={96}
                        height={96}
                    />
                    <div className="flex-grow flex justify-around text-center">
                        {/* ... (istatistikler aynı) ... */}
                    </div>
                </div>
                 <div className="mt-4">
                    {/* ... (kullanıcı bilgileri aynı) ... */}
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                    {/* ... (butonlar aynı) ... */}
                </div>
            </main>
            
            <div className="border-t border-gray-200">
                {/* ... (sekmeler aynı) ... */}
            </div>

            <div className="p-1 grid grid-cols-3 gap-1">
                {recommendations.map(rec => (
                     <Link key={rec.id} href={`/tavsiye/${rec.id}`}>
                        <div className="relative aspect-square bg-gray-100 rounded-sm">
                            {rec.imageUrl ? (
                                <Image 
                                    src={rec.imageUrl} 
                                    className="object-cover" 
                                    alt={rec.title || ''} 
                                    fill 
                                    sizes="(max-width: 768px) 33vw, 128px"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full">
                                    <i className="fas fa-image text-3xl text-gray-300"></i>
                                </div>
                            )}
                        </div>
                    </Link>
                ))}
                {/* ... (boş tavsiye durumu aynı) ... */}
            </div>
        </div>
    );
};