import React from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import useSEO from '../../hooks/useSEO'

const privacySections = [
  {
    title: 'Information We Collect',
    content:
      'Ontlo collects only the information necessary to provide and improve the platform experience. This may include account information, profile details, communication preferences, device information, and platform interaction data.'
  },

  {
    title: 'How Your Information Is Used',
    content:
      'Your information is used to operate the platform, improve safety systems, personalize discovery experiences, protect accounts, and maintain platform integrity. We do not sell personal data to advertisers.'
  },

  {
    title: 'Real-Time Communication',
    content:
      'Video, audio, and messaging systems are designed with privacy and security in mind. Certain moderation and safety systems may process interaction data to help maintain a respectful environment.'
  },

  {
    title: 'Privacy & Safety',
    content:
      'Ontlo implements modern security infrastructure, moderation systems, authentication protections, and user controls to help create a safer digital environment for everyone.'
  },

  {
    title: 'User Control',
    content:
      'Users maintain control over their profile visibility, account settings, and personal information. Users may request account deletion and data export through available platform settings.'
  },

  {
    title: 'Policy Updates',
    content:
      'As Ontlo evolves, this Privacy Policy may be updated to reflect platform improvements, legal requirements, or safety enhancements. Continued use of Ontlo indicates acceptance of any updated policies.'
  }
]

const PrivacyPolicy = () => {
  useSEO({
    title: 'Privacy Policy | Ontlo',
    description: 'Ontlo is designed with a privacy-first philosophy. Discover how we protect your personal data, secure real-time communication, and put you in control of your digital life.',
    keywords: 'Ontlo privacy, data protection, secure messaging, privacy first, user control, account safety, secure social media'
  })

  return (
    <>
    <Navbar />
      <section className="relative min-h-screen overflow-hidden bg-[#04010B] text-white">
        {/* Ambient Background */}
        <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] bg-fuchsia-600/10 blur-[180px] rounded-full pointer-events-none" />
  
        <div className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-indigo-600/10 blur-[160px] rounded-full pointer-events-none" />
  
        {/* Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px] opacity-20 pointer-events-none" />
  
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.025] bg-[url('/noise.png')] pointer-events-none" />
  
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-12 lg:px-20 py-24 md:py-32">
          
          {/* Top Label */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-xl shadow-[0_0_40px_rgba(255,255,255,0.03)] mb-10">
            <span className="text-pink-500 text-lg">✦</span>
  
            <span className="text-[11px] md:text-xs font-semibold tracking-[0.3em] text-gray-300 uppercase">
              Privacy Policy
            </span>
          </div>
  
          {/* Hero */}
          <div className="max-w-5xl mb-20">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[88px] font-semibold leading-[0.95] tracking-[-0.04em] text-white mb-10">
              Privacy built
              <br />
  
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-400 to-indigo-500">
                into the foundation.
              </span>
            </h1>
  
            <p className="text-gray-400 text-lg md:text-2xl leading-relaxed font-light max-w-4xl">
              Ontlo is designed with a privacy-first philosophy. We believe
              meaningful digital interaction can only exist when users feel safe,
              respected, and in control of their information.
            </p>
          </div>
  
          {/* Main Glass Card */}
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl">
            
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
  
            <div className="relative z-10 p-8 md:p-14 lg:p-16">
              
              {/* Intro */}
              <div className="max-w-4xl mb-20">
                <p className="text-gray-300 text-lg md:text-xl leading-relaxed font-light">
                  This Privacy Policy explains how Ontlo collects, uses,
                  protects, and manages user information across the platform,
                  including social discovery features, messaging systems,
                  audio conversations, video communication experiences,
                  and platform safety operations.
                </p>
              </div>
  
              {/* Sections */}
              <div className="space-y-10">
                {privacySections.map((section, index) => (
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
                    <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-fuchsia-500/5 to-indigo-500/5" />
  
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
  
              {/* Bottom Statement */}
              <div className="mt-20 pt-10 border-t border-white/10">
                <p className="text-2xl md:text-3xl leading-relaxed font-light text-white max-w-4xl">
                  Your trust matters.
                  <br />
                  Privacy is not a feature on Ontlo —
                  it is part of the platform itself.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer/>
    </>
  )
}

export default PrivacyPolicy