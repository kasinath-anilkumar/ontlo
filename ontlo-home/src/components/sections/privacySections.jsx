import React from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import useSEO from '../../hooks/useSEO'

const privacySections = [
  {
    icon: '🔐',
    title: 'Information We Collect',
    content:
      'We collect information you provide when creating and using your Ontlo account, including profile details, interests, profile photos, posts, messages, account settings, and other information necessary to provide platform functionality.'
  },
  {
    icon: '🛡️',
    title: 'Privacy By Design',
    content:
      'Privacy is built into Ontlo from the beginning. We minimize unnecessary data collection, prioritize user control, and design experiences that respect personal boundaries and digital wellbeing.'
  },
  {
    icon: '💬',
    title: 'Messaging & Communication',
    content:
      'Messages and interactions are processed only to deliver platform functionality, investigate abuse reports, maintain security, and ensure reliable communication services.'
  },
  {
    icon: '📹',
    title: 'Video & Audio Sessions',
    content:
      'Ontlo uses real-time communication technologies to support audio and video interactions. Technical session information may be processed to establish connections and maintain service quality.'
  },
  {
    icon: '📍',
    title: 'Location Information',
    content:
      'Location preferences help improve discovery experiences and connect users with relevant communities. Users maintain control over visibility and sharing preferences.'
  },
  {
    icon: '🤖',
    title: 'Safety & Moderation',
    content:
      'Automated systems, moderation tools, and user reports help us prevent abuse, investigate violations, and maintain a respectful environment across the platform.'
  },
  {
    icon: '☁️',
    title: 'Media Storage',
    content:
      'Uploaded media such as profile photos and posts may be securely processed and stored using trusted cloud infrastructure providers.'
  },
  {
    icon: '📦',
    title: 'Data Portability',
    content:
      'Users may request a copy of their account information and personal data through available platform controls.'
  },
  {
    icon: '🗑️',
    title: 'Account Deletion',
    content:
      'Users can permanently delete their account and associated data. Requests are processed according to legal and operational requirements.'
  },
  {
    icon: '🇮🇳',
    title: 'DPDP Act Compliance',
    content:
      'Ontlo supports user rights under India’s Digital Personal Data Protection Act, 2023, including access, correction, deletion, and grievance redressal rights.'
  }
]

const PrivacyPolicy = () => {
  useSEO({
    title: 'Privacy Policy | Ontlo',
    description:
      'Learn how Ontlo protects your information, supports user control, and delivers a privacy-first social experience.',
    keywords:
      'Ontlo privacy policy, user privacy, data protection, DPDP Act, secure messaging, privacy first social network'
  })

  return (
    <>
      <Navbar />

      <section className="relative min-h-screen overflow-hidden bg-[#04010B] text-white">
        {/* Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-fuchsia-600/10 blur-[220px] rounded-full" />

        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-indigo-600/10 blur-[180px] rounded-full" />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:70px_70px]" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-24">
          {/* Label */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-xl mb-12">
            <span className="text-pink-500">✦</span>

            <span className="text-xs tracking-[0.3em] uppercase text-gray-300">
              Privacy Policy
            </span>
          </div>

          {/* Hero */}
          <div className="max-w-5xl mb-24">
            <h1 className="text-5xl md:text-7xl lg:text-[90px] font-semibold leading-[0.95] tracking-[-0.05em] mb-10">
              Privacy built
              <br />

              <span className="bg-gradient-to-r from-pink-500 via-fuchsia-400 to-indigo-500 text-transparent bg-clip-text">
                into everything.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-400 leading-relaxed max-w-4xl">
              We believe meaningful connections can only exist when people
              feel safe, respected, and fully in control of their personal
              information.
            </p>
          </div>

          {/* Stats */}
          {/* <div className="grid md:grid-cols-4 gap-6 mb-24">
            {[
              {
                value: '100%',
                label: 'User Controlled'
              },
              // {
              //   value: 'DPDP',
              //   label: 'Compliance Ready'
              // },
              {
                value: '24/7',
                label: 'Safety Systems'
              },
              {
                value: 'Privacy',
                label: 'By Design'
              }
            ].map((item, index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8"
              >
                <h3 className="text-4xl font-bold mb-3">
                  {item.value}
                </h3>

                <p className="text-gray-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div> */}

          {/* Timeline Sections */}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-pink-500 via-fuchsia-500/30 to-transparent" />

            <div className="space-y-8">
              {privacySections.map((section, index) => (
                <div
                  key={index}
                  className="relative pl-20 group"
                >
                  <div className="absolute left-0 top-2 w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 border border-pink-500/20 flex items-center justify-center text-xl backdrop-blur-xl group-hover:scale-110 transition-all duration-500">
                    {section.icon}
                  </div>

                  <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 hover:border-pink-500/20 transition-all duration-500">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-pink-500/5 to-fuchsia-500/5" />

                    <div className="relative z-10">
                      <h2 className="text-2xl md:text-3xl font-semibold mb-4">
                        {section.title}
                      </h2>

                      <p className="text-gray-400 text-lg leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-32 rounded-[40px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.02] backdrop-blur-2xl p-12 md:p-16">
            <h2 className="text-4xl md:text-5xl font-semibold mb-8">
              Your trust matters.
            </h2>

            <p className="text-gray-400 text-xl leading-relaxed max-w-4xl">
              Privacy is not a feature on Ontlo. It is a fundamental
              principle that guides how we build products, design
              experiences, and protect our community.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}

export default PrivacyPolicy

