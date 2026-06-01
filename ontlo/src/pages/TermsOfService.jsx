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
            <h2 className="text-xl font-semibold text-slate-200 mb-2">1. Intermediary Status & Acceptance of Terms</h2>
            <p>
              Ontlo operates as an "Intermediary" under Section 2(1)(w) of India's <strong>Information Technology Act, 2000</strong>. These Terms of Service constitute an electronic record published in compliance with Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021. By accessing or using the platform, you agree to comply with these terms, our policies, and all applicable laws of the Republic of India.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">2. User Conduct & Prohibited Content</h2>
            <p>
              Under Rule 3(1)(b) of the IT Rules, 2021, you are strictly prohibited from hosting, displaying, uploading, modifying, publishing, transmitting, storing, updating, or sharing any information on Ontlo that:
            </p>
            <ul className="list-disc ml-6 mt-2 space-y-1.5">
              <li>belongs to another person and to which you do not have any right;</li>
              <li>is defamatory, obscene, pornographic, pedophilic, invasive of another's privacy, bodily harmful, harassing on the basis of gender, libellous, racially or ethnically objectionable, or encouraging money laundering or gambling;</li>
              <li>harms minors in any way;</li>
              <li>infringes any patent, trademark, copyright, or other proprietary rights;</li>
              <li>deceives or misleads the addressee about the origin of the message or knowingly communicates any misinformation;</li>
              <li>impersonates another person;</li>
              <li>threatens the unity, integrity, defence, security, or sovereignty of India, friendly relations with foreign states, public order, or causes incitement to any cognizable offence;</li>
              <li>contains software viruses or any computer code designed to interrupt, destroy, or limit the functionality of any computer resource;</li>
              <li>is patently false and untrue, and is written or published in any form with the intent to mislead or harass for financial gain.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">3. Age & Contractual Eligibility (18+)</h2>
            <p>
              To create an account and participate in live communications on Ontlo, you must be at least <strong>18 years old</strong> and fully competent to contract under the Indian Contract Act, 1872. If you are under 18, you are strictly prohibited from using the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">4. Content Moderation & Takedowns</h2>
            <p>
              As an intermediary, Ontlo reserves the right (but does not assume the obligation) to monitor, moderate, and remove any user content that violates these Terms or applicable laws. Pursuant to valid government or judicial directives under Section 79(3)(b) of the IT Act, 2000, we will disable access to illegal or prohibited content within 24 to 36 hours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">5. Intellectual Property</h2>
            <p>
              You retain all ownership rights to the content you create and post on Ontlo. By uploading content, you grant Ontlo a non-exclusive, royalty-free, worldwide license to host, distribute, modify, display, and perform your content solely for the purpose of operating and providing our social discovery and networking services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-200 mb-2">6. Limitation of Liability & Jurisdiction</h2>
            <p>
              Ontlo is provided on an "as-is" and "as-available" basis. In accordance with Section 79 of the IT Act, 2000, Ontlo claims safe-harbor intermediary protection and is not liable for user-generated content, communication sessions, or user conduct. All disputes arising from these Terms or platform use shall be subject to the exclusive jurisdiction of the competent courts in <strong>Bengaluru, Karnataka, India</strong>.
            </p>
          </section>

          <section className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20">
            <h2 className="text-xl font-semibold text-indigo-400 mb-2 font-mono uppercase tracking-wider text-sm">Grievance Officer & Redressal</h2>
            <p className="text-sm text-slate-300">
              Pursuant to the Information Technology Intermediary Rules, 2021, if you encounter violations of these terms or wish to report abuse, you may write to our Grievance Officer:
            </p>
            <div className="mt-4 space-y-1 text-sm font-medium">
              <p>Name: Kasinath Anilkumar</p>
              <p>Designation: Grievance Redressal Officer</p>
              <p>Email: ontlo.app@gmail.com</p>
              <p>Address: Ontlo, Alappuzha, Kerala, India</p>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Complaints will be acknowledged within 24 hours and investigated and resolved within 15 days of receipt.
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

export default TermsOfService;
