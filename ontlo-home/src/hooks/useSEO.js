import { useEffect } from 'react'

const useSEO = ({ title, description, keywords }) => {
  useEffect(() => {
    if (title) {
      document.title = title
    }
    
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]')
      if (metaDescription) {
        metaDescription.setAttribute('content', description)
      }
    }
    
    if (keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]')
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords)
      }
    }

    // Dynamically update the canonical URL to match the current path
    const canonicalLink = document.querySelector('link[rel="canonical"]')
    if (canonicalLink) {
      // Strip trailing slash if present for consistency, except for root
      const pathname = window.location.pathname === '/' ? '' : window.location.pathname
      canonicalLink.setAttribute('href', `https://www.ontlo.in${pathname}`)
    }
  }, [title, description, keywords])
}

export default useSEO
