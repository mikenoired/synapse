export default function AiTab() {
  const used = 12000
  const quota = 20000
  const percent = Math.round((used / quota) * 100)

  return (
    <div className="p-6 space-y-6 bg-muted">
      <h2 className="text-2xl font-semibold mb-4">AI stats</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Used tokens in current month</span>
          <span className="font-bold">{used.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Quote</span>
          <span className="font-bold">{quota.toLocaleString()}</span>
        </div>
        <div className="w-full bg-muted h-3 rounded-full overflow-hidden mt-2">
          <div className="bg-primary h-full" style={{ width: `${percent}%` }} />
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {percent}
          % used
        </div>
      </div>
    </div>
  )
}
