import React from 'react';

const Navbar = () => {
  return (
    <nav className="w-full bg-gray-800 p-4 flex justify-between items-center text-white">
      <div className="text-lg font-bold">Trading Manage App</div>
      <div className="flex gap-4">
        <a href="/dashboard" className="hover:underline">대시보드</a>
        <a href="/trades" className="hover:underline">매매일지</a>
        <a href="/analysis" className="hover:underline">실시간 분석</a>
      </div>
    </nav>
  );
};

export default Navbar;
