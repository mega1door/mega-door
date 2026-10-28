import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "./WhatsAppButton";
import SwipeBackGesture from "./SwipeBackGesture";
import CatalogBoundary from "./CatalogBoundary";

export default function Layout() {
  return (
    <div className="site-font relative flex min-h-screen flex-col bg-charcoal lg:bg-transparent">
      <SwipeBackGesture />
      <div className="relative z-10 flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1">
          <CatalogBoundary><Outlet /></CatalogBoundary>
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </div>
  );
}
