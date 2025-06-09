import { ReactNode } from 'react';
import NavigationBar from '@/components/layout/NavigationBar';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <NavigationBar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
}