import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { ContentProvider } from "./context/ContentContext";
import { ImageProvider } from "./context/ImageContext";
import { AdminRoute, ResellerRoute, SalesPartnerRoute } from "./components/ProtectedRoute";
import DynamicTitle from "./components/DynamicTitle";

// Public Pages
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import GarmentsPage from "./pages/GarmentsPage";
import FabricsPage from "./pages/FabricsPage";
import TechnologyPage from "./pages/TechnologyPage";
import HowItWorksPage from "./pages/HowItWorksPage";
import GetStartedPage from "./pages/GetStartedPage";
import TrunkShowPage from "./pages/TrunkShowPage";
import ContactUsPage from "./pages/ContactUsPage";

// Login Selection
import LoginSelectionPage from "./pages/LoginSelectionPage";

// Admin Pages
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import DashboardPage from "./pages/admin/DashboardPage";
import UIManagementPage from "./pages/admin/UIManagementPage";
import ContentEditorPage from "./pages/admin/ContentEditorPage";
import MultiPageEditorPage from "./pages/admin/MultiPageEditorPage";
import UsersPage from "./pages/admin/UsersPage";
import SettingsPage from "./pages/admin/SettingsPage";
import ProductCategoriesPage from "./pages/admin/ProductCategoriesPage";
import StyleManagementPage from "./pages/admin/StyleManagementPage";
import MeasurementConfigPage from "./pages/admin/MeasurementConfigPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import StripeSettingsPage from "./pages/admin/StripeSettingsPage";
import MarketingPage from "./pages/admin/MarketingPage";
import SalesPartnersPage from "./pages/admin/SalesPartnersPage";
import CustomerManagementPage from "./pages/admin/CustomerManagementPage";
import AdminChatsPage from "./pages/admin/AdminChatsPage";
import PricingModulePage from "./pages/admin/PricingModulePage";
import ApiKeysPage from "./pages/admin/ApiKeysPage";
import SizeRepositoryPage from "./pages/admin/SizeRepositoryPage";
import EmailKeysPage from "./pages/admin/EmailKeysPage";
import BackupRestorePage from "./pages/admin/BackupRestorePage";
import DatabaseSyncPage from "./pages/admin/DatabaseSyncPage";
import SEOManagementPage from "./pages/admin/SEOManagementPage";

// Password Reset Pages
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Reseller Pages
import ResellerLoginPage from "./pages/reseller/ResellerLoginPage";
import ResellerDashboard from "./pages/reseller/ResellerDashboard";
import AddCustomerPage from "./pages/reseller/AddCustomerPage";
import CustomizePage from "./pages/reseller/CustomizePage";
import ProductConfigurePage from "./pages/reseller/ProductConfigurePage";
import MeasurementPage from "./pages/reseller/MeasurementPage";
import MeasurementPhotosPage from "./pages/reseller/MeasurementPhotosPage";
import MeasurementDetailsPage from "./pages/reseller/MeasurementDetailsPage";
import StylingPage from "./pages/reseller/StylingPage";
import StylingTemplatesPage from "./pages/reseller/StylingTemplatesPage";
import ResellerSettingsPage from "./pages/reseller/ResellerSettingsPage";
import WIPOrdersPage from "./pages/reseller/WIPOrdersPage";
import LinkMeasurementPage from "./pages/reseller/LinkMeasurementPage";
import CartPage from "./pages/reseller/CartPage";
import StaffMarginsPage from "./pages/reseller/StaffMarginsPage";

// Sales Partner Pages
import SalesPartnerLoginPage from "./pages/partner/SalesPartnerLoginPage";
import SalesPartnerDashboard from "./pages/partner/SalesPartnerDashboard";

