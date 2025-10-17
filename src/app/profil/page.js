'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, orderBy, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { auth, db } from '../../firebaseConfig';
import RecommendationCard from '../../components/RecommendationCard';

export default function ProfilePage() {
    const [currentUserData, setCurrentUserData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('recommendations');
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setCurrentUserData({ uid: user.uid, ...docSnap.data() });
                    }
                    setLoading(false);
                });

                const recsQuery = query(collection(db, "recommendations"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
                const unsubscribeRecs = onSnapshot(recsQuery, (querySnapshot) => {
                    const recsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setRecommendations(recsData);
                });
                
                const listsQuery = query(collection(db, "lists"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
                const unsubscribeLists = onSnapshot(listsQuery, (snapshot) => {
                    const listsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setLists(listsData);
                });

                return () => {
                    unsubscribeUser();
                    unsubscribeRecs();
                    unsubscribeLists();
                };

            } else {
                router.push('/giris');
            }
        });

        return () => unsubscribeAuth();
    }, [router]);
    
    const handleLike = async (postId) => {
        if (!currentUserData) return;
        const postRef = doc(db, "recommendations", postId);
        const postDoc = await getDoc(postRef);
        if (!postDoc.exists()) return;

        const likes = postDoc.data().likes || [];
        if (likes.includes(currentUserData.uid)) {
            await updateDoc(postRef, { likes: arrayRemove(currentUserData.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(currentUserData.uid) });
        }
    };

    const handleSave = async (postId) => {
        // Bu fonksiyon şimdilik RecommendationCard'da kullanılmıyor ama gelecekte kullanılabilir.
    };


    if (loading || !currentUserData) {
        return (
            <div className="text-center py-10 flex flex-col items-center justify-center h-screen">
                <div className="loader"></div>
                <p className="text-gray-500 mt-4">Profil yükleniyor...</p>
            </div>
        );
    }

    return (
        <main className="bg-white">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <div className="w-10"></div>
                    <h1 className="text-xl font-bold text-gray-800">@{currentUserData.username}</h1>
                    <Link href="/ayarlar" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-cog text-lg"></i>
                    </Link>
                </div>
            </header>
            <div className="p-4 md:p-6">
                <div className="flex items-center space-x-4">
                    <Image 
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-gray-100 shadow" 
                        src={currentUserData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserData.name)}&background=random&color=fff`} 
                        alt={currentUserData.name}
                        width={96}
                        height={96}
                        unoptimized // SVG hatası için bu özellik eklendi
                    />
                    <div className="flex-grow flex justify-around text-center">
                        <div className="px-2">
                            <p className="font-bold text-lg md:text-xl text-gray-800">{recommendations.length}</p>
                            <p className="text-xs md:text-sm text-gray-500">Tavsiye</p>
                        </div>
                        <Link href="/takipciler" className="px-2">
                            <p className="font-bold text-lg md:text-xl text-gray-800">{currentUserData.followers?.length || 0}</p>
                            <p className="text-xs md:text-sm text-gray-500">Takipçi</p>
                        </Link>
                        <Link href="/takip-edilenler" className="px-2">
                            <p className="font-bold text-lg md:text-xl text-gray-800">{currentUserData.following?.length || 0}</p>
                            <p className="text-xs md:text-sm text-gray-500">Takip</p>
                        </Link>
                    </div>
                </div>
                 <div className="mt-4">
                    <h2 className="text-base font-bold text-gray-900">{currentUserData.name}</h2>
                    <p className="text-sm text-gray-700 mt-1">{currentUserData.bio}</p>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link href="/ayarlar/profili-duzenle" className="w-full block text-center bg-gray-100 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">Profili Düzenle</Link>
                    <Link href="/kaydedilenler" className="w-full block text-center bg-gray-100 text-gray-800 font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm">Kaydedilenler</Link>
                </div>
            </div>
            
            <div className="border-t border-gray-200">
                <div className="tabs flex justify-around">
                    <button onClick={() => setActiveTab('recommendations')} className={`w-full py-3 text-sm font-semibold border-b-2 ${activeTab === 'recommendations' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>
                        Tavsiyeler
                    </button>
                    <button onClick={() => setActiveTab('lists')} className={`w-full py-3 text-sm font-semibold border-b-2 ${activeTab === 'lists' ? 'text-teal-600 border-teal-600' : 'text-gray-500 border-transparent hover:bg-gray-50'}`}>
                        Listeler
                    </button>
                </div>
            </div>

            <div className="min-h-[40vh]">
                {activeTab === 'recommendations' && (
                    <div className="p-4 space-y-4">
                        {recommendations.length > 0 ? (
                            recommendations.map(rec => (
                                <RecommendationCard 
                                    key={rec.id} 
                                    rec={rec} 
                                    currentUserData={currentUserData} 
                                    onLike={handleLike}
                                    onSave={handleSave}
                                />
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                                Henüz hiç tavsiyen yok.
                            </div>
                        )}
                    </div>
                )}
                
                {activeTab === 'lists' && (
                    <div className="p-4 space-y-3">
                        {lists.length > 0 ? (
                            lists.map(list => (
                                <Link key={list.id} href={`/liste/${list.id}`} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center relative">
                                        {list.imageUrl ? (
                                            <Image src={list.imageUrl} className="object-cover rounded-lg" alt={`${list.name} listesi`} fill sizes="64px"/>
                                        ) : (
                                            <i className="fas fa-list-alt text-2xl text-gray-400"></i>
                                        )}
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-gray-800">{list.name}</h3>
                                        <p className="text-sm text-gray-500">{list.recommendations?.length || 0} tavsiye</p>
                                    </div>
                                    <i className="fas fa-chevron-right text-gray-400"></i>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-500">
                               Henüz hiç listen yok.
                               <Link href="/yeni-liste" className="mt-4 block text-teal-600 font-semibold">İlk Listeni Oluştur</Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
};

