import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="app-container">
      {/* Persistent / Responsive Sidebar */}
      <Sidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Application Content Area */}
      <div className="main-wrapper">
        <Navbar onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
