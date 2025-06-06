import { ReactNode } from 'react';
import Header from '../components/layout/Header';
import NavigationBar from '../components/layout/NavigationBar';

interface MainLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MainLayout({ children, activeTab, onTabChange }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Bar */}
      <Header />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <div className="min-h-full">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <NavigationBar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
}