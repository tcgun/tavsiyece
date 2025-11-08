'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';

export default function NotificationsPage() {
    const router = useRouter();
    const { isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading) {
            router.replace('/?tab=notifications');
        }
    }, [authLoading, router]);

    return null;
}