function App() {
  return (
    <AuthProvider>
      <ContentProvider>
        <ImageProvider>
          <div className="App">
            <BrowserRouter>
              {/* Dynamic site title from marketing settings */}
              <DynamicTitle />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/garments" element={<GarmentsPage />} />
            <Route path="/fabrics" element={<FabricsPage />} />
            <Route path="/technology" element={<TechnologyPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/get-started" element={<GetStartedPage />} />
            <Route path="/trunk-show" element={<TrunkShowPage />} />
            <Route path="/contact-us" element={<ContactUsPage />} />

            {/* Login Selection */}
            <Route path="/login" element={<LoginSelectionPage />} />

            {/* Password Reset (public) */}
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Admin Login (public) */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin Routes */}
            <Route path="/admin/dashboard" element={
              <AdminRoute pageId="dashboard"><DashboardPage /></AdminRoute>
            } />
            <Route path="/admin/ui" element={
              <AdminRoute pageId="dashboard"><UIManagementPage /></AdminRoute>
            } />
            <Route path="/admin/content" element={
              <AdminRoute pageId="pages"><ContentEditorPage /></AdminRoute>
            } />
            <Route path="/admin/pages" element={
              <AdminRoute pageId="pages"><MultiPageEditorPage /></AdminRoute>
            } />
            <Route path="/admin/users" element={
              <AdminRoute pageId="users"><UsersPage /></AdminRoute>
            } />
            <Route path="/admin/settings" element={
              <AdminRoute pageId="settings"><SettingsPage /></AdminRoute>
            } />
            <Route path="/admin/products" element={
              <AdminRoute pageId="products"><ProductCategoriesPage /></AdminRoute>
            } />
            <Route path="/admin/styling" element={
              <AdminRoute pageId="styling"><StyleManagementPage /></AdminRoute>
            } />
            <Route path="/admin/measurements" element={
              <AdminRoute pageId="measurements"><MeasurementConfigPage /></AdminRoute>
            } />
            <Route path="/admin/orders" element={
              <AdminRoute pageId="orders"><AdminOrdersPage /></AdminRoute>
            } />
            <Route path="/admin/stripe" element={
              <AdminRoute pageId="stripe"><StripeSettingsPage /></AdminRoute>
            } />
            <Route path="/admin/marketing" element={
              <AdminRoute pageId="marketing"><MarketingPage /></AdminRoute>
            } />
            <Route path="/admin/sales-partners" element={
              <AdminRoute pageId="sales-partners"><SalesPartnersPage /></AdminRoute>
            } />
            <Route path="/admin/customers" element={
              <AdminRoute pageId="customers"><CustomerManagementPage /></AdminRoute>
            } />
            <Route path="/admin/chats" element={
              <AdminRoute pageId="chats"><AdminChatsPage /></AdminRoute>
            } />
            <Route path="/admin/pricing" element={
              <AdminRoute pageId="pricing"><PricingModulePage /></AdminRoute>
            } />
            <Route path="/admin/email" element={
              <AdminRoute pageId="settings"><EmailKeysPage /></AdminRoute>
            } />
            <Route path="/admin/backup" element={
              <AdminRoute pageId="settings"><BackupRestorePage /></AdminRoute>
            } />
            <Route path="/admin/database-sync" element={
              <AdminRoute pageId="settings"><DatabaseSyncPage /></AdminRoute>
            } />
            <Route path="/admin/seo" element={
              <AdminRoute pageId="marketing"><SEOManagementPage /></AdminRoute>
            } />
            <Route path="/admin/api-keys" element={
              <AdminRoute pageId="api-keys"><ApiKeysPage /></AdminRoute>
            } />
            <Route path="/admin/size-repository" element={
              <AdminRoute pageId="size-repository"><SizeRepositoryPage /></AdminRoute>
            } />

            {/* Reseller Login (public) */}
            <Route path="/reseller/login" element={<ResellerLoginPage />} />

            {/* Protected Reseller Routes */}
            <Route path="/reseller/dashboard" element={
              <ResellerRoute><ResellerDashboard /></ResellerRoute>
            } />
            <Route path="/reseller/customers/add" element={
              <ResellerRoute><AddCustomerPage /></ResellerRoute>
            } />
            <Route path="/reseller/customize" element={
              <ResellerRoute><CustomizePage /></ResellerRoute>
            } />
            <Route path="/reseller/customize/configure" element={
              <ResellerRoute><ProductConfigurePage /></ResellerRoute>
            } />
            <Route path="/reseller/measurement" element={
              <ResellerRoute><MeasurementPage /></ResellerRoute>
            } />
            <Route path="/reseller/measurement/photos" element={
              <ResellerRoute><MeasurementPhotosPage /></ResellerRoute>
            } />
            <Route path="/reseller/measurement/details" element={
              <ResellerRoute><MeasurementDetailsPage /></ResellerRoute>
            } />
            <Route path="/reseller/styling" element={
              <ResellerRoute><StylingPage /></ResellerRoute>
            } />
            <Route path="/reseller/styling-templates" element={
              <ResellerRoute><StylingTemplatesPage /></ResellerRoute>
            } />
            <Route path="/reseller/settings" element={
              <ResellerRoute><ResellerSettingsPage /></ResellerRoute>
            } />
            <Route path="/reseller/my-pricing" element={
              <ResellerRoute><StaffMarginsPage /></ResellerRoute>
            } />
            <Route path="/reseller/orders" element={
              <ResellerRoute><WIPOrdersPage /></ResellerRoute>
            } />
            <Route path="/reseller/cart" element={
              <ResellerRoute><CartPage /></ResellerRoute>
            } />
            <Route path="/reseller/link-measurement" element={
              <ResellerRoute><LinkMeasurementPage /></ResellerRoute>
            } />

            {/* Sales Partner Login (public) */}
            <Route path="/partner/login" element={<SalesPartnerLoginPage />} />

            {/* Protected Sales Partner Routes */}
            <Route path="/partner/dashboard" element={
              <SalesPartnerRoute><SalesPartnerDashboard /></SalesPartnerRoute>
            } />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
          </div>
        </ImageProvider>
      </ContentProvider>
    </AuthProvider>
  );
}

export default App;
