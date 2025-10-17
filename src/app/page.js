'use client'; 

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, getDoc, orderBy } from "firebase/firestore";
import { auth, db } from '../firebaseConfig';
import RecommendationCard from '../components/RecommendationCard';
import AddToListModal from '../components/AddToListModal'; // Modal bileşenini import ediyoruz

export default function HomePage() {
    const [currentUserData, setCurrentUserData] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    // Modal'ı yönetmek için yeni state'ler
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRecId, setSelectedRecId] = useState(null);
    
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const userDocRef = doc(db, "users", user.uid);
                const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        setCurrentUserData({ uid: user.uid, ...userDocSnap.data() });
                    } else {
                        setCurrentUserData({ uid: user.uid, following: [], savedRecommendations: [] });
                    }
                });
                return () => unsubscribeUser();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!currentUserData) return;

        const idsForFeed = [...(currentUserData.following || []), currentUserData.uid];
        
        if (idsForFeed.length === 0) {
            setLoading(false);
            setRecommendations([]);
            return;
        }

        const q = query(collection(db, "recommendations"), where("userId", "in", idsForFeed), orderBy("createdAt", "desc"));

        const unsubscribeRecs = onSnapshot(q, (querySnapshot) => {
            const recsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecommendations(recsData);
            setLoading(false);
        }, (error) => {
            console.error("Tavsiyeleri dinlerken hata:", error);
            setLoading(false);
        });

        return () => unsubscribeRecs();

    }, [currentUserData]);

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

    // DÜZELTME BURADA: handleSave fonksiyonu artık modal'ı açıyor
    const handleSave = (postId) => {
        setSelectedRecId(postId);
        setIsModalOpen(true);
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
                    <p className="mt-2 text-sm text-gray-600 max-w-xs">Arkadaşlarını takip etmeye başlayarak veya ilk tavsiyeni ekleyerek akışını doldur!</p>
                    <Link href="/arama" className="mt-6 block w-full max-w-xs bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                        <i className="fas fa-user-plus mr-2"></i> Takip Edecek Kişiler Bul
                    </Link>
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {recommendations.map(rec => (
                        <RecommendationCard 
                            key={rec.id} 
                            rec={rec} 
                            currentUserData={currentUserData} 
                            onLike={handleLike}
                            onSave={handleSave} // onSave artık modal'ı tetikliyor
                        />
                    ))}
                </div>
            )}
            
            {/* Modal'ı burada koşullu olarak render ediyoruz */}
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