import React, { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import useSEO from '../hooks/useSEO'
import Navbar from '../components/layout/Navbar'
import HeroSection from '../components/hero/HeroSection'
import AboutSection from '../components/sections/AboutSection'
import FeaturesSection from '../components/sections/FeaturesSection'
import SafetySection from '../components/sections/SafetySection'
// import ContactSection from '../components/sections/ContactSection'
import Footer from '../components/layout/Footer'

const safeScrollToTop = () => {
  try {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (_error) {
    window.scrollTo(0, 0)
  }
}

const safeScrollIntoView = (element) => {
  try {
    element.scrollIntoView({ behavior: 'smooth' })
  } catch (_error) {
    element.scrollIntoView()
  }
}

const Home = () => {
  const location = useLocation()

  useSEO({
    title: 'Ontlo | Social Media, Rebuilt From the Ground Up',
    description: 'The internet became obsessed with being noticed. Ontlo is built around being remembered. Discover a new social platform designed for meaningful connections, authentic conversations, and experiences that last.',
    keywords: 'Ontlo, social media, social networking, meaningful connections, authentic relationships, online community, messaging platform, digital communication, social platform, future of social media, built around being remembered'
  })

  useEffect(() => {
    let id = ''
    if (location.hash) {
      id = location.hash.substring(1)
    } else if (location.pathname && location.pathname !== '/') {
      id = location.pathname.substring(1)
    }
    
    if (id) {
      const element = document.getElementById(id)
      if (element) {
        // Use a slight timeout to ensure components have fully mounted
        const timer = setTimeout(() => {
          safeScrollIntoView(element)
        }, 150)
        return () => clearTimeout(timer)
      }
    } else {
      safeScrollToTop()
    }
  }, [location])

  return (
    <>
      <Navbar />
      <div id="home">
        <HeroSection />
      </div>
      <AboutSection />
      <FeaturesSection />
      <SafetySection />
      {/* <ContactSection /> */}
      <Footer />
    </>
  )
}

export default Home
