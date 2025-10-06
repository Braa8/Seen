"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import GooeyNav from "../components/GooeyNav";
import LiquidEther from "../components/LiquidEther";
import LoadingPage from "../components/LoadingPage";
import { FaBars, FaTimes, FaPlus, FaUser, FaEdit, FaCog, FaChevronDown } from 'react-icons/fa';
import Image from 'next/image';

export default function Home() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    // محاكاة تحميل البيانات
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // إغلاق القائمة المنسدلة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownOpen && !(event.target as Element).closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  if (loading) {
    return <LoadingPage />;
  }
  
const items = [
  { label: "الرئيسية", href: "/" },
  { label: "سجّل دخولك", href: "/login" },
  { label: "حولنا", href: "/About" },
  { label: "تواصل معنا ", href: "/Contact" },
];

// تحديد نوع المستخدم والقوائم المتاحة
const getUserMenuItems = () => {
  if (!session?.user) return [];
  
  const userRoles = Array.isArray(session.user.roles) ? session.user.roles : [];
  const menuItems = [];

  // قوائم حسب الدور
  if (userRoles.includes("writer")) {
    menuItems.push({ label: "البروفايل", href: "/Profile", icon: FaUser });
    menuItems.push({ label: "لوحة الكاتب", href: "/WriterPage", icon: FaEdit });
  }
  
  if (userRoles.includes("editor")) {
    menuItems.push({ label: "لوحة المحرر", href: "/EditorPage", icon: FaEdit });
  }
  
  if (userRoles.includes("admin")) {
    menuItems.push({ label: "لوحة الأدمن", href: "/AdminPage", icon: FaCog });
  }

  return menuItems;
};

const userMenuItems = getUserMenuItems();

  return (
    <div className="relative min-h-screen">
      {/* خلفية التأثير - تغطي الشاشة بالكامل */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{ width: '100vw', height: '100vh' }}
      >
        <LiquidEther
          colors={['white', 'white', 'white']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={0.9}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.1}
          autoIntensity={2}
          autoResumeDelay={300}
          autoRampDuration={0.2}
          // لا تضف pointer-events هنا داخل المكون نفسه
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* محتوى الصفحة فوق الخلفية */}
      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-md border-b-2 border-white rounded-b-3xl ">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center space-x-3">
                <div className="w-15 h-15 flex items-center justify-center shadow-lg">
                  <Image 
                  src='/logo.png'
                  alt='Logo'
                  width={100}
                  height={100}
                  />
                </div>
              </div>

              {/* Desktop Navigation - GooeyNav */}
              <div className="hidden md:block ">
                <GooeyNav
                  items={items}
                  particleCount={15}
                  particleDistances={[90, 10]}
                  particleR={100}
                  initialActiveIndex={0}
                  animationTime={500}
                  timeVariance={300}
                  colors={[1, 2, 3, 1, 2, 3, 1, 4]}
                />
              </div>

              {/* User Menu & Mobile Menu */}
              <div className="flex items-center space-x-4">
                {/* User Dropdown (Desktop) */}
                {session?.user && userMenuItems.length > 0 && (
                  <div className="relative hidden md:block user-dropdown">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center space-x-2 text-white hover:cursor-pointer hover:text-blue-200 transition-colors p-2 rounded-lg hover:bg-white/10"
                    >
                      <FaPlus size={18} />
                      <FaChevronDown size={12} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {dropdownOpen && (
                      <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 py-2 z-50">
                        {userMenuItems.map((item, index) => (
                          <Link
                            key={index}
                            href={item.href}
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center space-x-3 px-4 py-3 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            <item.icon size={16} />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  {sidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Sidebar */}
        <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white/95 backdrop-blur-md transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        } md:hidden`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Image 
                  src='/logo.png'
                  alt='Logo'
                  width={100}
                  height={100}
                  />
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-600 hover:text-gray-800 p-1"
              >
                <FaTimes size={20} />
              </button>
            </div>
            
            <nav className="space-y-4">
              {/* القائمة الرئيسية */}
              {items.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className="block text-gray-800 hover:text-blue-600 transition-colors font-medium py-3 px-4 rounded-lg hover:bg-blue-50 border-b border-gray-200"
                >
                  {item.label}
                </Link>
              ))}
              
              {/* قوائم المستخدم */}
              {session?.user && userMenuItems.length > 0 && (
                <>
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <h3 className="text-sm font-semibold text-gray-600 px-4 mb-2">لوحات التحكم</h3>
                    {userMenuItems.map((item, index) => (
                      <Link
                        key={`user-${index}`}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center space-x-3 text-gray-800 hover:text-blue-600 transition-colors font-medium py-3 px-4 rounded-lg hover:bg-blue-50"
                      >
                        <item.icon size={16} />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </nav>
          </div>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* بقية المحتوى */}
        <div className="flex flex-col justify-center items-center min-h-screen gap-3 -mt-30">
          <Image 
          src='/logo.png'
          alt='Logo'
          width={300}
          height={300}
          />
          <h1 className="text-4xl font-bold font-mono text-white "> لأن الصّحافة سُؤال </h1>
          <Link href="/Posts">
          <button className='bg-white p-3 mt-4 text-lg font-bold border-2 border-cyan-400 rounded-full hover:bg-gray-300 hover:cursor-pointer hover:scale-95' >
            تصفح المقالات ←
          </button>
          </Link>
        </div>
      </div>
    </div>
  );
}