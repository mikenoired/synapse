import { Button, Input } from '@synapse/ui/components'

export default function ThemingTab() {
  return (
    <div className="p-6 space-y-6 bg-muted">
      <h2 className="text-2xl font-semibold mb-4">Customize interface</h2>
      <div className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Palette (mock)</label>
          <Input value="Default" readOnly />
        </div>
        <div>
          <label className="block mb-1 font-medium">Font (mock)</label>
          <Input value="Non Bureau" readOnly />
        </div>
        <Button className="mt-4 w-full md:w-auto" disabled>Save (mock)</Button>
      </div>
    </div>
  )
}
