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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <Header />
      
      {/* Main Content Area with proper spacing for fixed header and nav */}
      <main className="flex-1 overflow-auto px-4 pt-16 pb-20">
        <div className="max-w-md mx-auto">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <NavigationBar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
}