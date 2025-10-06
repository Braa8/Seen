'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { MdEmail } from 'react-icons/md';
import LoadingPage from '@/components/LoadingPage';
import Link from 'next/link';

const LottieAnimation = dynamic(() => import('../../components/ContactAnimation'), { ssr: false });

const Contact = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailClick = () => {
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        window.location.href = 'mailto:Seen.editors@gmail.com';
        setIsLoading(false);
      }, 1000);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-gray-400 flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-8 border-white border-2 rounded-2xl p-8 bg-gray-300/40 backdrop-blur">
        <LottieAnimation />
        <div className="border-t-2 border-black w-full pt-4">
          <h1 className="text-4xl font-bold text-center text-black">راسلنا</h1>
        </div>
        <button
          onClick={handleEmailClick}
          className="bg-cyan-600 px-6 py-3 rounded-2xl text-white font-semibold flex items-center gap-2 hover:cursor-pointer hover:bg-blue-400 hover:scale-105 transition"
        >
          <MdEmail />
          <span>E-mail</span>
        </button>
      </div>
      <Link href="/" className='mt-6 '>
        <button className='bg-blue-400 p-4 border rounded-2xl hover:scale-105 hover:cursor-pointer transition'>
          العودة للرئيسية
        </button>
      </Link>
      
    </div>
  );
};

export default Contact;
