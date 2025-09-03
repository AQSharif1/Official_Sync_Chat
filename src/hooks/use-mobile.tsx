import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsMobile = () => {
      const width = window.innerWidth
      const isMobileDevice = width < MOBILE_BREAKPOINT
      setIsMobile(isMobileDevice)
    }

    // Check immediately
    checkIsMobile()

    // Listen for resize events
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      checkIsMobile()
    }
    
    mql.addEventListener("change", onChange)
    window.addEventListener("resize", checkIsMobile)
    
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("resize", checkIsMobile)
    }
  }, [])

  return !!isMobile
}

export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkIsTablet = () => {
      const width = window.innerWidth
      const isTabletDevice = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT
      setIsTablet(isTabletDevice)
    }

    checkIsTablet()

    const mql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px) and (max-width: ${TABLET_BREAKPOINT - 1}px)`)
    const onChange = () => {
      checkIsTablet()
    }
    
    mql.addEventListener("change", onChange)
    window.addEventListener("resize", checkIsTablet)
    
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("resize", checkIsTablet)
    }
  }, [])

  return !!isTablet
}

export function useDeviceType() {
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  if (isMobile) return 'mobile'
  if (isTablet) return 'tablet'
  return 'desktop'
}
