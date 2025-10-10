import { useCallback, useEffect, useRef, useState } from 'react'

function useMouseActivity(delay: number = 500) {
  const [isHovered, setIsHovered] = useState(false)
  const insideRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleOff = useCallback(() => {
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      if (insideRef.current)
        setIsHovered(false)
      timerRef.current = null
    }, delay)
  }, [clearTimer, delay])

  const handleEnter = useCallback(() => {
    insideRef.current = true
    setIsHovered(true)
    scheduleOff()
  }, [scheduleOff])

  const handleMove = useCallback(() => {
    if (!insideRef.current)
      return
    setIsHovered(true)
    scheduleOff()
  }, [scheduleOff])

  const handleLeave = useCallback(() => {
    insideRef.current = false
    setIsHovered(false)
    clearTimer()
  }, [clearTimer])

  const handleClick = useCallback(() => {
    if (!insideRef.current)
      return
    setIsHovered(true)
    scheduleOff()
  }, [scheduleOff])

  useEffect(() => {
    return () => {
      clearTimer()
    }
  }, [clearTimer])

  const bind = {
    onMouseEnter: handleEnter,
    onMouseMove: handleMove,
    onMouseLeave: handleLeave,
    onClick: handleClick,

    onPointerEnter: handleEnter,
    onPointerMove: handleMove,
    onPointerLeave: handleLeave,
    onPointerDown: handleClick,
  }

  return { isHovered, bind }
}

export default useMouseActivity
