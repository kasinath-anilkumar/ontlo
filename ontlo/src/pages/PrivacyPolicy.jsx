import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-8 flex flex-col items-center">
      <div className="max-w-3xl w-full">
        <button 
          onClick={() => navigate(-1)}
          className="mb-8 text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          &larr; Back
        </button>
        
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        
        <div className="space-y-6 text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">1. Information We Collect (DPDP Act Compliance)</h2>
            <p>
              In accordance with the Digital Personal Data Protection Act (DPDP), 2023, we collect only the data necessary for the performance of our services:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Profile information (Username, Gender, Interests).</li>
              <li>Camera and Microphone access (only during active video calls).</li>
              <li>Network information (IP address) for security and fraud prevention.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, including matching you with other users based on your interests and preferences. We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">3. User Rights</h2>
            <p>
              Under the DPDP Act, you have the right to:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Request a copy of the personal data we hold about you.</li>
              <li>Request correction of inaccurate or incomplete data.</li>
              <li>Withdraw your consent at any time and request account deletion.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">4. Data Retention</h2>
            <p>
              We retain your personal information for as long as your account is active. Upon account deletion, we purge all personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">5. Safety and Security</h2>
            <p>
              We use automated tools to monitor for abusive behavior. This helps ensure a safe experience for all Ontlo users in compliance with Intermediary Guidelines.
            </p>
          </section>

          <section className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
            <h2 className="text-xl font-semibold text-indigo-400 mb-2 font-mono uppercase tracking-wider text-sm">Grievance Redressal Officer</h2>
            <p className="text-sm text-slate-300">
              As per the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, the contact details of the Grievance Officer are:
            </p>
            <div className="mt-4 space-y-1 text-sm font-medium">
              <p>Name: Kasinath Anilkumar</p>
              <p>Designation: Grievance Redressal Officer</p>
              <p>Email: legal@ontlo.com</p>
              <p>Address: Ontlo Technologies, Trivandrum, Kerala, India</p>
            </div>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500">
          Last updated: May 3, 2026 (Compliant with DPDP Act 2023)
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
