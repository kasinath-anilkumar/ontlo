import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
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
          Terms of Service
        </h1>
        
        <div className="space-y-6 text-slate-400 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Ontlo, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">2. User Conduct</h2>
            <p>
              You are solely responsible for your interactions with other users. Harassment, toxic behavior, and the sharing of inappropriate content are strictly prohibited and may result in immediate account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">3. Age Requirement</h2>
            <p>
              You must be at least 13 years old to use Ontlo. By using the service, you represent and warrant that you meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">4. Disclaimers</h2>
            <p>
              Ontlo is provided "as is" without any warranties. We do not guarantee that the service will be uninterrupted or error-free.
            </p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500">
          Last updated: May 2, 2026
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
