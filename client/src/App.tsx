import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

import Header from "@/components/layout/Header";
import NavigationBar from "@/components/layout/NavigationBar";
import Dashboard from "@/pages/Dashboard";
import Farming from "@/pages/Farming";
import Missions from "@/pages/Missions";
import Friends from "@/pages/Friends";
import Wallet from "@/pages/Wallet";

// For Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        expand: () => void;
        ready: () => void;
      };
    };
  }
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Switch between tabs without using routes (simpler for Telegram Mini App)
  const renderActivePage = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "farming":
        return <Farming />;
      case "missions":
        return <Missions />;
      case "friends":
        return <Friends />;
      case "wallet":
        return <Wallet />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-md mx-auto min-h-screen bg-background pb-20 relative">
        <Header />
        <main className="px-4 pt-2 pb-20">
          {renderActivePage()}
        </main>
        <NavigationBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
