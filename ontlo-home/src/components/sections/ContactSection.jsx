import React from 'react'

const ContactSection = () => {
  return (
    <section id="contact" className="relative w-full py-12 md:py-16 overflow-hidden border-t border-white/5">
      {/* Background glow effects */}
      <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-indigo-600/5 blur-[140px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-8xl
                    mx-auto
                    px-4
                    md:px-16
                    lg:px-18 text-center">
        <div className="max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest text-gray-300 mb-8 uppercase shadow-[0_0_15px_rgba(255,255,255,0.05)] backdrop-blur-sm">
            <span className="text-pink-500 text-4xl leading-none">✦</span> <span className='text-xl md:text-2xl'>CONTACT US</span> 
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Let's <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">talk.</span>
          </h2>
          
          <p className="text-gray-400 text-lg mb-12">
            Have questions about our launch? Want to partner with us? We'd love to hear from you.
          </p>
        </div>
        
        <div className="max-w-xl mx-auto">
          <form 
            className="text-left space-y-6 bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl hover:border-indigo-500/20 transition-all duration-300" 
            onSubmit={(e) => e.preventDefault()}
          >
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
            <input 
              type="text" 
              className="w-full bg-[#05010E]/80 border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors" 
              placeholder="John Doe" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
            <input 
              type="email" 
              className="w-full bg-[#05010E]/80 border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors" 
              placeholder="john@example.com" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Message</label>
            <textarea 
              rows="4" 
              className="w-full bg-[#05010E]/80 border border-gray-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors" 
              placeholder="How can we help?"
            ></textarea>
          </div>
          
          <button className="w-full bg-gradient-to-r from-pink-500 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
            Send Message
          </button>
        </form>
      </div>
      </div>
    </section>
  )
}

export default ContactSection
