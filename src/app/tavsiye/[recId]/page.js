'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function RecommendationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { recId } = params;

    useEffect(() => {
        // Ana sayfaya yönlendir ve modal'ı açmak için hash kullan
        if (recId) {
            router.replace(`/?rec=${recId}`);
        }
    }, [recId, router]);

    return null;
}
