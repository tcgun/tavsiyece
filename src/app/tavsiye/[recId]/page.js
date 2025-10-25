'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../../../firebaseConfig';
import CommentInput from '../../../components/CommentInput';
import { createNotification } from '../../../firebase/utils'; // YENİ: Yardımcı fonksiyonu import et

export default function RecommendationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { recId } = params;

    const [recommendation, setRecommendation] = useState(null);
    const [author, setAuthor] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUserData, setCurrentUserData] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [newComment, setNewComment] = useState("");

    // ... (diğer useEffect'ler aynı kalacak) ...

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                const unsubUser = onSnapshot(doc(db, "users", user.uid), userSnap => {
                    if (userSnap.exists()) {
                        setCurrentUserData({ uid: user.uid, ...userSnap.data() });
                    }
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
    
    useEffect(() => {
        if (!recId) return;

        const recRef = doc(db, "recommendations", recId);
        const unsubRec = onSnapshot(recRef, async (docSnap) => {
            if (docSnap.exists()) {
                const recData = { id: docSnap.id, ...docSnap.data() };
                setRecommendation(recData);
                const authorDoc = await getDoc(doc(db, "users", recData.userId));
                if (authorDoc.exists()) {
                    setAuthor({uid: authorDoc.id, ...authorDoc.data()});
                }
                setLoading(false);
            } else {
                router.push('/');
            }
        });

        const commentsRef = collection(db, "recommendations", recId, "comments");
        const q = query(commentsRef, orderBy("createdAt", "asc"));
        const unsubComments = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            setComments(commentsData);
        });

        return () => {
            unsubRec();
            unsubComments();
        };
    }, [recId, router]);
    

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !currentUserData) return;
        
        // Yorumu ekle
        await addDoc(collection(db, "recommendations", recId, "comments"), {
            text: newComment,
            userId: currentUserData.uid,
            userName: currentUserData.name,
            userPhotoURL: currentUserData.photoURL,
            createdAt: serverTimestamp(),
            likes: []
        });

        // Tavsiye sahibine bildirim gönder
        await createNotification({
            recipientId: recommendation.userId, // Tavsiyenin sahibi
            senderId: currentUserData.uid,
            senderName: currentUserData.name,
            senderPhotoURL: currentUserData.photoURL,
            message: `<strong>${currentUserData.name}</strong> tavsiyene yorum yaptı.`,
            link: `/tavsiye/${recId}`,
            imageUrl: recommendation.imageUrl
        });

        setNewComment("");
    };

    // ... (handleLikeRec ve handleSaveRec aynı kalacak) ...
     const handleLikeRec = async () => {
        if (!currentUserData) { router.push('/giris'); return; }
        const postRef = doc(db, "recommendations", recId);
        const likes = recommendation.likes || [];
        if (likes.includes(currentUserData.uid)) {
            await updateDoc(postRef, { likes: arrayRemove(currentUserData.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(currentUserData.uid) });
            // Tavsiye beğenildiğinde bildirim gönder
            await createNotification({
                recipientId: recommendation.userId,
                senderId: currentUserData.uid,
                senderName: currentUserData.name,
                senderPhotoURL: currentUserData.photoURL,
                message: `<strong>${currentUserData.name}</strong> tavsiyeni beğendi.`,
                link: `/tavsiye/${recId}`,
                imageUrl: recommendation.imageUrl
            });
        }
    };

     const handleSaveRec = async () => {
        if (!currentUserData) { router.push('/giris'); return; }
        const userRef = doc(db, "users", currentUserData.uid);
        const saved = currentUserData.savedRecommendations || [];
        if (saved.includes(recId)) {
            await updateDoc(userRef, { savedRecommendations: arrayRemove(recId) });
        } else {
            await updateDoc(userRef, { savedRecommendations: arrayUnion(recId) });
        }
    };


    // YORUM BEĞENME FONKSİYONU GÜNCELLENDİ
    const handleLikeComment = async (comment) => {
        if (!currentUserData) { router.push('/giris'); return; }

        const commentRef = doc(db, "recommendations", recId, "comments", comment.id);
        const commentLikes = comment.likes || [];
        
        if (commentLikes.includes(currentUserData.uid)) {
            await updateDoc(commentRef, { likes: arrayRemove(currentUserData.uid) });
        } else {
            await updateDoc(commentRef, { likes: arrayUnion(currentUserData.uid) });

            // Yorum beğenildiğinde yorum sahibine bildirim gönder
            await createNotification({
                recipientId: comment.userId, // Yorumun sahibi
                senderId: currentUserData.uid,
                senderName: currentUserData.name,
                senderPhotoURL: currentUserData.photoURL,
                message: `<strong>${currentUserData.name}</strong> bir tavsiyedeki yorumunu beğendi.`,
                link: `/tavsiye/${recId}`, // Yorumun olduğu tavsiyeye link ver
                imageUrl: recommendation.imageUrl // Tavsiyenin görseli
            });
        }
    };

    // ... (render kısmı aynı kalacak) ...
    if (loading || !recommendation || !author) {
        return <div className="text-center py-10 flex flex-col items-center justify-center h-screen"><div className="loader"></div></div>;
    }
    
    const postDate = recommendation.createdAt?.seconds ? new Date(recommendation.createdAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '';
    const isLiked = currentUserData && recommendation.likes?.includes(currentUserData.uid);
    const isSaved = currentUserData && currentUserData.savedRecommendations?.includes(recId);

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
                    <div className="w-10"></div>
                </div>
            </header>
            
            <main className="pb-32">
                {recommendation.imageUrl && 
                    <div className="relative w-full h-64">
                         <Image 
                            src={recommendation.imageUrl} 
                            alt={recommendation.title} 
                            className="object-cover"
                            fill
                            sizes="(max-width: 640px) 100vw, 640px"
                            priority
                        />
                    </div>
                }
                <div className="p-5">
                     <div className="flex items-center space-x-3 mb-4">
                        <Link href={`/profil/${recommendation.userId}`}>
                            <Image 
                                src={author.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(author.name)}`} 
                                className="w-12 h-12 rounded-full object-cover" 
                                alt={author.name}
                                width={48}
                                height={48}
                                unoptimized
                            />
                        </Link>
                        <div>
                            <Link href={`/profil/${recommendation.userId}`} className="font-bold text-gray-800 hover:underline">{author.name}</Link>
                            <p className="text-xs text-gray-500">{postDate}</p>
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">{recommendation.title}</h2>
                    <p className="text-sm text-gray-500 mb-2">{recommendation.category}</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{recommendation.text}</p>
                </div>
                
                <div className="px-3 py-2 border-t border-b border-gray-100 flex justify-around items-center text-gray-600">
                    <button onClick={handleLikeRec} className={`like-btn flex items-center gap-2 transition-colors p-2 rounded-lg ${isLiked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                        <i className={`${isLiked ? 'fas' : 'far'} fa-heart text-xl`}></i> 
                        <span className="text-sm font-semibold">{recommendation.likes?.length || 0} Beğeni</span>
                    </button>
                    <button onClick={handleSaveRec} className={`save-btn flex items-center gap-2 transition-colors p-2 rounded-lg ${isSaved ? 'text-yellow-500' : 'hover:text-yellow-500'}`}>
                        <i className={`${isSaved ? 'fas' : 'far'} fa-bookmark text-xl`}></i> 
                        <span className="text-sm font-semibold">Kaydet</span>
                    </button>
                </div>

                <div className="p-5">
                    <h3 className="font-bold text-gray-800 mb-4">{comments.length} Yorum</h3>
                    <div className="space-y-4">
                        {comments.map(comment => {
                            const isCommentLiked = currentUserData && comment.likes?.includes(currentUserData.uid);
                            return (
                                <div key={comment.id} className="flex items-start space-x-3">
                                    <Image 
                                        src={comment.userPhotoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}`} 
                                        className="w-10 h-10 rounded-full object-cover" 
                                        alt={comment.userName}
                                        width={40}
                                        height={40}
                                        unoptimized
                                    />
                                    <div className="flex-1">
                                        <div className="bg-gray-100 rounded-lg p-3">
                                            <Link href={comment.userId === currentUserData?.uid ? '/profil' : `/profil/${comment.userId}`} className="font-semibold text-sm text-gray-800 hover:underline">{comment.userName}</Link>
                                            <p className="text-sm text-gray-700">{comment.text}</p>
                                        </div>
                                        <div className="flex items-center space-x-3 mt-1 pl-1">
                                            <button onClick={() => handleLikeComment(comment)} disabled={!currentUserData} className={`text-xs font-semibold ${isCommentLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                                                Beğen
                                            </button>
                                            {comment.likes?.length > 0 && (
                                                <span className="flex items-center text-xs text-gray-500">
                                                    <i className="fas fa-heart text-red-500 mr-1"></i>
                                                    {comment.likes.length}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 bg-white">
                <div className="container mx-auto max-w-lg">
                    {!authChecked ? (
                        <div className="p-4 text-center text-sm text-gray-500">Yükleniyor...</div>
                    ) : currentUserData ? (
                        <CommentInput 
                            author={currentUserData}
                            text={newComment}
                            setText={setNewComment}
                            onSubmit={handleAddComment}
                        />
                    ) : (
                        <div className="p-4 text-center text-sm text-gray-600 bg-gray-50 border-t">
                            Yorum yapmak için <Link href="/giris" className="text-teal-600 font-bold">giriş yapmalısın.</Link>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}