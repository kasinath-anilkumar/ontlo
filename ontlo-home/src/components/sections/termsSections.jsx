import React from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import useSEO from '../../hooks/useSEO'

const termsSections = [
  {
    icon: '🇮🇳',
    title: 'Intermediary Status & Acceptance',
    content:
      'Ontlo is an "Intermediary" as defined under Section 2(1)(w) of the Indian Information Technology Act, 2000. These Terms of Service are published in accordance with Rule 3(1) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.'
  },
  {
    icon: '🔞',
    title: 'Eligibility & Contracts',
    content:
      'To use Ontlo, you must be at least 18 years of age and legally competent to enter into a contract under the Indian Contract Act, 1872. If you are under 18, you are not permitted to register an account or use our communication features.'
  },
  {
    icon: '🚫',
    title: 'Prohibited Content & Intermediary Guidelines',
    content:
      'Under Rule 3(1)(b) of the IT Rules, 2021, you agree not to host, display, upload, modify, publish, transmit, store, update, or share any information that: (1) belongs to another person; (2) is defamatory, obscene, pornographic, pedophilic, invasive of another\'s privacy, bodily harmful, harassing on the basis of gender, libellous, racially objectionable, or encourages money laundering or gambling; (3) harms minors; (4) infringes intellectual property rights; (5) contains malware/viruses; (6) threatens the security, integrity, or defense of India, friendly relations with foreign states, or public order; or (7) is patently false or misleading.'
  },
  {
    icon: '🛡️',
    title: 'Platform Moderation & Content Removal',
    content:
      'As an intermediary, Ontlo reserves the right to immediately remove, disable access to, or restrict any content that violates these Terms or is flagged by government/judicial orders under Section 79(3)(b) of the IT Act, 2000. Violation of these terms may result in account suspension or termination.'
  },
  {
    icon: '🗣️',
    title: 'Real-Time Communication Rules',
    content:
      'Our audio, video, and text communication tools are meant for authentic interaction. You are strictly prohibited from recording, capturing, or sharing screenshots of other users during private voice or video sessions without their express, verifiable consent.'
  },
  {
    icon: '📜',
    title: 'Intellectual Property & Licensing',
    content:
      'You retain ownership of the content you post on Ontlo. However, by uploading content, you grant Ontlo a non-exclusive, royalty-free, worldwide license to host, distribute, display, and run your content solely to deliver our social networking services.'
  },
  {
    icon: '⚖️',
    title: 'Limitation of Liability & Safe Harbor',
    content:
      'To the maximum extent permitted under Section 79 of the IT Act, 2000, Ontlo shall not be liable for user-generated content, messages, or activities. The platform is provided on an "as-is" basis, and we disclaim all warranties regarding service uptime, reliability, or safety.'
  },
  {
    icon: '🏛️',
    title: 'Governing Law & Dispute Jurisdiction',
    content:
      'These Terms are governed by and construed in accordance with the laws of India. Any disputes, claims, or legal proceedings arising out of your use of Ontlo shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.'
  },
  {
    icon: '📬',
    title: 'Grievance Officer & Redressal Mechanism',
    content:
      'Pursuant to Rule 3(2) of the IT Rules, 2021 and the DPDP Act, 2023, any grievances or reports of violations can be sent to our Grievance Officer, Kasinath Anilkumar, at ontlo.app@gmail.com. We will acknowledge receipt of your complaint within 24 hours and resolve it within 15 days.'
  }
]



const TermsOfService = () => {
  useSEO({
    title: 'Terms of Service | Ontlo',
    description: 'Review the rules, responsibilities, and guidelines that maintain a safe, respectful, and trusted experience for everyone on the Ontlo platform.',
    keywords: 'Ontlo terms, terms of service, platform usage, user responsibility, safety standards, community guidelines'
  })

  return (
    <>
      <Navbar />
      <section className="relative min-h-screen overflow-hidden bg-[#04010B] text-white">
        {/* Ambient Background */}
        <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] bg-indigo-600/10 blur-[180px] rounded-full pointer-events-none" />

        <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-fuchsia-600/10 blur-[160px] rounded-full pointer-events-none" />

        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-20 py-24 md:py-32">

          {/* Label */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(255,255,255,0.03)] mb-10">
            <span className="text-pink-500 text-lg">✦</span>

            <span className="text-[11px] md:text-xs font-semibold tracking-[0.3em] text-gray-300 uppercase">
              Terms of Service
            </span>
          </div>

          {/* Hero */}
          <h1 className="text-5xl md:text-7xl lg:text-[90px] font-semibold leading-[0.95] tracking-[-0.05em] mb-10">
            Built for
            <br />

            <span className="bg-gradient-to-r from-indigo-500 via-fuchsia-400 to-pink-500 text-transparent bg-clip-text">
              respectful interaction.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 leading-relaxed max-w-4xl">
            These Terms outline the rules, responsibilities, and expectations
            that help maintain a safe, respectful, and trusted experience
            across the Ontlo platform.
          </p>

          {/* Main Card */}
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl">

            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />

            <div className="relative z-10 p-8 md:p-14 lg:p-16">

              {/* Intro */}
              <div className="max-w-4xl mb-20">
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-light">
                  Ontlo is designed to encourage meaningful social interaction,
                  authentic communication, and respectful discovery experiences.
                  By using Ontlo, users agree to contribute positively to the
                  platform environment and follow all applicable platform rules
                  and community standards.
                </p>
              </div>

              {/* Terms Sections */}
              <div className="space-y-10">
                {termsSections.map((section, index) => (
                  <div
                    key={index}
                    className="
                      relative
                      rounded-3xl
                      border
                      border-white/10
                      bg-black/20
                      p-7
                      md:p-8
                      overflow-hidden
                    "
                  >
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-indigo-500/5 to-fuchsia-500/5" />

                    <div className="relative z-10">
                      <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-5">
                        {section.title}
                      </h2>

                      <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light">
                        {section.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Closing */}
              <div className="mt-20 pt-10 border-t border-white/10">
                <p className="text-2xl md:text-3xl leading-relaxed font-light text-white max-w-4xl">
                  Ontlo exists to create better digital interaction.
                  <br />
                  Respect, trust, and safety are part of that foundation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  )
}

export default TermsOfService