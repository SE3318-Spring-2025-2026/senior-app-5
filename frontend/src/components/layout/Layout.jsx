import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-[#060d1a] overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-7 overflow-y-auto">
          <div className="bg-[#0d1729] rounded-2xl p-6 min-h-full border border-[#1e293b] shadow-xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
