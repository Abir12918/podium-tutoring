import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, UserPlus, Users, CalendarCheck, LogOut, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../firebase/firebaseConfig';

const SidebarLink = ({ to, icon: Icon, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
        isActive
          ? 'bg-brand-blue text-white shadow-md'
          : 'text-slate-600 hover:bg-brand-blue/10 hover:text-brand-blue'
      }`
    }
  >
    <Icon size={20} />
    <span>{children}</span>
  </NavLink>
);

const Layout = () => {
  const { currentUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="flex h-screen bg-brand-cream overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-brand-blue flex items-center gap-2">
            <span className="bg-brand-yellow text-brand-blue p-1.5 rounded-lg">P</span>
            Podium
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <SidebarLink to="/" icon={Home}>Home</SidebarLink>
          <SidebarLink to="/add-student" icon={UserPlus}>Add Student</SidebarLink>
          <SidebarLink to="/students" icon={Users}>Students</SidebarLink>
          <SidebarLink to="/attendance" icon={CalendarCheck}>Attendance</SidebarLink>
          <SidebarLink to="/tuition" icon={CreditCard}>Tuition</SidebarLink>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold">
              {currentUser?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {currentUser?.displayName || 'Teacher'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-brand-red hover:bg-brand-red/10 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
