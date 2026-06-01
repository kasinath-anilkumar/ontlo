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
            <h2 className="text-xl font-semibold text-slate-200 mb-2">1. DPDP Act Compliance & Data Fiduciary</h2>
            <p>
              In accordance with India's <strong>Digital Personal Data Protection (DPDP) Act, 2023</strong>, Ontlo acts as the "Data Fiduciary" for personal data collected on the platform, and you are the "Data Principal". We process your digital personal data solely on the basis of your free, specific, informed, unconditional, and unambiguous consent, obtained through a clear affirmative action.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">2. Information We Collect</h2>
            <p>
              We collect only the minimum necessary information required to provide our social discovery and networking services:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Profile Information:</strong> Username, email, profile photo, gender, bio, and interests.</li>
              <li><strong>Real-time Media & Permissions:</strong> Camera and microphone access, which are only requested and used during active, user-initiated audio or video calls. We do not record or store these streams.</li>
              <li><strong>User Content:</strong> Public posts, messages, and associated metadata.</li>
              <li><strong>Technical Data:</strong> IP address, device model, and operating system details to ensure platform security, verify user authenticity, and prevent fraud.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">3. Purpose of Processing</h2>
            <p>
              We process your personal data for the following specific purposes:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>To construct and display your public profile.</li>
              <li>To match and connect you with other users based on shared interests.</li>
              <li>To facilitate secure, real-time audio/video communication.</li>
              <li>To verify identity, enforce platform safety rules, and investigate abuse reports.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">4. Rights of the Data Principal</h2>
            <p>
              Under the DPDP Act, 2023, you have legal rights regarding your personal data, which you can exercise at any time:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li><strong>Right to Summary:</strong> Request a summary of personal data being processed and the processing activities.</li>
              <li><strong>Right to Correction & Completion:</strong> Correct inaccurate data or complete incomplete details.</li>
              <li><strong>Right to Erasure:</strong> Request the deletion of your account and personal data, which we will purge within 30 days unless legal retention is required by Indian law.</li>
              <li><strong>Right to Nominate:</strong> Nominate an individual to exercise your rights in the event of death or incapacity.</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw your consent to data processing, which will terminate your account access.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">5. Data Sharing & Security</h2>
            <p>
              We do not sell or trade your personal data. We share data only with trusted infrastructure providers (Data Processors) acting under strict contractual guidelines. We may disclose data to Indian government authorities or law enforcement agencies when mandated by valid legal orders under Section 69 of the Information Technology Act, 2000.
            </p>
          </section>

          <section className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
            <h2 className="text-xl font-semibold text-indigo-400 mb-2 font-mono uppercase tracking-wider text-sm">Grievance Redressal Officer</h2>
            <p className="text-sm text-slate-300">
              Pursuant to Rule 3(2) of the Information Technology Intermediary Rules, 2021 and Section 13 of the DPDP Act, 2023, you may contact our Grievance Officer regarding any complaints or to exercise your data rights:
            </p>
            <div className="mt-4 space-y-1 text-sm font-medium">
              <p>Name: Kasinath Anilkumar</p>
              <p>Designation: Grievance Redressal Officer</p>
              <p>Email: ontlo.app@gmail.com</p>
              <p>Address: Ontlo, Alappuzha, Kerala, India</p>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              We will acknowledge your grievance within 24 hours and resolve it within 15 days of receipt.
            </p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500">
          Last updated: June 1, 2026
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
