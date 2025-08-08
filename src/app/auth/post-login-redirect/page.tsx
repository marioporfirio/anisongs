"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PostLoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // This will force a client-side navigation to the root,
    // which should trigger a re-evaluation of the session.
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p>Redirecionando...</p>
    </div>
  );
}
