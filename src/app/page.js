'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import RecommendationCard from '../components/RecommendationCard';
import AddToListModal from '../components/AddToListModal';

export default function HomePage() {
    const [currentUserData, setCurrentUserData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecId, setSelectedRecId] = useState(null);

    // Kullanıcı oturumunu dinle
    useEffect(() => {
        let unsubscribeUser = null;
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/giris');
                setLoading(false);
                setCurrentUserData(null);
                setRecommendations([]);
                return;
            }
            const userDocRef = doc(db, "users", user.uid);
            unsubscribeUser = onSnapshot(userDocRef, (snap) => {
                if (snap.exists()) {
                    setCurrentUserData({ uid: user.uid, ...snap.data() });
                } else {
                    setCurrentUserData({ uid: user.uid, following: [], savedRecommendations: [] });
                    console.warn("Firestore'da kullanıcı verisi bulunamadı:", user.uid);
                }
            }, (error) => {
                console.error("Auth User Snapshot Error:", error);
                setLoading(false);
                setCurrentUserData(null);
                setRecommendations([]);
                router.push('/giris');
            });
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeUser) unsubscribeUser();
        };
    }, [router]);

    // Tavsiye akışını dinle
    useEffect(() => {
        if (!currentUserData) {
            if (!loading && !auth.currentUser) {
                setRecommendations([]);
                setLoading(false);
            }
            return;
        }

        setLoading(true);

        const idsForFeed = [...(currentUserData.following || []), currentUserData.uid];

        if (idsForFeed.length === 0) {
            setLoading(false);
            setRecommendations([]);
            return;
        }

        const chunks = [];
        for (let i = 0; i < idsForFeed.length; i += 10) {
            chunks.push(idsForFeed.slice(i, i + 10));
        }

        const recsMap = new Map();
        let initialLoadsPending = chunks.length;

        const unsubscribers = chunks.map(chunk => {
            const q = query(
                collection(db, "recommendations"),
                where("userId", "in", chunk)
            );

            return onSnapshot(q, (querySnapshot) => {
                let changed = false;
                querySnapshot.docs.forEach(doc => {
                    const recData = { id: doc.id, ...doc.data() };
                    if (!recsMap.has(doc.id) || JSON.stringify(recsMap.get(doc.id)) !== JSON.stringify(recData)) {
                        recsMap.set(doc.id, recData);
                        changed = true;
                    }
                });

                if (changed || initialLoadsPending > 0) {
                    const allRecs = Array.from(recsMap.values());
                    const sortedRecs = allRecs.sort((a, b) => {
                        const timeA = a.createdAt?.seconds || 0;
                        const timeB = b.createdAt?.seconds || 0;
                        return timeB - timeA;
                    });
                    setRecommendations(sortedRecs);
                }

                if (initialLoadsPending > 0) {
                    initialLoadsPending--;
                }

                if (initialLoadsPending === 0) {
                    setLoading(false);
                }
            }, (error) => {
                console.error("Recommendations Snapshot Error:", error);
                if (initialLoadsPending > 0) {
                    initialLoadsPending--;
                }
                if (initialLoadsPending === 0) {
                    setLoading(false);
                }
            });
        });

        return () => unsubscribers.forEach(unsubscribe => unsubscribe());

    }, [currentUserData, loading]);

    // Beğenme fonksiyonu
    const handleLike = async (postId) => {
        if (!currentUserData) return;
        const postRef = doc(db, "recommendations", postId);
        try {
            const postDoc = await getDoc(postRef);
            if (!postDoc.exists()) {
                console.warn("Beğenilecek tavsiye bulunamadı:", postId);
                return;
            }

            const postData = postDoc.data();
            const likes = postData.likes || [];

            if (likes.includes(currentUserData.uid)) {
                await updateDoc(postRef, { likes: arrayRemove(currentUserData.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(currentUserData.uid) });
                if (postData.userId !== currentUserData.uid) {
                    console.log("Başkasına ait tavsiye beğenildi, bildirim gönderilebilir.");
                }
            }
        } catch (error) {
            console.error("Beğenme işlemi sırasında hata:", error);
        }
    };

    const handleSave = (postId) => {
        if (!currentUserData) return;
        setSelectedRecId(postId);
        setIsModalOpen(true);
    };

    const handleDeleteRecommendation = async (postId) => {
        if (!currentUserData) return;

        const recommendationToDelete = recommendations.find(rec => rec.id === postId);
        if (!recommendationToDelete || recommendationToDelete.userId !== currentUserData.uid) {
            console.error("Silme yetkiniz yok veya tavsiye bulunamadı.");
            alert("Bu tavsiyeyi silme yetkiniz yok.");
            return;
        }

        if (window.confirm("Bu tavsiyeyi silmek istediğinizden emin misiniz?")) {
            try {
                const postRef = doc(db, "recommendations", postId);
                await deleteDoc(postRef);
                console.log("Tavsiye başarıyla silindi (HomePage):", postId);
            } catch (error) {
                console.error("Tavsiye silinirken hata (HomePage):", error);
                alert("Tavsiye silinirken bir hata oluştu.");
            }
        }
    };

    return (
        <main>
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800">Tavsiye Çemberi</h1>
                    <Link href="/yeni-tavsiye" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-plus text-lg"></i>
                    </Link>
                </div>
            </header>

            {loading ? (
                <div className="p-4 space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 shadow-lg border border-gray-50 animate-pulse">
                            <div className="flex items-center space-x-3">
                                <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-2/4"></div>
                                    <div className="h-2 bg-gray-200 rounded w-1/4"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : recommendations.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center" style={{height: 'calc(100vh - 140px)'}}>
                    <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-users text-4xl text-teal-500"></i>
                    </div>
                    <h2 className="mt-6 text-xl font-bold text-gray-800">Tavsiye Çemberin Henüz Boş</h2>
                    <p className="mt-2 text-sm text-gray-600 max-w-xs">
                        Arkadaşlarını takip etmeye başlayarak veya ilk tavsiyeni ekleyerek akışını doldur!
                    </p>
                    <Link href="/arama" className="mt-6 block w-full max-w-xs bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                        <i className="fas fa-user-plus mr-2"></i> Takip Edecek Kişiler Bul
                    </Link>
                    <Link href="/yeni-tavsiye" className="mt-4 block w-full max-w-xs bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                        <i className="fas fa-plus mr-2"></i> İlk Tavsiyeni Ekle
                    </Link>
                </div>
            ) : (
                <div className="p-4 space-y-4 pb-20">
                    {recommendations.map(rec => (
                        <RecommendationCard
                            key={rec.id}
                            rec={rec}
                            currentUserData={currentUserData}
                            onLike={handleLike}
                            onSave={handleSave}
                            onDelete={handleDeleteRecommendation}
                        />
                    ))}
                </div>
            )}

            {isModalOpen && currentUserData && (
                <AddToListModal
                    recommendationId={selectedRecId}
                    userId={currentUserData.uid}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </main>
    );
}
