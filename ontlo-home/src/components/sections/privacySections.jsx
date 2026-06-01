import React from 'react'
import Navbar from '../layout/Navbar'
import Footer from '../layout/Footer'
import useSEO from '../../hooks/useSEO'

const privacySections = [
  {
    icon: '🇮🇳',
    title: 'DPDP Act Compliance & Data Fiduciary',
    content:
      'In accordance with India\'s Digital Personal Data Protection (DPDP) Act, 2023, Ontlo acts as the "Data Fiduciary" for the personal data collected on the platform. The user acts as the "Data Principal" with corresponding legal rights, obligations, and duties.'
  },
  {
    icon: '🔍',
    title: 'Information We Collect',
    content:
      'We collect personal data that you voluntarily provide to construct your profile, including your name, email address, optional phone number, profile photo, bio, interest tags, and user-generated posts. We also collect technical session identifiers to support platform functionality.'
  },
  {
    icon: '⚖️',
    title: 'Legal Basis & Purpose of Processing',
    content:
      'We process your digital personal data solely based on your explicit, specific, and unconditional consent. The processing is done to enable social discovery, user connections, community building, communication features, and to prevent spam or fraudulent activity on the platform.'
  },
  {
    icon: '🛡️',
    title: 'Your Rights as a Data Principal',
    content:
      'Under the DPDP Act, 2023, you have the right to request (1) a summary of your personal data being processed, (2) correction, completion, or updating of your data, (3) erasure of data that is no longer required for processing, and (4) the right to nominate someone else to manage your data in case of death or incapacity.'
  },
  {
    icon: '❌',
    title: 'Consent Withdrawal & Erasure',
    content:
      'You have the right to withdraw your consent to data processing at any time. If you withdraw consent or delete your account, we will erase your personal data from our servers and instruct our data processors to do the same, unless retention is mandated under Indian laws (e.g., IT Act, CERT-In guidelines).'
  },
  {
    icon: '💬',
    title: 'Real-time Messaging & Call Metadata',
    content:
      'Ontlo provides real-time messaging, audio, and video sessions. We process metadata (such as timestamps and connection logs) to establish and maintain calls. Real-time media streams are encrypted and are not recorded or stored on our servers unless explicitly requested by the users.'
  },
  {
    icon: '🏢',
    title: 'Intermediary Data Sharing',
    content:
      'We do not sell your personal data. Data is shared only with trusted infrastructure providers (Data Processors) under strict data protection agreements. We may share information with law enforcement agencies if required by a valid legal order under Section 69 of the Information Technology Act, 2000.'
  },
  {
    icon: '👨‍💼',
    title: 'Grievance Officer Details',
    content:
      'If you have any queries, complaints, or wish to exercise your rights under the DPDP Act, you can contact our Grievance Officer, Kasinath Anilkumar, at ontlo.app@gmail.com. In line with the IT Rules, 2021, we acknowledge grievances within 24 hours and resolve them within 15 days.'
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

