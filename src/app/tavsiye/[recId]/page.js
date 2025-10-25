'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig';
import { createNotification } from '../../../firebase/utils';

export default function RecommendationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { recId } = params;

    const [recommendation, setRecommendation] = useState(null);
    const [author, setAuthor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Auth state'i dinle
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const unsubUser = onSnapshot(doc(db, "users", user.uid), userSnap => {
                    if (userSnap.exists()) {
                        setCurrentUserData({ uid: user.uid, ...userSnap.data() });
                    } else {
                        setCurrentUserData({ uid: user.uid });
                        console.warn("Kullanıcı DB'de yok (Detay):", user.uid);
                    }
                    setAuthChecked(true);
                }, (error) => {
                    console.error("Auth User Snapshot Error (Detay):", error);
                    setCurrentUserData(null);
                    setAuthChecked(true);
                });
                return () => unsubUser();
            } else {
                setCurrentUserData(null);
                setAuthChecked(true);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // Tavsiye verisini dinle
    useEffect(() => {
        if (!recId) {
            setLoading(false);
            console.error("recId bulunamadı.");
            router.push('/');
            return;
        }

        setLoading(true);
        const recRef = doc(db, "recommendations", recId);
        const unsubRec = onSnapshot(recRef, async (docSnap) => {
            if (docSnap.exists()) {
                const recData = { id: docSnap.id, ...docSnap.data() };
                setRecommendation(recData);
                try {
                    const authorDoc = await getDoc(doc(db, "users", recData.userId));
                    if (authorDoc.exists()) {
                        setAuthor({ uid: authorDoc.id, ...authorDoc.data() });
                    } else {
                        console.warn("Tavsiye yazarı bulunamadı (Detay):", recData.userId);
                        setAuthor(null);
                    }
                } catch (error) {
                    console.error("Yazar bilgisi alınırken hata (Detay):", error);
                    setAuthor(null);
                }
                setLoading(false);
            } else {
                console.error("Tavsiye bulunamadı (Detay):", recId);
                setLoading(false);
                router.push('/');
            }
        }, (error) => {
            console.error("Tavsiye dinlenirken hata (Detay):", error);
            setLoading(false);
            alert("Tavsiye yüklenirken bir hata oluştu.");
            router.push('/');
        });

        return () => {
            unsubRec();
        };
    }, [recId, router]);

    // Beğenme fonksiyonu
    const handleLikeRec = async () => {
        if (!currentUserData || !recommendation) {
            router.push('/giris');
            return;
        }
        const postRef = doc(db, "recommendations", recId);
        const likes = recommendation.likes || [];
        try {
            if (likes.includes(currentUserData.uid)) {
                await updateDoc(postRef, { likes: arrayRemove(currentUserData.uid) });
            } else {
                await updateDoc(postRef, { likes: arrayUnion(currentUserData.uid) });

                if (recommendation.userId !== currentUserData.uid) {
                    await createNotification({
                        recipientId: recommendation.userId,
                        senderId: currentUserData.uid,
                        senderName: currentUserData.name || 'Bilinmeyen Kullanıcı',
                        senderPhotoURL: currentUserData.photoURL || null,
                        message: `<strong>${currentUserData.name || 'Biri'}</strong> tavsiyeni beğendi.`,
                        link: `/tavsiye/${recId}`,
                        imageUrl: recommendation.imageUrl,
                        type: 'begeniler'
                    });
                }
            }
        } catch (error) {
            console.error("Tavsiye beğenilirken hata (Detay):", error);
        }
    };

    // Kaydetme fonksiyonu
    const handleSaveRec = async () => {
        if (!currentUserData) {
            router.push('/giris');
            return;
        }
        const userRef = doc(db, "users", currentUserData.uid);
        const saved = currentUserData.savedRecommendations || [];
        try {
            if (saved.includes(recId)) {
                await updateDoc(userRef, { savedRecommendations: arrayRemove(recId) });
            } else {
                await updateDoc(userRef, { savedRecommendations: arrayUnion(recId) });
            }
        } catch (error) {
            console.error("Kaydetme işlemi sırasında hata (Detay):", error);
        }
    };

    // Tavsiye silme fonksiyonu
    const handleDeleteRecommendation = async () => {
        if (!currentUserData || !recommendation || recommendation.userId !== currentUserData.uid || isDeleting) {
            alert("Silme işlemi yapılamıyor veya yetkiniz yok.");
            return;
        }

        if (window.confirm("Bu tavsiyeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
            setIsDeleting(true);
            try {
                const postRef = doc(db, "recommendations", recId);
                await deleteDoc(postRef);
                console.log("Tavsiye başarıyla silindi (Detay):", recId);
                router.push('/');
            } catch (error) {
                console.error("Tavsiye silinirken hata (Detay):", error);
                alert("Tavsiye silinirken bir hata oluştu. Lütfen tekrar deneyin.");
                setIsDeleting(false);
            }
        }
    };

    if (loading || !recommendation) {
        return (
            <div className="text-center py-10 flex flex-col items-center justify-center h-screen">
                <div className="loader"></div>
                <p className="mt-4 text-gray-500">Yükleniyor...</p>
            </div>
        );
    }

    const displayAuthor = author || { name: 'Bilinmeyen Yazar', photoURL: null, uid: recommendation.userId };
    const isOwner = currentUserData && currentUserData.uid === recommendation.userId;
    const isSaved = currentUserData && currentUserData.savedRecommendations?.includes(recId);
    const postDate = recommendation.createdAt?.seconds
        ? new Date(recommendation.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
        : '';
    const isLiked = currentUserData && recommendation.likes?.includes(currentUserData.uid);

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex items-center">
                    <button onClick={() => router.back()} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <div className="text-center flex-grow">
                        <h1 className="text-lg font-bold text-gray-800">Tavsiye</h1>
                    </div>
                    <div className="w-10">
                        {isOwner && (
                            <button
                                onClick={handleDeleteRecommendation}
                                disabled={isDeleting}
                                className="text-gray-500 hover:text-red-500 disabled:opacity-50 w-10 h-10 flex items-center justify-center rounded-full"
                                aria-label="Tavsiyeyi Sil"
                            >
                                {isDeleting ? <div className="spinner-sm border-gray-500"></div> : <i className="fas fa-trash-alt text-lg"></i>}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="pb-4">
                {recommendation.imageUrl &&
                    <div className="relative w-full h-64">
                        <Image
                            src={recommendation.imageUrl}
                            alt={recommendation.title || 'Tavsiye Görseli'}
                            className="object-cover"
                            fill
                            sizes="(max-width: 640px) 100vw, 640px"
                            priority
                        />
                    </div>
                }

                <div className="p-5">
                    <div className="flex items-center space-x-3 mb-4">
                        <Link href={isOwner ? '/profil' : `/profil/${displayAuthor.uid}`}>
                            <Image
                                src={displayAuthor.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayAuthor.name || '?')}`}
                                className="w-12 h-12 rounded-full object-cover"
                                alt={`${displayAuthor.name || 'Yazar'} profil fotoğrafı`}
                                width={48}
                                height={48}
                                unoptimized
                            />
                        </Link>
                        <div>
                            <Link href={isOwner ? '/profil' : `/profil/${displayAuthor.uid}`} className="font-bold text-gray-800 hover:underline">{displayAuthor.name}</Link>
                            <p className="text-xs text-gray-500">{postDate}</p>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900">{recommendation.title}</h2>
                    <p className="text-sm text-gray-500 mb-2">{recommendation.category}</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{recommendation.text}</p>

                    {recommendation.listLink && (
                        <div className="mt-4">
                            <Link href={recommendation.listLink} className="text-sm font-semibold text-teal-600 hover:underline">
                                İlgili Listeyi Görüntüle →
                            </Link>
                        </div>
                    )}
                </div>

                <div className="px-3 py-2 border-t border-b border-gray-100 flex justify-around items-center text-gray-600">
                    <button onClick={handleLikeRec} disabled={!currentUserData} className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'} disabled:opacity-50`}>
                        <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-xl`}></i>
                        <span className="text-sm font-semibold">{recommendation.likes?.length || 0} Beğeni</span>
                    </button>

                    <button onClick={handleSaveRec} disabled={!currentUserData} className={`flex items-center gap-2 transition-colors p-2 rounded-lg ${isSaved ? 'text-yellow-500' : 'hover:text-yellow-500'} disabled:opacity-50`}>
                        <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-xl`}></i>
                        <span className="text-sm font-semibold">{isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
                    </button>
                </div>
            </main>
        </div>
    );
}
