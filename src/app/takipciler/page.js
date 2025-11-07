'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function MyFollowersPage() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [followers, setFollowers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const unsubUser = onSnapshot(userDocRef, async (userDocSnap) => {
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        setUser({ ...userData, uid: currentUser.uid });

                        const followerIds = userData.followers || [];
                        if (followerIds.length > 0) {
                            const userPromises = followerIds.map(id => getDoc(doc(db, "users", id)));
                            const userDocs = await Promise.all(userPromises);
                            const userList = userDocs.filter(docSnap => docSnap.exists()).map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
                            setFollowers(userList);
                        } else {
                            setFollowers([]);
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

    if (loading || !user) {
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
                         <h1 className="text-lg font-bold text-gray-800">Takipçiler</h1>
                     </div>
                     <div className="w-10"></div>
                </div>
            </header>

            <main className="p-4">
                {followers.length > 0 ? (
                    <div className="space-y-3">
                        {followers.map(followUser => (
                            <Link key={followUser.id} href={`/profil/${followUser.id}`} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                                <div className="flex items-center space-x-3">
                                    <Image className="w-12 h-12 rounded-full object-cover" src={followUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(followUser.name)}&background=random&color=fff`} alt={followUser.name} width={48} height={48} unoptimized />
                                    <div>
                                        <p className="font-semibold text-gray-800">{followUser.name}</p>
                                        <p className="text-sm text-gray-500">@{followUser.username}</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-500 pt-8">Henüz hiç takipçin yok.</p>
                )}
            </main>
        </div>
    );
};