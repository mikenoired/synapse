'use client'

import { Button } from '@synapse/ui/components'
import { useState } from 'react'
import { debugSQLite, getFullDatabaseInfo, resetLocalDB } from '@/shared/db/debug'

export function DebugPanel() {
  const [info, setInfo] = useState<any>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'basic' | 'full' | 'query'>('basic')

  const handleDebug = async () => {
    const result = await debugSQLite()
    setInfo(result)
    setIsOpen(true)
  }

  const handleFullInfo = async () => {
    const result = await getFullDatabaseInfo()
    setInfo(result)
    setIsOpen(true)
  }

  const handleReset = async () => {
    // eslint-disable-next-line no-alert
    if (confirm('Are you sure you want to reset the local database? This will delete all local data.')) {
      await resetLocalDB()
      window.location.reload()
    }
  }

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
      >
        🐛 Debug SQLite
      </Button>

      {isOpen && (
        <div className="mt-2 max-w-2xl rounded-lg border bg-card p-4 text-sm shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">SQLite Debug Panel</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex space-x-2">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-3 py-1 rounded text-xs ${activeTab === 'basic' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('full')}
              className={`px-3 py-1 rounded text-xs ${activeTab === 'full' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Full Database
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`px-3 py-1 rounded text-xs ${activeTab === 'query' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Custom Query
            </button>
          </div>

          <div className="space-y-2">
            {activeTab === 'basic' && (
              <>
                <Button onClick={handleDebug} size="sm" className="w-full">
                  📊 Basic Database Info
                </Button>
                <Button onClick={handleReset} size="sm" variant="destructive" className="w-full">
                  🗑️ Reset Database
                </Button>
              </>
            )}

            {activeTab === 'full' && (
              <>
                <Button onClick={handleFullInfo} size="sm" className="w-full">
                  🗄️ Full Database Info
                </Button>
                <Button onClick={handleReset} size="sm" variant="destructive" className="w-full">
                  🗑️ Reset Database
                </Button>
              </>
            )}

            {activeTab === 'query' && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  <p>Use browser console for custom queries:</p>
                  <code className="block rounded bg-muted p-2 mt-1">
                    await queryDatabase('SELECT * FROM content LIMIT 5')
                  </code>
                </div>
              </div>
            )}

            {info && (
              <div className="mt-4 max-h-96 overflow-auto rounded border p-2">
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(info, null, 2)}</pre>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground">
              <p>Available console commands:</p>
              <code className="block rounded bg-muted p-2 mt-1">
                await debugSQLite()
                <br />
                await getFullDatabaseInfo()
                <br />
                await inspectTableData('content', 10)
                <br />
                await queryDatabase('SELECT * FROM content')
                <br />
                await resetLocalDB()
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
