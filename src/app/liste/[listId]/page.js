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
    const [recommendations, setRecommendations] = useState([]); // Listedeki tavsiyeler
    const [author, setAuthor] = useState(null); // Liste sahibi
    const [loading, setLoading] = useState(true);
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Sağ üst menü
    const [currentUser, setCurrentUser] = useState(null); // Giriş yapmış kullanıcı

    // Auth state'i dinle
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                 // Giriş yapılmamışsa ve liste detayı görüntülenmeye çalışılıyorsa
                 // Şimdilik izin veriyoruz, ama bazı aksiyonlar (örn: tavsiye olarak paylaş) engellenebilir
                 setCurrentUser(null);
                 // router.push('/giris'); // Giriş zorunluysa yönlendirilebilir
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Liste detaylarını ve içindeki tavsiyeleri dinle/çek
    useEffect(() => {
        if (!listId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const listDocRef = doc(db, "lists", listId);
        const unsubscribeList = onSnapshot(listDocRef, async (docSnap) => {
            if (docSnap.exists()) {
                const listData = { id: docSnap.id, ...docSnap.data() };
                setListDetails(listData);

                // Liste sahibinin bilgilerini çek (bir kere)
                try {
                     const authorDoc = await getDoc(doc(db, "users", listData.userId));
                     if (authorDoc.exists()) {
                         setAuthor({uid: authorDoc.id, ...authorDoc.data()});
                     } else {
                          console.warn("Liste sahibi bulunamadı:", listData.userId);
                          setAuthor(null); // Yazar yoksa null
                     }
                } catch (error) {
                     console.error("Liste sahibi bilgisi alınırken hata:", error);
                     setAuthor(null);
                }


                // Listedeki tavsiye ID'lerini al
                const recIds = listData.recommendations || [];
                if (recIds.length > 0) {
                     // Firestore 'in' sorgusu 10 elemanla sınırlı, gerekirse böl
                     const recChunks = [];
                     for (let i = 0; i < recIds.length; i += 10) {
                         recChunks.push(recIds.slice(i, i + 10));
                     }

                     try {
                         const recPromises = recChunks.map(chunk =>
                             getDocs(query(collection(db, "recommendations"), where("__name__", "in", chunk)))
                         );
                         const recSnapshots = await Promise.all(recPromises);
                         const recsData = recSnapshots.flatMap(snapshot =>
                             snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                         );
                         // Orijinal listedeki sırayı korumak için ID'lere göre sırala (opsiyonel)
                         const sortedRecs = recIds.map(id => recsData.find(rec => rec.id === id)).filter(Boolean);
                         setRecommendations(sortedRecs);
                     } catch (error) {
                          console.error("Listedeki tavsiyeler çekilirken hata:", error);
                          setRecommendations([]); // Hata durumunda boşalt
                     }

                } else {
                    setRecommendations([]); // Listede tavsiye yoksa boşalt
                }
            } else {
                console.error("Liste bulunamadı:", listId);
                setListDetails(null); // Liste yoksa null ata
                 router.push('/'); // Ana sayfaya yönlendir
            }
            setLoading(false); // Veri çekme işlemi bitince yüklemeyi kapat
        }, (error) => { // Dinleme sırasında hata olursa
             console.error("Liste dinlenirken hata:", error);
             setLoading(false);
             setListDetails(null);
             router.push('/');
        });

        // Component kaldırıldığında listener'ı temizle
        return () => unsubscribeList();
    }, [listId, router]); // listId veya router değişirse tekrar çalıştır

    // Paylaşma Fonksiyonları
    const handleShareLink = async () => {
        if (navigator.share && listDetails) { // Web Share API destekleniyorsa
            try {
                await navigator.share({
                    title: `Tavsiye Çemberi Listesi: ${listDetails.name}`,
                    text: `${author?.name || 'Bir kullanıcı'} tarafından oluşturulan "${listDetails.name}" listesine bir göz at!`,
                    url: window.location.href,
                });
            } catch (error) {
                console.error('Paylaşma sırasında hata:', error);
                // Başarısız olursa panoya kopyalamayı dene (fallback)
                navigator.clipboard.writeText(window.location.href);
                alert('Liste linki panoya kopyalandı!');
            }
        } else { // Desteklenmiyorsa panoya kopyala
            navigator.clipboard.writeText(window.location.href);
            alert('Listenin linki panoya kopyalandı!');
        }
        setIsMenuOpen(false); // Menüyü kapat
    };

    const handleShareAsRecommendation = async () => {
        // Giriş yapmamışsa veya gerekli veriler yoksa işlemi yapma
        if (!currentUser || !listDetails || !author) {
             alert("Listeyi tavsiye olarak paylaşmak için giriş yapmalısınız.");
             router.push('/giris');
             return;
         }

        try {
            // Yeni bir tavsiye dokümanı oluştur
            await addDoc(collection(db, "recommendations"), {
                userId: currentUser.uid, // Tavsiyeyi paylaşan kişi
                title: `Liste Tavsiyesi: ${listDetails.name}`,
                text: `${author.name} tarafından oluşturulan bu harika listeye göz atın! İçinde ${recommendations.length} tavsiye bulunuyor.`,
                category: "Liste", // Özel kategori
                // Arama için küçük harf alanları
                title_lowercase: `liste tavsiyesi: ${listDetails.name}`.toLowerCase(),
                category_lowercase: "liste",
                text_lowercase: `${author.name} tarafından oluşturulan bu harika listeye göz atın! İçinde ${recommendations.length} tavsiye bulunuyor.`.toLowerCase(),
                createdAt: serverTimestamp(),
                likes: [],
                listLink: `/liste/${listId}`, // Orijinal listeye link
                // imageUrl: listDetails.imageUrl || null // İsteğe bağlı: Listenin görselini kullan
            });
            alert('Liste başarıyla tavsiye olarak paylaşıldı!');
            router.push('/'); // Ana sayfaya yönlendir
        } catch (error) {
            console.error("Liste tavsiye olarak paylaşılırken hata oluştu:", error);
            alert("Bir hata oluştu, liste paylaşılamadı.");
        }
        setIsMenuOpen(false); // Menüyü kapat
    };
    // ----- Paylaşma Fonksiyonları Sonu -----


    // Yükleme durumu veya veri eksikliği
    if (loading || !listDetails /*|| !author*/) { // Yazar olmasa da listeyi gösterebiliriz
        return <div className="text-center py-10 flex flex-col items-center justify-center h-screen"><div className="loader"></div></div>;
    }

    const displayAuthor = author || { name: 'Bilinmeyen Kullanıcı', uid: listDetails.userId };
    const isOwner = currentUser && currentUser.uid === listDetails.userId; // Liste sahibi mi?

    // Render kısmı
    return (
        <div className="bg-white min-h-screen pb-4"> {/* Yorum footer'ı olmadığı için pb */}
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm shadow-sm">
                 <div className="p-4 flex justify-between items-center">
                    {/* Geri Butonu (Profilim veya Arama'ya gidebilir) */}
                    <button onClick={() => router.back()} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                        <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    {/* Liste Adı (uzunsa kısalt) */}
                    <h1 className="text-lg font-bold text-gray-800 truncate px-4 flex-1 text-center">{listDetails.name}</h1>
                    {/* Sağ Menü Butonu */}
                    <div className="relative">
                        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-700 hover:bg-gray-100 w-10 h-10 flex items-center justify-center rounded-full">
                            <i className="fas fa-ellipsis-v text-lg"></i>
                        </button>
                        {/* Açılır Menü */}
                        {isMenuOpen && (
                            <div
                                className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-20 border border-gray-100 py-1"
                                // Menü dışına tıklayınca kapatmak için event listener eklenebilir
                            >
                                {/* Düzenle (sahibi ise) */}
                                {isOwner && (
                                    <Link href={`/liste/${listId}/duzenle`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                                        <i className="fas fa-pencil-alt w-5 mr-1 text-gray-500"></i> Listeyi Düzenle
                                    </Link>
                                )}
                                {/* Bağlantı Olarak Paylaş */}
                                <button onClick={handleShareLink} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                    <i className="fas fa-link w-5 mr-1 text-gray-500"></i> Bağlantı Olarak Paylaş
                                </button>
                                {/* Tavsiye Olarak Paylaş (Giriş yapmışsa) */}
                                {currentUser && (
                                     <button onClick={handleShareAsRecommendation} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                        <i className="fas fa-bullhorn w-5 mr-1 text-gray-500"></i> Tavsiye Olarak Paylaş
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Liste Ana İçeriği */}
            <main className="p-4">
                {/* Liste Görseli, Adı, Sahibi, Açıklama */}
                <div className="text-center">
                    <Image
                        src={listDetails.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(listDetails.name.substring(0,2))}&background=random&color=fff&size=96`}
                        className="w-24 h-24 rounded-2xl object-cover mx-auto shadow-lg"
                        alt={`${listDetails.name} listesi için kapak görseli`} // İyileştirilmiş alt text
                        width={96}
                        height={96}
                        unoptimized // ui-avatars için
                    />
                    <h2 className="mt-4 text-2xl font-bold text-gray-900">{listDetails.name}</h2>
                    {/* Liste Sahibi Linki */}
                    <p className="mt-1 text-sm text-gray-500">
                        Oluşturan: <Link href={isOwner ? '/profil' : `/profil/${displayAuthor.uid}`} className="font-semibold text-teal-600 hover:underline">{displayAuthor.name}</Link>
                    </p>
                    {/* Liste Açıklaması (varsa) */}
                    {listDetails.description && (
                         <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">{listDetails.description}</p>
                     )}
                </div>

                {/* Listeye Tavsiye Ekle Butonu (sahibi ise) */}
                {isOwner && (
                    <div className="mt-6">
                        <Link href={`/yeni-tavsiye?listId=${listId}`} className="w-full block text-center bg-teal-600 text-white font-bold py-3 rounded-lg hover:bg-teal-700 transition-colors">
                            + Bu Listeye Tavsiye Ekle
                        </Link>
                    </div>
                )}

                {/* Listedeki Tavsiyeler */}
                <div className="mt-6">
                    <h3 className="font-bold text-gray-800 mb-3">Listedeki Tavsiyeler ({recommendations.length})</h3>
                    {recommendations.length > 0 ? (
                        <div className="space-y-3">
                            {recommendations.map(rec => (
                                <Link key={rec.id} href={`/tavsiye/${rec.id}`} className="flex items-center space-x-4 bg-gray-50 p-3 rounded-xl hover:bg-gray-100 transition-colors">
                                    {/* Tavsiye Görseli */}
                                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
                                        <Image
                                             src={rec.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent((rec.title || '?').substring(0,2))}&background=10B981&color=FFFFFF&size=64`}
                                             className="object-cover"
                                             alt={`${rec.title || 'Tavsiye'} görseli`} // İyileştirilmiş alt text
                                             fill
                                             sizes="64px"
                                             unoptimized/>
                                    </div>
                                    {/* Tavsiye Başlık ve Kategori */}
                                    <div className="flex-grow">
                                        <h4 className="font-bold text-gray-800">{rec.title}</h4>
                                        <p className="text-sm text-gray-500">{rec.category}</p>
                                    </div>
                                    {/* Beğeni Sayısı (Yıldız ikonu kaldırıldı, sadece sayı) */}
                                    <div className="text-sm font-semibold text-gray-700 flex items-center">
                                         <i className="far fa-heart text-pink-500 mr-1 text-xs"></i> {/* Beğeni ikonu */}
                                         <span>{rec.likes?.length || 0}</span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        // Tavsiye yoksa mesaj
                        <p className="text-center text-gray-500 pt-8">Bu listede henüz tavsiye yok.</p>
                    )}
                </div>
            </main>
        </div>
    );
};