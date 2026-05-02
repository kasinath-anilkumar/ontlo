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
            <h2 className="text-xl font-semibold text-slate-200 mb-2">1. Information We Collect</h2>
            <p>
              When you use Ontlo, we collect information you provide directly to us, such as your username, email address, profile information, and any content you share during video chats or messaging.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">2. How We Use Your Information</h2>
            <p>
              We use the information we collect to provide, maintain, and improve our services, including matching you with other users based on your interests and preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">3. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide our services. You can request account deletion at any time through your profile settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">4. Safety and Security</h2>
            <p>
              We use automated tools to monitor for abusive behavior and toxic content. This helps ensure a safe experience for all Ontlo users.
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

export default PrivacyPolicy;
