import React from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import useSEO from '../../hooks/useSEO'

const termsSections = [
  {
    icon: '✅',
    title: 'Acceptance of Terms',
    content:
      'By creating an account, accessing, or using Ontlo, you agree to these Terms of Service and all applicable laws, regulations, and platform policies.'
  },
  {
    icon: '👤',
    title: 'Eligibility',
    content:
      'You must be at least 18 years old to use Ontlo. By using the platform, you confirm that you meet all eligibility requirements and can legally enter into this agreement.'
  },
  {
    icon: '🔐',
    title: 'Account Responsibility',
    content:
      'You are responsible for maintaining the security of your account credentials and all activities that occur under your account.'
  },
  {
    icon: '🤝',
    title: 'Respectful Conduct',
    content:
      'Users must treat others with respect and may not engage in harassment, hate speech, threats, exploitation, impersonation, or abusive behavior.'
  },
  {
    icon: '🚫',
    title: 'Prohibited Activities',
    content:
      'You may not use Ontlo for illegal activities, spam, fraud, malware distribution, unauthorized data collection, or any activity that harms users or platform integrity.'
  },
  {
    icon: '💬',
    title: 'Content & Communication',
    content:
      'Users retain ownership of their content while granting Ontlo the limited rights necessary to operate, display, moderate, and improve platform functionality.'
  },
  {
    icon: '🛡️',
    title: 'Safety & Moderation',
    content:
      'Ontlo may investigate reports, moderate content, remove material, suspend accounts, or restrict platform access when necessary to maintain community safety.'
  },
  {
    icon: '📹',
    title: 'Real-Time Communication',
    content:
      'Audio, video, and messaging services are provided for legitimate social interaction. Abuse of communication systems may result in account restrictions.'
  },
  {
    icon: '⚠️',
    title: 'Platform Availability',
    content:
      'While we strive for reliability, Ontlo does not guarantee uninterrupted service availability and may perform maintenance, upgrades, or emergency interventions.'
  },
  {
    icon: '📦',
    title: 'Data & Privacy',
    content:
      'Your use of Ontlo is also governed by our Privacy Policy, which explains how information is collected, processed, protected, and managed.'
  },
  {
    icon: '🗑️',
    title: 'Account Termination',
    content:
      'Users may delete their accounts at any time. Ontlo may suspend, restrict, or terminate accounts that violate these Terms or compromise platform safety.'
  },
  {
    icon: '⚖️',
    title: 'Limitation of Liability',
    content:
      'Ontlo is provided on an as-is basis. To the maximum extent permitted by law, Ontlo shall not be liable for indirect, incidental, or consequential damages arising from platform use.'
  },
  {
    icon: '📢',
    title: 'Changes to Terms',
    content:
      'We may update these Terms periodically to reflect legal requirements, platform improvements, or operational changes. Continued use of Ontlo indicates acceptance of updated Terms.'
  },
  {
    icon: '📧',
    title: 'Contact Information',
    content:
      'Questions regarding these Terms may be directed to Ontlo through the official support and contact channels available on the platform.'
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

        {/* Noise */}
        {/* <div className="absolute inset-0 opacity-[0.025] bg-[url('/noise.png')] pointer-events-none" /> */}

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