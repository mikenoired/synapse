import { Card } from '@/shared/ui/card'

export default function AiTab() {
  const used = 12000
  const quota = 20000
  const percent = Math.round((used / quota) * 100)

  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">AI статистика</h2>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Потрачено токенов в этом месяце</span>
          <span className="font-bold">{used.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Квота</span>
          <span className="font-bold">{quota.toLocaleString()}</span>
        </div>
        <div className="w-full bg-muted h-3 rounded-full overflow-hidden mt-2">
          <div className="bg-primary h-full" style={{ width: `${percent}%` }} />
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {percent}
          % использовано
        </div>
      </div>
    </Card>
  )
}
