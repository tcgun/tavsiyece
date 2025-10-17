'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

export default function MyListsPage() {
    const router = useRouter();
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
                const q = query(collection(db, "lists"), where("userId", "==", user.uid));
                const unsubscribeLists = onSnapshot(q, (snapshot) => {
                    const listsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setLists(listsData);
                    setLoading(false);
                });
                return () => unsubscribeLists();
            } else {
                router.push('/giris');
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="bg-white min-h-screen">
                <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                     <div className="p-4 flex justify-between items-center">
                        <Link href="/profil" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                            <i className="fas fa-arrow-left text-lg"></i>
                        </Link>
                        <h1 className="text-lg font-bold text-gray-800">Listelerim</h1>
                        <Link href="/yeni-liste" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                            <i className="fas fa-plus text-lg"></i>
                        </Link>
                    </div>
                </header>
                <div className="text-center py-10"><div className="loader mx-auto"></div></div>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <Link href="/profil" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <h1 className="text-lg font-bold text-gray-800">Listelerim</h1>
                    <Link href="/yeni-liste" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-plus text-lg"></i>
                    </Link>
                </div>
            </header>
            <main className="p-4">
                {lists.length > 0 ? (
                    <div className="space-y-3">
                        {lists.map(list => (
                            <Link key={list.id} href={`/liste/${list.id}`} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                                <img src={list.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(list.name.substring(0,2))}&background=random&color=fff&size=64`} className="w-16 h-16 rounded-lg object-cover" alt={`${list.name} listesi`} />
                                <div className="flex-grow">
                                    <h3 className="font-bold text-gray-800">{list.name}</h3>
                                    <p className="text-sm text-gray-500">{list.recommendations?.length || 0} tavsiye</p>
                                </div>
                                <i className="fas fa-chevron-right text-gray-400"></i>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        <i className="fas fa-list-alt text-5xl text-gray-300"></i>
                        <p className="mt-4">Henüz hiç liste oluşturmadın.</p>
                        <Link href="/yeni-liste" className="mt-4 inline-block bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                            İlk Listeni Oluştur
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
};