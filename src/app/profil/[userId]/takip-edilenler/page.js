'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../../../firebaseConfig';

export default function FollowingPage() {
    const params = useParams();
    const router = useRouter();
    const { userId } = params;

    const [following, setFollowing] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!userId) return;

        const userDocRef = doc(db, "users", userId);
        const unsubUser = onSnapshot(userDocRef, async (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const followingIds = userData.following || [];
                if (followingIds.length > 0) {
                    const userPromises = followingIds.map(id => getDoc(doc(db, "users", id)));
                    const userDocs = await Promise.all(userPromises);
                    const userList = userDocs.filter(docSnap => docSnap.exists()).map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
                    setFollowing(userList);
                } else {
                    setFollowing([]);
                }
            }
            setLoading(false);
        });
        return () => unsubUser();
    }, [userId]);
    
    if (loading) {
        return <div className="text-center py-10 flex flex-col items-center justify-center h-screen"><div className="loader"></div></div>;
    }

    return (
        <div className="bg-white min-h-screen">
             <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex items-center">
                    <Link href={`/profil/${userId}`} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                     <div className="text-center flex-grow">
                         <h1 className="text-lg font-bold text-gray-800">Takip Edilenler</h1>
                     </div>
                     <div className="w-10"></div>
                </div>
            </header>

            <main className="p-4">
                {following.length > 0 ? (
                    <div className="space-y-3">
                        {following.map(followUser => (
                            <Link key={followUser.id} href={followUser.id === currentUser?.uid ? '/profil' : `/profil/${followUser.id}`} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <img className="w-12 h-12 rounded-full" src={followUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(followUser.name)}&background=random&color=fff`} alt={followUser.name} />
                                    <div>
                                        <p className="font-semibold text-gray-800">{followUser.name}</p>
                                        <p className="text-sm text-gray-500">@{followUser.username}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 pt-8">Bu kullanıcı kimseyi takip etmiyor.</p>
                )}
            </main>
        </div>
    );
};