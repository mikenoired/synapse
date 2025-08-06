import { useEffect, useRef, useState } from "react"

interface CustomVideoPlayerProps {
  src: string
  poster?: string
  autoPlay?: boolean
  className?: string
}

export function CustomVideoPlayer({ src, poster, autoPlay = false, className = "" }: CustomVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  // Play/Pause toggle
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }

  // Update time
  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
  }

  // Update duration
  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
  }

  // Update buffered
  const handleProgress = () => {
    const video = videoRef.current
    if (!video) return
    if (video.buffered.length > 0) {
      setBuffered(video.buffered.end(video.buffered.length - 1))
    }
  }

  // Play/Pause state
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    video.addEventListener("play", onPlay)
    video.addEventListener("pause", onPause)
    return () => {
      video.removeEventListener("play", onPlay)
      video.removeEventListener("pause", onPause)
    }
  }, [])

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    video.currentTime = time
  }

  // Mobile gestures
  let touchStartX = 0
  let touchCurrentX = 0
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX = e.touches[0].clientX
  }
  const handleTouchEnd = () => {
    const diff = touchCurrentX - touchStartX
    if (Math.abs(diff) > 40) {
      // Swipe right: rewind, left: forward
      const video = videoRef.current
      if (!video) return
      if (diff > 0) {
        video.currentTime = Math.max(0, video.currentTime - 10)
      } else {
        video.currentTime = Math.min(duration, video.currentTime + 10)
      }
    }
  }

  // Format time
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className={`relative w-full h-full flex flex-col justify-center items-center bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onClick={togglePlay}
        onTouchStart={isMobile ? handleTouchStart : undefined}
        onTouchMove={isMobile ? handleTouchMove : undefined}
        onTouchEnd={isMobile ? handleTouchEnd : undefined}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        controls={false}
      />
      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-3 bg-gradient-to-t from-black/70 to-transparent">
        {/* Timeline */}
        <div className="relative w-full h-2 flex items-center group">
          <div className="absolute left-0 top-0 h-2 bg-white/30 rounded w-full" />
          <div
            className="absolute left-0 top-0 h-2 bg-white/60 rounded"
            style={{ width: `${(buffered / duration) * 100 || 0}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-transparent appearance-none cursor-pointer z-10"
            style={{
              background: "none"
            }}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => setIsSeeking(false)}
          />
        </div>
        {/* Controls row */}
        <div className="flex items-center justify-between w-full mt-1">
          <button
            onClick={togglePlay}
            className="text-white bg-black/40 rounded p-1 hover:bg-white/20 transition"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" /></svg>
            ) : (
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M7 6v12l10-6-10-6z" fill="currentColor" /></svg>
            )}
          </button>
          <span className="text-xs text-white/80 font-mono select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}