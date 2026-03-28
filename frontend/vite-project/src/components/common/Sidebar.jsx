import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import {
  FiHome,
  FiTrendingUp,
  FiShoppingCart,
  FiDollarSign,
  FiPackage,
  FiUsers,
  FiSettings,
} from 'react-icons/fi';

/**
 * Sidebar Navigation Component
 */
const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: FiHome },
    { path: '/livestock', label: 'Livestock', icon: FiTrendingUp },
    { path: '/poultry', label: 'Poultry', icon: FiShoppingCart },
    { path: '/feed', label: 'Feed', icon: FiPackage },
    { path: '/sales', label: 'Sales', icon: FiDollarSign },
    { path: '/expenses', label: 'Expenses', icon: FiTrendingUp },
    { path: '/staff', label: 'Staff', icon: FiUsers },
    { path: '/settings', label: 'Settings', icon: FiSettings },
  ];

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-emerald-800 to-emerald-900
        text-white p-6 transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        🌾 CloudFarm
      </h1>

      <nav className="space-y-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-emerald-600 shadow-lg' 
                  : 'hover:bg-emerald-700'}
              `}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-emerald-700">
        <p className="text-emerald-200 text-xs font-semibold uppercase mb-2">Farm Info</p>
        <p className="text-emerald-100 text-sm">Green Valley Farm</p>
        <p className="text-emerald-200 text-xs">Premium Member</p>
      </div>
    </aside>
  );
};

export default Sidebar;
