import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';

const LegalPage = () => {
  const location = useLocation();
  const isPrivacy = location.pathname === '/privacy-policy';
  const title = isPrivacy ? 'Privacy Policy' : 'Terms and Conditions';

  return (
    <div className="min-h-screen bg-[#f7faf6] text-slate-900">
      <header className="border-b border-emerald-900/10 bg-emerald-700 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3"><img src={cloudFarmLogo} alt="CloudFarm logo" className="h-10 w-10 rounded-xl object-contain" /><span className="text-xl font-black">CloudFarm</span></Link>
          <Link to="/register" className="inline-flex items-center gap-2 text-sm font-bold hover:text-emerald-100"><FiArrowLeft /> Back to registration</Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="mb-10 flex items-start gap-4"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><FiShield size={26} /></span><div><p className="text-sm font-black uppercase tracking-[.18em] text-emerald-700">CloudFarm legal</p><h1 className="mt-2 text-4xl font-black tracking-tight text-emerald-950 sm:text-5xl">{title}</h1><p className="mt-3 text-sm text-slate-500">Last updated: September 18, 2026</p></div></div>
        <article className="space-y-8 border border-emerald-100 bg-white p-6 shadow-sm sm:p-10">
          {isPrivacy ? <>
            <section><h2 className="text-2xl font-black text-emerald-950">1. Information we collect</h2><p className="mt-3 leading-8 text-slate-600">CloudFarm collects information you provide when creating and managing an account, such as your name, email address, farm details, contact information, and records entered into the application.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">2. How we use information</h2><p className="mt-3 leading-8 text-slate-600">We use account and farm information to provide authentication, farm management tools, subscriptions, reports, support, notifications, and service communications. We do not sell your personal information.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">3. Farm records and privacy</h2><p className="mt-3 leading-8 text-slate-600">Your farm records are used to provide the features you request. Access is controlled by authentication, role, permissions, subscription rules, and farm-level boundaries.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">4. Payments and communications</h2><p className="mt-3 leading-8 text-slate-600">Subscription payments are processed through the configured payment provider. CloudFarm may send account, subscription, security, and support communications related to your use of the service.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">5. Contact</h2><p className="mt-3 leading-8 text-slate-600">For privacy questions or account requests, contact CloudFarm through the available support channels.</p></section>
          </> : <>
            <section><h2 className="text-2xl font-black text-emerald-950">1. Using CloudFarm</h2><p className="mt-3 leading-8 text-slate-600">CloudFarm provides tools for organizing poultry, livestock, feed, expenses, sales, inventory, and farm records. You are responsible for the accuracy of information entered into your account and for keeping your login credentials secure.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">2. Accounts and authorized access</h2><p className="mt-3 leading-8 text-slate-600">You must provide accurate registration information and may not use another person’s credentials. Account owners and administrators are responsible for managing authorized staff access within their farm.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">3. Subscriptions and payments</h2><p className="mt-3 leading-8 text-slate-600">Subscription access depends on the plan, payment status, and terms shown in CloudFarm. Payment processing is handled through the configured payment provider. Features may vary by plan.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">4. Acceptable use</h2><p className="mt-3 leading-8 text-slate-600">Do not misuse the service, attempt unauthorized access, interfere with its operation, upload harmful content, or use CloudFarm to violate applicable law.</p></section>
            <section><h2 className="text-2xl font-black text-emerald-950">5. Service information</h2><p className="mt-3 leading-8 text-slate-600">CloudFarm provides organizational tools and calculations to support farm management. It does not guarantee farm profit, production outcomes, or business results.</p></section>
          </>}
        </article>
      </main>
    </div>
  );
};

export default LegalPage;
