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
              By accessing or using Ontlo, you agree to be bound by these Terms of Service and all applicable laws of the Republic of India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">2. User Conduct & Prohibited Content</h2>
            <p>
              In accordance with the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, users are prohibited from hosting, displaying, or sharing any information that:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Is defamatory, obscene, pornographic, or pedophilic.</li>
              <li>Invades another's privacy or is insulting/harassing on the basis of gender.</li>
              <li>Promotes illegal activities, gambling, or money laundering.</li>
              <li>Threatens the unity, integrity, or sovereignty of India.</li>
              <li>Contains software viruses or any other harmful computer code.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">3. Age Requirement (18+)</h2>
            <p>
              Due to the nature of live video communication and compliance with the DPDP Act 2023 regarding children's data, you must be at least **18 years old** to use Ontlo. We do not knowingly collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">4. Reporting & Takedowns</h2>
            <p>
              If you encounter content that violates these terms, please use the "Report" button immediately. We reserve the right to remove content and terminate accounts that violate Indian law or these terms within 24 hours of receiving a valid complaint.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">5. Disclaimers & Jurisdiction</h2>
            <p>
              Ontlo is provided "as is". All disputes arising out of these terms shall be subject to the exclusive jurisdiction of the courts in **Trivandrum, Kerala, India**.
            </p>
          </section>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-800 text-sm text-slate-500">
          Last updated: May 3, 2026 (Compliant with IT Rules 2021)
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
