import { ReactNode } from 'react';
import Header from '@/components/layout/Header';
import NavigationBar from '@/components/layout/NavigationBar';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ overflow: 'visible', height: 'auto' }}>
      {/* Top Bar */}
      <Header />
      
      {/* Main Content Area - T10 SCROLL FIX */}
      <main 
        className="flex-1 px-4 py-2" 
        style={{ 
          overflowY: 'auto', 
          overflowX: 'hidden', 
          paddingBottom: '160px',
          minHeight: 'calc(100vh - 200px)',
          maxHeight: 'none',
          height: 'auto'
        }}
      >
        <div className="max-w-full" style={{ overflow: 'visible', height: 'auto' }}>
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <NavigationBar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
}