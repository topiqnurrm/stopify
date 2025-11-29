'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Home() {
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = () => {
    setIsAnimating(true);
    setTimeout(() => {
      router.push('/ui/music');
    }, 500);
  };

  return (
    <div 
      onClick={handleClick}
      className={`flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black cursor-pointer transition-all duration-500 ${
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      <div className="text-center space-y-8 px-8">
        {/* Logo/Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
            <span className="text-7xl">🎵</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-tight">
          Stopify
        </h1>

        {/* Subtitle */}
        <p className="text-xl md:text-2xl text-gray-300 font-light">
          Selamat datang di Stopify
        </p>

        {/* Click instruction with animation */}
        <div className="mt-12 animate-bounce">
          <p className="text-lg md:text-xl text-gray-400 italic">
            Klik dimana saja untuk melanjutkan
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse delay-100"></span>
            <span className="w-2 h-2 bg-white rounded-full animate-pulse delay-200"></span>
          </div>
        </div>

        {/* Optional: Music note decorations */}
        <div className="absolute top-20 left-20 text-6xl text-white/10 animate-float">
          ♪
        </div>
        <div className="absolute bottom-32 right-32 text-8xl text-white/10 animate-float-delayed">
          ♫
        </div>
        <div className="absolute top-1/3 right-20 text-5xl text-white/10 animate-float">
          ♬
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 4s ease-in-out infinite;
          animation-delay: 1s;
        }

        .delay-100 {
          animation-delay: 0.1s;
        }

        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  );
}