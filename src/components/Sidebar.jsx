import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Home, UserPlus, Users, CalendarCheck, LogOut, Menu, X } from 'lucide-react';

function Sidebar() {
  const { logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/add-student', icon: UserPlus, label: 'Add Student' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/attendance', icon: CalendarCheck, label: 'Attendance' },
  ];

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header & Toggle */}
      <div className="md:hidden flex items-center justify-between bg-blue-600 text-white p-4 shrink-0">
        <h1 className="text-xl font-bold tracking-tight">Podium</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-blue-700 rounded-md active:bg-blue-800 transition-colors">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity" 
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden md:block shrink-0">
          <h1 className="text-2xl font-extrabold text-blue-600 tracking-tight">Podium</h1>
        </div>

        <nav className="flex-1 px-4 mt-6 md:mt-0 space-y-1.5 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={({ isActive }) => `
                flex items-center px-4 py-3 rounded-xl font-medium transition-colors
                ${isActive 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <link.icon className="mr-3 h-5 w-5 shrink-0" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-xl font-medium transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
