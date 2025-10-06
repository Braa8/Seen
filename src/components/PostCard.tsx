import Link from 'next/link';
import { Post } from '@/data/posts';
import Image from 'next/image';
import { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

interface PostCardProps {
  post: Post;
}

const springConfig = { damping: 30, stiffness: 100, mass: 2 };

export default function PostCard({ post }: PostCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), springConfig);
  const rotateY = useSpring(useMotionValue(0), springConfig);
  const scale = useSpring(1, springConfig);

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    const rotationX = (offsetY / (rect.height / 2)) * -10;
    const rotationY = (offsetX / (rect.width / 2)) * 10;
    rotateX.set(rotationX);
    rotateY.set(rotationY);
  }

  function handleMouseEnter() {
    scale.set(1.05);
  }

  function handleMouseLeave() {
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <Link href={`/Posts/${post.id}`}>
      <motion.div
        ref={ref}
        className="group text-black bg-white rounded-xl shadow-2xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden cursor-pointer border-2 border-black [perspective:1000px]"
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d'
        }}
        onMouseMove={handleMouse}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* صورة المنشور (اختيارية) */}
        {post.image && (
          <div className="h-48  overflow-hidden">
            <Image 
              src={post.image} 
              alt={post.title}
              width={400}
              height={200}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        )}
        
        {/* إذا لم تكن هناك صورة، نضع خلفية ملونة */}
        {!post.image && (
          <div className="h-48 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
            <div className="text-white text-6xl font-bold opacity-20">
              {post.title.charAt(0)}
            </div>
          </div>
        )}

        {/* محتوى البطاقة */}
        <div className="p-6">
          {/* التصنيف */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
              {post.category}
            </span>
            <span className="text-gray-400 text-sm">{post.date}</span>
          </div>

          {/* العنوان */}
          <h2 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
            {post.title}
          </h2>

          {/* المقتطف */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {post.excerpt}
          </p>

          {/* المؤلف */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {post.author.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-700">{post.author}</span>
            </div>
            
            <span className="text-blue-600 text-sm font-semibold group-hover:translate-x-1 transition-transform">
              القراءة الكاملة
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
