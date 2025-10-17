'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';

// Debounce fonksiyonu bileşenin DIŞINA taşındı.
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export default function SearchPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState({ users: [], recommendations: [] });
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            }
        });
    }, []);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const performSearch = useCallback(
        debounce(async (term) => {
            if (term.length < 2) {
                setResults({ users: [], recommendations: [] });
                setLoading(false);
                return;
            }

            setLoading(true);

            const lowerCaseTerm = term.toLowerCase();
            const endTerm = lowerCaseTerm + '\uf8ff';

            const usersRef = collection(db, "users");
            const recsRef = collection(db, "recommendations");

            const qUsersName = query(usersRef, where("name_lowercase", ">=", lowerCaseTerm), where("name_lowercase", "<=", endTerm));
            const qUsersUsername = query(usersRef, where("username", ">=", lowerCaseTerm), where("username", "<=", endTerm));
            const qRecsTitle = query(recsRef, where("title_lowercase", ">=", lowerCaseTerm), where("title_lowercase", "<=", endTerm));
            const qRecsCategory = query(recsRef, where("category_lowercase", ">=", lowerCaseTerm), where("category_lowercase", "<=", endTerm));
            const qRecsText = query(recsRef, where("text_lowercase", ">=", lowerCaseTerm), where("text_lowercase", "<=", endTerm));

            const [
                usersNameSnap,
                usersUsernameSnap,
                recsTitleSnap,
                recsCategorySnap,
                recsTextSnap
            ] = await Promise.all([
                getDocs(qUsersName),
                getDocs(qUsersUsername),
                getDocs(qRecsTitle),
                getDocs(qRecsCategory),
                getDocs(qRecsText)
            ]);

            const userMap = new Map();
            usersNameSnap.forEach(doc => userMap.set(doc.id, { id: doc.id, ...doc.data() }));
            usersUsernameSnap.forEach(doc => userMap.set(doc.id, { id: doc.id, ...doc.data() }));

            const recMap = new Map();
            recsTitleSnap.forEach(doc => recMap.set(doc.id, { id: doc.id, ...doc.data() }));
            recsCategorySnap.forEach(doc => recMap.set(doc.id, { id: doc.id, ...doc.data() }));
            recsTextSnap.forEach(doc => recMap.set(doc.id, { id: doc.id, ...doc.data() }));

            setResults({
                users: Array.from(userMap.values()),
                recommendations: Array.from(recMap.values())
            });

            setLoading(false);
        }, 400),
        []
    );

    const handleSearchChange = (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        if (term.length >= 2) {
            setLoading(true);
            performSearch(term);
        } else {
            setResults({ users: [], recommendations: [] });
        }
    };

    return (
        <div>
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                <div className="p-4">
                    <div className="relative">
                        <input
                            type="search"
                            id="search-input"
                            placeholder="Kullanıcı veya tavsiye ara..."
                            autoComplete="off"
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500"
                            value={searchTerm}
                            onChange={handleSearchChange}
                        />
                        <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>
            </header>

            <main className="p-4">
                {loading ? (
                    <div className="flex justify-center pt-8">
                        <div className="loader"></div>
                    </div>
                ) : searchTerm.length < 2 ? (
                    <div className="text-center text-gray-500 pt-8">
                        <i className="fas fa-search text-4xl text-gray-300"></i>
                        <p className="mt-4">Keşfetmek için aramaya başla.</p>
                    </div>
                ) : (results.users.length === 0 && results.recommendations.length === 0) ? (
                    <div className="text-center py-10">
                        <i className="fas fa-box-open text-4xl text-gray-300"></i>
                        <h3 className="mt-4 text-lg font-bold text-gray-800">Sonuç Bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500">Aradığın kritere uygun sonuç yok.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {results.users.length > 0 && (
                            <div>
                                <h3 className="text-md font-semibold text-gray-700 mb-2">Kullanıcılar</h3>
                                <div className="space-y-3">
                                    {results.users.map(user => (
                                        <Link
                                            key={user.id}
                                            href={user.id === currentUser?.uid ? '/profil' : `/profil/${user.id}`}
                                            className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md hover:border-teal-500 transition-all"
                                        >
                                            <img
                                                className="w-10 h-10 rounded-full object-cover"
                                                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff&size=40`}
                                                alt={user.name}
                                            />
                                            <div>
                                                <p className="font-semibold text-gray-800">{user.name}</p>
                                                <p className="text-sm text-gray-500">@{user.username}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {results.recommendations.length > 0 && (
                            <div>
                                <h3 className="text-md font-semibold text-gray-700 mb-2 mt-6">Tavsiyeler</h3>
                                <div className="space-y-3">
                                    {results.recommendations.map(rec => (
                                        <Link
                                            key={rec.id}
                                            href={`/tavsiye/${rec.id}`}
                                            className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-teal-500 transition-all"
                                        >
                                            <h4 className="font-bold text-gray-900">{rec.title}</h4>
                                            <p className="text-sm text-gray-600 truncate">{rec.text}</p>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};