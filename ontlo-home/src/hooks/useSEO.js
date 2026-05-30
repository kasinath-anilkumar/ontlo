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
  }, [title, description, keywords])
}

export default useSEO
