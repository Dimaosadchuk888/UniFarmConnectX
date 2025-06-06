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
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex flex-col">
      {/* Top Bar */}
      <Header />
      
      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto overflow-x-hidden custom-scrollbar pb-20 px-4">
        <div className="min-h-full w-full max-w-md mx-auto">
          {children}
        </div>
      </main>
      
      {/* Bottom Navigation */}
      <NavigationBar activeTab={activeTab} setActiveTab={onTabChange} />
    </div>
  );
}