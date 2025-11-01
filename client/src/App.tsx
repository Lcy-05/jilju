import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./lib/auth";
import { SplashScreen } from "@/components/splash/splash-screen";

import Home from "@/pages/home";
import Discover from "@/pages/discover";
import Map from "@/pages/map";
import Saved from "@/pages/saved";
import Profile from "@/pages/profile";
import Chat from "@/pages/chat";
import Auth from "@/pages/auth";
import BenefitDetail from "@/pages/benefit-detail";
import MerchantWizard from "@/pages/merchant/wizard";
import MerchantDashboard from "@/pages/merchant/dashboard";
import MerchantStore from "@/pages/merchant/store";
import MerchantBenefits from "@/pages/merchant/benefits";
import AdminConsole from "@/pages/admin/console";
import AdminInquiries from "@/pages/admin-inquiries";
import AdminChat from "@/pages/admin-chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/discover" component={Discover} />
      <Route path="/map" component={Map} />
      <Route path="/saved" component={Saved} />
      <Route path="/profile" component={Profile} />
      <Route path="/chat" component={Chat} />
      <Route path="/login" component={Auth} />
      <Route path="/register" component={Auth} />
      <Route path="/benefits/:id" component={BenefitDetail} />
      <Route path="/merchant/wizard" component={MerchantWizard} />
      <Route path="/merchant/dashboard" component={MerchantDashboard} />
      <Route path="/merchant/store" component={MerchantStore} />
      <Route path="/merchant/benefits" component={MerchantBenefits} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/admin/inquiries" component={AdminInquiries} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // 세션 내에서 한 번만 스플래시 표시 (브라우저 닫으면 리셋)
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splashShown');
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('splashShown', 'true');
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          {showSplash ? (
            <SplashScreen onComplete={handleSplashComplete} />
          ) : (
            <div className="min-h-screen">
              <Toaster />
              <Router />
            </div>
          )}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
