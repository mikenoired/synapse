'use client'


interface EditorRendererProps {
  data: any
}

export function EditorRenderer({ data }: EditorRendererProps) {
  if (!data || !data.blocks) {
    return null
  }

  const renderBlock = (block: any, index: number) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <p
            key={index}
            className="text-foreground leading-relaxed mb-4"
            dangerouslySetInnerHTML={{ __html: block.data.text || '' }}
          />
        )

      case 'header':
        const level = block.data.level || 2
        const headerClasses = {
          2: 'text-2xl font-bold mb-4',
          3: 'text-xl font-bold mb-3',
          4: 'text-lg font-bold mb-3'
        }

        if (level === 2) {
          return (
            <h2
              key={index}
              className={`text-foreground ${headerClasses[2]}`}
              dangerouslySetInnerHTML={{ __html: block.data.text || '' }}
            />
          )
        } else if (level === 3) {
          return (
            <h3
              key={index}
              className={`text-foreground ${headerClasses[3]}`}
              dangerouslySetInnerHTML={{ __html: block.data.text || '' }}
            />
          )
        } else {
          return (
            <h4
              key={index}
              className={`text-foreground ${headerClasses[4]}`}
              dangerouslySetInnerHTML={{ __html: block.data.text || '' }}
            />
          )
        }

      case 'list':
        const isOrdered = block.data.style === 'ordered'
        const listClasses = isOrdered
          ? 'list-decimal list-inside mb-4 space-y-1'
          : 'list-disc list-inside mb-4 space-y-1'

        return isOrdered ? (
          <ol key={index} className={`text-foreground ${listClasses}`}>
            {block.data.items?.map((item: any, itemIndex: number) => {
              // Поддержка как старого формата (строки), так и нового (объекты)
              const content = typeof item === 'string'
                ? item
                : (item && typeof item === 'object' && item.content)
                  ? item.content
                  : ''

              return (
                <li
                  key={itemIndex}
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )
            })}
          </ol>
        ) : (
          <ul key={index} className={`text-foreground ${listClasses}`}>
            {block.data.items?.map((item: any, itemIndex: number) => {
              // Поддержка как старого формата (строки), так и нового (объекты)
              const content = typeof item === 'string'
                ? item
                : (item && typeof item === 'object' && item.content)
                  ? item.content
                  : ''

              return (
                <li
                  key={itemIndex}
                  className="leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )
            })}
          </ul>
        )

      case 'quote':
        return (
          <blockquote key={index} className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
            <p dangerouslySetInnerHTML={{ __html: block.data.text || '' }} />
            {block.data.caption && (
              <cite className="block mt-2 text-sm not-italic">
                — {block.data.caption}
              </cite>
            )}
          </blockquote>
        )

      case 'code':
        return (
          <pre key={index} className="bg-muted p-4 rounded-md text-sm font-mono mb-4 overflow-x-auto">
            <code>{block.data.code || ''}</code>
          </pre>
        )

      case 'delimiter':
        return (
          <div key={index} className="text-center text-muted-foreground text-2xl py-8">
            * * *
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="prose max-w-none">
      {data.blocks.map(renderBlock)}
    </div>
  )
} 