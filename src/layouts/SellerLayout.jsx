import React from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "../Seller/shared/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useStore";
import { useTranslation } from "../context/LanguageContext";
import "./SellerLayout.css";

export default function SellerLayout() {
  const { user, farmerProfile, signOut } = useAuth();
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const NAV_ITEMS = [
    {
      path: "/seller/dashboard",
      icon: "dashboard",
      label: t("seller.dashboard"),
      filled: true,
    },
    {
      path: "/seller/projects",
      icon: "assignment",
      label: t("seller.projects"),
      filled: true,
    },
    {
      path: "/seller/analytics",
      icon: "analytics",
      label: t("seller.analytics"),
      filled: true,
    },
    {
      path: "/seller/wallet",
      icon: "account_balance_wallet",
      label: t("seller.wallet"),
      filled: true,
    },
    {
      path: "/seller/blockchain",
      icon: "verified",
      label: t("seller.blockchain"),
      filled: true,
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  const userInfo = {
    name:
      farmerProfile?.full_name || user?.user_metadata?.full_name || "Farmer",
    subtitle: farmerProfile?.farm_id
      ? `ID: #${farmerProfile.farm_id}`
      : "CarbonX Farmer",
    avatar: farmerProfile?.avatar_url || user?.user_metadata?.avatar_url || "",
  };

  return (
    <div className={`seller-layout ${isDark ? "dark" : ""}`}>
      {/* Sidebar */}
      <Sidebar
        appName="carbonX"
        appIcon="eco"
        navItems={NAV_ITEMS}
        userInfo={userInfo}
        onSignOut={handleSignOut}
      />

      {/* Main content area — offset by sidebar width */}
      <div className="seller-layout-content">
        <Outlet />
      </div>
    </div>
  );
}
