'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, orderBy, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { createNotification } from '../../../firebase/utils';

export default function OtherProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { userId } = params;

    const [profileUser, setProfileUser] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);

    // Giriş yapmış kullanıcıyı ve takip durumunu dinle
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.uid === userId) {
                    router.push('/profil');
                    return;
                }
                const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()){
                        const userData = { uid: user.uid, ...docSnap.data() };
                        setCurrentUserData(userData);
                        setIsFollowing(userData.following?.includes(userId) || false);
                    } else {
                        setCurrentUserData({ uid: user.uid });
                        setIsFollowing(false);
                        console.warn("Giriş yapmış kullanıcının Firestore verisi bulunamadı:", user.uid);
                    }
                }, (error) => {
                    console.error("Mevcut kullanıcı verisi dinlenirken hata:", error);
                    setCurrentUserData(null);
                    setIsFollowing(false);
                });
                return () => unsubUser();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribeAuth();
    }, [userId, router]);

    // Profil ve tavsiyeleri dinle
    useEffect(() => {
        if (!userId) return;

        setLoading(true);

        const unsubProfile = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                setProfileUser({ uid: docSnap.id, ...docSnap.data() });
            } else {
                console.error("Profil kullanıcısı bulunamadı:", userId);
                setProfileUser(null);
                router.push('/');
            }
        }, (error) => {
            console.error("Profil kullanıcısı dinlenirken hata:", error);
            setLoading(false);
            setProfileUser(null);
        });

        const recsQuery = query(
            collection(db, "recommendations"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );

        const unsubRecs = onSnapshot(recsQuery, (querySnapshot) => {
            const recsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRecommendations(recsData);
            setLoading(false);
        }, (error) => {
            console.error("Profil tavsiyeleri dinlenirken hata:", error);
            setLoading(false);
        });

        return () => {
            unsubProfile();
            unsubRecs();
        };
    }, [userId, router]);

    // Takip Et / Takibi Bırak
    const handleFollowToggle = async () => {
        if (!currentUserData || !profileUser || followLoading) return;

        setFollowLoading(true);

        const currentUserRef = doc(db, "users", currentUserData.uid);
        const profileUserRef = doc(db, "users", profileUser.uid);
        const batch = writeBatch(db);

        try {
            if (isFollowing) {
                batch.update(currentUserRef, { following: arrayRemove(profileUser.uid) });
                batch.update(profileUserRef, { followers: arrayRemove(currentUserData.uid) });
            } else {
                batch.update(currentUserRef, { following: arrayUnion(profileUser.uid) });
                batch.update(profileUserRef, { followers: arrayUnion(currentUserData.uid) });

                // Bildirim gönderme
                await createNotification({
                    recipientId: profileUser.uid,
                    senderId: currentUserData.uid,
                    senderName: currentUserData.name || 'Bilinmeyen Kullanıcı',
                    senderPhotoURL: currentUserData.photoURL || null,
                    message: `<strong>${currentUserData.name || 'Biri'}</strong> seni takip etmeye başladı.`,
                    link: `/profil/${currentUserData.uid}`,
                    type: 'yeniTakipciler'
                });
            }

            await batch.commit();
        } catch (error) {
            console.error("Takip işlemi sırasında hata:", error);
            alert("Takip işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.");
        } finally {
            setFollowLoading(false);
        }
    };

    if (loading || !profileUser) {
        return (
            <div className="text-center py-10 flex flex-col items-center justify-center h-screen">
                <div className="loader"></div>
                <p className="text-gray-500 mt-4">Profil yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen pb-20">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4 flex justify-between items-center">
                    <button onClick={() => router.back()} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 truncate px-2">@{profileUser.username}</h1>
                    <div className="w-10"></div>
                </div>
            </header>

            <main className="p-4 md:p-6">
                <div className="flex items-center space-x-4">
                    <Image
                        className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-gray-100 shadow flex-shrink-0"
                        src={profileUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileUser.name || '?')}&background=random&color=fff`}
                        alt={`${profileUser.name || 'Kullanıcı'} profil fotoğrafı`}
                        width={96}
                        height={96}
                        unoptimized
                    />
                    <div className="flex-grow flex justify-around text-center">
                        <div className="px-2">
                            <p className="font-bold text-lg md:text-xl text-gray-800">{recommendations.length}</p>
                            <p className="text-xs md:text-sm text-gray-500">Tavsiye</p>
                        </div>
                        <Link href={`/profil/${userId}/takipciler`} className="px-2">
                            <p className="font-bold text-lg md:text-xl text-gray-800">{profileUser.followers?.length || 0}</p>
                            <p className="text-xs md:text-sm text-gray-500">Takipçi</p>
                        </Link>
                        <Link href={`/profil/${userId}/takip-edilenler`} className="px-2">
                            <p className="font-bold text-lg md:text-xl text-gray-800">{profileUser.following?.length || 0}</p>
                            <p className="text-xs md:text-sm text-gray-500">Takip</p>
                        </Link>
                    </div>
                </div>

                <div className="mt-4">
                    <h2 className="text-base font-bold text-gray-900">{profileUser.name}</h2>
                    <p className="text-sm text-gray-700 mt-1">{profileUser.bio}</p>
                </div>

                {currentUserData && currentUserData.uid !== userId && (
                    <div className="mt-4">
                        <button
                            onClick={handleFollowToggle}
                            disabled={followLoading}
                            className={`w-full font-bold py-2 px-4 rounded-lg transition-colors text-sm ${
                                isFollowing
                                    ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                            } ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {followLoading ? 'İşleniyor...' : (isFollowing ? 'Takibi Bırak' : 'Takip Et')}
                        </button>
                    </div>
                )}
            </main>

            <div className="border-t border-gray-200">
                <div className="tabs flex justify-around">
                    <button className="w-full py-3 text-sm font-semibold text-teal-600 border-b-2 border-teal-600">
                        Tavsiyeler
                    </button>
                </div>
            </div>

            <div className="p-1 grid grid-cols-3 gap-1 min-h-[40vh]">
                {recommendations.length > 0 ? (
                    recommendations.map(rec => (
                        <Link key={rec.id} href={`/tavsiye/${rec.id}`}>
                            <div className="relative aspect-square bg-gray-100 rounded-sm overflow-hidden">
                                {rec.imageUrl ? (
                                    <Image
                                        src={rec.imageUrl}
                                        className="object-cover"
                                        alt={rec.title || 'Tavsiye görseli'}
                                        fill
                                        sizes="(max-width: 768px) 33vw, 128px"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center w-full h-full">
                                        <i className="fas fa-camera text-3xl text-gray-300"></i>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-3 text-center py-10 text-gray-500">
                        Bu kullanıcının henüz hiç tavsiyesi yok.
                    </div>
                )}
            </div>
        </div>
    );
}
