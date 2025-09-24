import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'

export default function ThemingTab() {
  return (
    <Card className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold mb-4">Кастомизация интерфейса</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Палитра (мок)</label>
          <Input value="Default" readOnly />
        </div>
        <div>
          <label className="block mb-1 font-medium">Шрифт (мок)</label>
          <Input value="Inter" readOnly />
        </div>
        <Button className="mt-4 w-full md:w-auto" disabled>Сохранить (мок)</Button>
      </div>
    </Card>
  )
}
