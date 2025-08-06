import { cn } from '@/shared/lib/utils';
import { Card } from '@/shared/ui/card';

export default function MediaTab() {
  const totalSpace = 1000; // GB
  const usedSpace = 900; // GB
  const freeSpace = totalSpace - usedSpace;
  const totalFiles = 45672;
  const usagePercentage = (usedSpace / totalSpace) * 100;

  const formatSize = (sizeInGB: number) => {
    if (sizeInGB >= 1000) {
      return `${(sizeInGB / 1000).toFixed(1)} TB`;
    }
    return `${sizeInGB} GB`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Storage Usage</h2>
        <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded">
          {usagePercentage.toFixed(1)}% used
        </span>
      </div>
      <div className='flex flex-row items-center justify-between gap-4'>
        <div className="flex justify-center w-full max-w-[220px] mx-auto">
          <svg
            viewBox="0 0 140 180"
            width="100%"
            height="auto"
            style={{ maxWidth: 220, display: 'block' }}
          >
            <defs>
              {/* Drop shadow for cylinder */}
              <filter id="cylinderShadow" x="-20%" y="80%" width="140%" height="30%">
                <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="var(--muted-foreground)" floodOpacity="0.25" />
              </filter>
              {/* Cylinder body gradient */}
              <linearGradient id="cylinderBody" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--muted)" />
                <stop offset="100%" stopColor="var(--background)" />
              </linearGradient>
              {/* Fill gradient (liquid) */}
              <linearGradient id="cylinderFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.55" />
              </linearGradient>
              {/* Top ellipse gradient */}
              <radialGradient id="cylinderTop" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="var(--muted)" stopOpacity="1" />
              </radialGradient>
              {/* Bottom ellipse gradient for fill */}
              <radialGradient id="cylinderBottomFill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.7" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.3" />
              </radialGradient>
              {/* Highlight for top ellipse */}
              <radialGradient id="topHighlight" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
                <stop offset="80%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              {/* Inner shadow for body */}
              <linearGradient id="innerShadow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#000" stopOpacity="0.10" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
              </linearGradient>
            </defs>

            {/* Drop shadow */}
            <ellipse
              cx="70"
              cy="172"
              rx="56"
              ry="14"
              fill="var(--muted-foreground)"
              opacity="0.18"
              filter="url(#cylinderShadow)"
            />

            {/* Cylinder body */}
            <rect x="18" y="24" width="104" height="132" rx="28" ry="28" fill="url(#cylinderBody)" />
            {/* Inner shadow (simulate with semi-transparent overlay) */}
            <rect x="18" y="24" width="104" height="132" rx="28" ry="28" fill="url(#innerShadow)" style={{ pointerEvents: 'none' }} />

            {/* Usage fill (liquid) */}
            <g style={{ transition: 'all 0.7s cubic-bezier(.4,0,.2,1)' }}>
              <clipPath id="cylinderClip">
                <rect x="18" y="24" width="104" height="132" rx="28" ry="28" />
              </clipPath>
              <rect
                x="18"
                y={156 - (132 * usagePercentage / 100)}
                width="104"
                height={132 * usagePercentage / 100}
                fill="url(#cylinderFill)"
                clipPath="url(#cylinderClip)"
                style={{ transition: 'all 0.7s cubic-bezier(.4,0,.2,1)' }}
              />
            </g>
            <rect x="18" y="24" width="104" height="132" rx="28" ry="28" fill="none" stroke="var(--border)" strokeWidth="2" />
          </svg>
        </div>

        <div className="space-y-4 flex-1">
          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Used Space</span>
            <div className='h-px w-full bg-border flex-1'></div>
            <span className="font-semibold text-foreground">
              {formatSize(usedSpace)} / {formatSize(totalSpace)}
            </span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Free Space</span>
            <div className='h-px w-full bg-border flex-1'></div>
            <span className="font-semibold text-green-600">
              {formatSize(freeSpace)}
            </span>
          </div>

          <div className="flex justify-between items-center gap-2">
            <span className="text-muted-foreground">Total Files</span>
            <div className='h-px w-full bg-border flex-1'></div>
            <span className="font-semibold text-foreground">
              {formatNumber(totalFiles)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function Progress({ value, className }: { value: number, className?: string }) {
  return (
    <div className={cn('relative w-full bg-gray-200 rounded-full h-2', className)}>
      <div className="absolute inset-0 bg-blue-500 rounded-full" style={{ width: `${value}%` }} />
    </div>
  )
}