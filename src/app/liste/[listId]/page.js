'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';

export default function ListDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { listId } = params;

    const [listDetails, setListDetails] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [author, setAuthor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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
        if (!listId) return;

        const listDocRef = doc(db, "lists", listId);
        const unsubscribeList = onSnapshot(listDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const listData = { id: docSnap.id, ...docSnap.data() };
                setListDetails(listData);

                const authorDoc = await getDoc(doc(db, "users", listData.userId));
                if (authorDoc.exists()) {
                    setAuthor({uid: authorDoc.id, ...authorDoc.data()});
                }

                if (listData.recommendations && listData.recommendations.length > 0) {
                    const recsQuery = query(collection(db, "recommendations"), where("__name__", "in", listData.recommendations));
                    const recsSnapshot = await getDocs(recsQuery);
                    const recsData = recsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setRecommendations(recsData);
                } else {
                    setRecommendations([]);
                }
            } else {
                console.error("Liste bulunamadı!");
            }
            setLoading(false);
        });

        return () => unsubscribeList();
    }, [listId]);
    
    const handleShare = async () => {
        if (navigator.share && listDetails) {
            try {
                await navigator.share({
                    title: `Tavsiye Çemberi Listesi: ${listDetails.name}`,
                    text: `${author.name} tarafından oluşturulan "${listDetails.name}" listesine bir göz at!`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Paylaşma sırasında hata oluştu:', error);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Listenin linki panoya kopyalandı!');
        }
        setIsMenuOpen(false);
    };
    
    const handleShareAsRecommendation = async () => {
        if (!currentUser || !listDetails || !author) return;

        try {
            await addDoc(collection(db, "recommendations"), {
                userId: currentUser.uid,
                title: `Liste Tavsiyesi: ${listDetails.name}`,
                text: `${author.name} tarafından oluşturulan bu harika listeye göz atın! İçinde ${recommendations.length} tavsiye bulunuyor.`,
                category: "Liste",
                title_lowercase: `liste tavsiyesi: ${listDetails.name}`.toLowerCase(),
                category_lowercase: "liste",
                text_lowercase: `${author.name} tarafından oluşturulan bu harika listeye göz atın! İçinde ${recommendations.length} tavsiye bulunuyor.`.toLowerCase(),
                createdAt: serverTimestamp(),
                likes: [],
                listLink: `/liste/${listId}`
            });
            alert('Liste başarıyla tavsiye olarak paylaşıldı!');
            router.push('/');
        } catch (error) {
            console.error("Liste tavsiye olarak paylaşılırken hata oluştu:", error);
            alert("Bir hata oluştu, liste paylaşılamadı.");
        }
        setIsMenuOpen(false);
    };

    if (loading || !listDetails || !author) {
        return <div className="text-center py-10 flex flex-col items-center justify-center h-screen"><div className="loader"></div></div>;
    }

    const isOwner = currentUser && currentUser.uid === listDetails.userId;

    return (
        <div className="bg-white min-h-screen">
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    <Link href="/listelerim" className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </Link>
                    <h1 className="text-lg font-bold text-gray-800 truncate px-4">{listDetails.name}</h1>
                    <div className="relative">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                            <i className="fas fa-ellipsis-v text-lg"></i>
                        </button>
                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-100">
                                {isOwner && (
                                    <Link href={`/liste/${listId}/duzenle`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        <i className="fas fa-pencil-alt w-6 mr-1"></i> Listeyi Düzenle
                                    </Link>
                                )}
                                <button onClick={handleShare} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i className="fas fa-share-alt w-6 mr-1"></i> Bağlantı Olarak Paylaş
                                </button>
                                <button onClick={handleShareAsRecommendation} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i className="fas fa-rss w-6 mr-1"></i> Tavsiye Olarak Paylaş
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="p-4">
                <div className="text-center">
                    <Image 
                        src={listDetails.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(listDetails.name.substring(0,2))}&background=random&color=fff&size=96`} 
                        className="w-24 h-24 rounded-2xl object-cover mx-auto shadow-lg" 
                        alt={`${listDetails.name} listesi`}
                        width={96}
                        height={96}
                        unoptimized
                    />
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">{listDetails.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">Oluşturan: <Link href={`/profil/${listDetails.userId}`} className="font-semibold text-teal-600">{author.name}</Link></p>
                    <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{listDetails.description}</p>
                </div>
                
                {isOwner && (
                    <div className="mt-6">
                        <Link href={`/yeni-tavsiye?listId=${listId}`} className="w-full block text-center bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-colors">
                            + Bu Listeye Tavsiye Ekle
                        </Link>
                    </div>
                )}

                <div className="mt-6">
                    <h3 className="font-bold text-gray-800 mb-3">Listedeki Tavsiyeler ({recommendations.length})</h3>
                    {recommendations.length > 0 ? (
                        <div className="space-y-3">
                            {recommendations.map(rec => (
                                <Link key={rec.id} href={`/tavsiye/${rec.id}`} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center relative">
                                        <Image src={rec.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.title.substring(0,2))}&background=10B981&color=FFFFFF&size=64`} className="object-cover rounded-lg" alt={`${rec.title} mekanı`} fill sizes="64px" unoptimized/>
                                    </div>
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-gray-800">{rec.title}</h4>
                                        <p className="text-sm text-gray-500">{rec.category}</p>
                                    </div>
                                    <div className="text-amber-500 flex items-center">
                                        <i className="fas fa-star text-sm"></i>
                                        <span className="text-sm font-bold text-gray-700 ml-1">{rec.likes?.length || 0}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 pt-8">Bu listede henüz tavsiye yok.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

