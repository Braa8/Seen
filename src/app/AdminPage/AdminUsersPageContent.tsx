"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getDocs, collection, updateDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import LoadingPage from "../../components/LoadingPage";
import Link from "next/link";
import { FaUsers, FaUserShield, FaEdit, FaEye, FaCrown, FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";

type UserType = {
  id: string;
  email: string;
  roles: string[];
};

const availableRoles = [
  { key: "viewer", label: "زائر", icon: FaEye, color: "bg-gray-500" },
  { key: "writer", label: "كاتب", icon: FaEdit, color: "bg-blue-500" },
  { key: "editor", label: "محرر", icon: FaUserShield, color: "bg-green-500" },
  { key: "admin", label: "أدمن", icon: FaCrown, color: "bg-red-500" }
];

export default function AdminUsersPageContent() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !session.user.roles?.includes("admin")) {
      setLoading(false);
      return;
    }

    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const usersData: UserType[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as { email: string; roles: string[] };
          usersData.push({
            id: docSnap.id,       // استخدم ID المستند
            email: data.email,
            roles: Array.isArray(data.roles) ? data.roles : ["viewer"],
          });
        });
        setUsers(usersData);
      } catch (err) {
        console.error("خطأ عند جلب المستخدمين:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session]);

  const handleToggleRole = async (userId: string, roleKey: string, checked: boolean) => {
    try {
      const user = users.find((u) => u.id === userId);
      if (!user) return;

      const updatedRoles = checked
        ? [...user.roles, roleKey].filter((v, i, a) => a.indexOf(v) === i)
        : user.roles.filter((r) => r !== roleKey);

      await updateDoc(doc(db, "users", userId), { roles: updatedRoles });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, roles: updatedRoles } : u))
      );
    } catch (err) {
      console.error("فشل تعديل الأدوار:", err);
    }
  };

  const getRoleInfo = (roleKey: string) => {
    return availableRoles.find(role => role.key === roleKey) || availableRoles[0];
  };

  if (loading) return <LoadingPage />;
  
  if (!session || !session.user.roles?.includes("admin")) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #55799c 0%, #334d6f 50%, #0e2f5a 100%)'
      }}>
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 text-center">
          <FaTimes className="text-red-400 text-6xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">غير مصرح بالدخول</h2>
          <p className="text-blue-100 mb-6">هذه الصفحة مخصصة للأدمن فقط</p>
          <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            العودة للرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #55799c 0%, #334d6f 50%, #0e2f5a 100%)'
    }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-red-500 p-3 rounded-full">
                <FaCrown className="text-white text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">لوحة تحكم الأدمن</h1>
                <p className="text-blue-100">إدارة المستخدمين والأدوار</p>
              </div>
            </div>
            <Link 
              href="/" 
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <FaArrowLeft />
              <span>العودة للرئيسية</span>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <FaUsers className="text-blue-300 text-3xl" />
              <div>
                <p className="text-blue-100 text-sm">إجمالي المستخدمين</p>
                <p className="text-white text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <FaEdit className="text-green-300 text-3xl" />
              <div>
                <p className="text-blue-100 text-sm">الكتاب</p>
                <p className="text-white text-2xl font-bold">
                  {users.filter(u => u.roles.includes('writer')).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <FaUserShield className="text-yellow-300 text-3xl" />
              <div>
                <p className="text-blue-100 text-sm">المحررون</p>
                <p className="text-white text-2xl font-bold">
                  {users.filter(u => u.roles.includes('editor')).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
            <div className="flex items-center space-x-3">
              <FaCrown className="text-red-300 text-3xl" />
              <div>
                <p className="text-blue-100 text-sm">الأدمن</p>
                <p className="text-white text-2xl font-bold">
                  {users.filter(u => u.roles.includes('admin')).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg overflow-hidden">
          <div className="p-6 border-b border-white/20">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FaUsers />
              <span>إدارة المستخدمين</span>
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-right p-4 text-white font-semibold">المستخدم</th>
                  <th className="text-right p-4 text-white font-semibold">الأدوار الحالية</th>
                  <th className="text-right p-4 text-white font-semibold">إدارة الأدوار</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id} className={`border-b border-white/10 hover:bg-white/5 transition-colors ${
                    index % 2 === 0 ? 'bg-white/2' : ''
                  }`}>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.email}</p>
                          <p className="text-blue-200 text-sm">ID: {user.id}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {user.roles.map((roleKey) => {
                          const roleInfo = getRoleInfo(roleKey);
                          const IconComponent = roleInfo.icon;
                          return (
                            <span 
                              key={roleKey} 
                              className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium text-white ${roleInfo.color}`}
                            >
                              <IconComponent size={12} />
                              <span>{roleInfo.label}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex flex-wrap gap-3">
                        {availableRoles.map((role) => {
                          const IconComponent = role.icon;
                          const isChecked = user.roles.includes(role.key);
                          return (
                            <label 
                              key={role.key} 
                              className="flex items-center space-x-2 cursor-pointer group"
                            >
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleToggleRole(user.id, role.key, e.target.checked)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isChecked 
                                    ? 'bg-green-500 border-green-500' 
                                    : 'border-gray-400 hover:border-gray-300'
                                }`}>
                                  {isChecked && <FaCheck className="text-white text-xs" />}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1">
                                <IconComponent className="text-gray-300 text-sm" />
                                <span className="text-white text-sm group-hover:text-blue-200 transition-colors">
                                  {role.label}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
