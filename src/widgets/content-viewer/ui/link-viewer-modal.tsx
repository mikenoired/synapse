'use client'

import type { Content, LinkContent } from '@/shared/lib/schemas'
import { Calendar, Clock, ExternalLink, FileText, Globe, Image as ImageIcon, Pencil, Trash2, User, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { calculateReadingTimeFromLinkContent, parseLinkContent } from '@/shared/lib/schemas'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import Modal from '@/shared/ui/modal'
import proseClasses from '@/shared/ui/prose-classes'

function StructuredContentRenderer({ content }: { content: any }) {
  if (!content?.content)
    return null

  return (
    <article className={cn('max-w-none', proseClasses)}>
      {content.content.map((block: any, index: number) => {
        switch (block.type) {
          case 'heading': {
            const level = Math.min(block.attrs?.level || 1, 6)
            const headingClasses = {
              1: 'text-3xl font-bold mb-6 mt-8 first:mt-0 text-foreground',
              2: 'text-2xl font-semibold mb-4 mt-6 text-foreground',
              3: 'text-xl font-semibold mb-3 mt-5 text-foreground',
              4: 'text-lg font-semibold mb-3 mt-4 text-foreground',
              5: 'text-base font-semibold mb-2 mt-3 text-foreground',
              6: 'text-sm font-semibold mb-2 mt-3 text-foreground',
            }

            switch (level) {
              case 1: return <h1 key={index} className={headingClasses[1]}>{block.content}</h1>
              case 2: return <h2 key={index} className={headingClasses[2]}>{block.content}</h2>
              case 3: return <h3 key={index} className={headingClasses[3]}>{block.content}</h3>
              case 4: return <h4 key={index} className={headingClasses[4]}>{block.content}</h4>
              case 5: return <h5 key={index} className={headingClasses[5]}>{block.content}</h5>
              case 6: return <h6 key={index} className={headingClasses[6]}>{block.content}</h6>
              default: return <h2 key={index} className={headingClasses[2]}>{block.content}</h2>
            }
          }

          case 'paragraph':
            return (
              <p key={index} className="mb-4 leading-7 text-foreground/90">
                {block.content}
              </p>
            )

          case 'image':
            return (
              <figure key={index} className="my-6 space-y-2">
                <img
                  src={block.attrs?.src}
                  alt={block.attrs?.alt || ''}
                  className="w-full h-auto rounded-lg border border-border shadow-sm"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
                {block.attrs?.alt && (
                  <figcaption className="text-sm text-muted-foreground text-center italic">
                    {block.attrs.alt}
                  </figcaption>
                )}
              </figure>
            )

          case 'quote':
            return (
              <blockquote key={index} className="border-l-4 border-primary bg-muted/50 px-4 py-3 my-5 rounded-r-md">
                <p className="italic text-foreground/80 mb-0">
                  {block.content}
                </p>
              </blockquote>
            )

          case 'code':
            return (
              <pre key={index} className="bg-muted border border-border p-4 rounded-lg font-mono text-sm overflow-x-auto my-5">
                <code className="text-foreground">{block.content}</code>
              </pre>
            )

          case 'list': {
            const items = block.content?.split('\n').filter((item: string) => item.trim())
            const isOrdered = block.attrs?.listType === 'ordered'

            return isOrdered
              ? (
                  <ol key={index} className="my-4 space-y-2 list-decimal list-inside">
                    {items?.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="text-foreground/90 leading-7">
                        {item.trim()}
                      </li>
                    ))}
                  </ol>
                )
              : (
                  <ul key={index} className="my-4 space-y-2 list-disc list-inside">
                    {items?.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="text-foreground/90 leading-7">
                        {item.trim()}
                      </li>
                    ))}
                  </ul>
                )
          }

          case 'divider':
            return (
              <hr key={index} className="my-8 border-border" />
            )

          default:
            return null
        }
      })}
    </article>
  )
}

interface LinkViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: Content
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
}

export function LinkViewerModal({
  open,
  onOpenChange,
  item,
  onEdit,
  onDelete,
}: LinkViewerModalProps) {
  const [isHovered, setIsHovered] = useState(false)
  const router = useRouter()

  const linkContent: LinkContent | null = item.type === 'link'
    ? parseLinkContent(item.content)
    : null

  const handleEdit = () => {
    if (onEdit) {
      onEdit(item.id)
      onOpenChange(false)
    }
    else {
      router.push(`/edit/${item.id}`)
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    if (onDelete) {
      // eslint-disable-next-line no-alert
      if (confirm('Are you sure that you want to delete?')) {
        onDelete(item.id)
        onOpenChange(false)
      }
    }
  }

  const handleOpenLink = () => {
    const url = linkContent?.url || item.content || item.url
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <div
        className="relative w-full h-full flex flex-col"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-10 p-2 bg-background/80 hover:bg-muted rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </motion.button>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
            <div className="p-6 pb-4 space-y-4">
              {linkContent && (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {linkContent.metadata.favicon && (
                      <img
                        src={linkContent.metadata.favicon}
                        alt=""
                        className="w-5 h-5 rounded-sm flex-shrink-0"
                        onError={e => e.currentTarget.style.display = 'none'}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {linkContent.metadata.siteName || new URL(linkContent.url).hostname}
                        </span>
                      </div>
                      {linkContent.metadata.author && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{linkContent.metadata.author}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenLink}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Open
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-foreground">
                  {linkContent?.title || item.title || 'No title'}
                </h1>
                {/* {linkContent?.description && (
                  <p className="text-muted-foreground leading-relaxed">
                    {linkContent.description}
                  </p>
                )} */}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {linkContent?.metadata.publishedTime && (
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>
                      Uploaded:
                      {new Date(linkContent.metadata.publishedTime).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {linkContent && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      ~
                      {calculateReadingTimeFromLinkContent(linkContent)}
                      {' '}
                      read
                    </span>
                  </div>
                )}
              </div>

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs px-2 py-1 bg-muted/60 hover:bg-muted"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            {linkContent
              ? (
                  <div className="pb-6">
                    {linkContent.metadata.image && (
                      <div className="relative w-full mb-8">
                        <img
                          src={linkContent.metadata.image}
                          alt={linkContent.title || 'Article image'}
                          className="w-full h-64 md:h-80 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
                      </div>
                    )}

                    <div className="px-6 max-w-none">
                      <StructuredContentRenderer content={linkContent.content} />
                    </div>

                    {linkContent.metadata.images && linkContent.metadata.images.length > 1 && (
                      <div className="px-6 mt-8 space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" />
                          Extra images
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {linkContent.metadata.images.slice(1).map((img, index) => (
                            <img
                              key={index}
                              src={img}
                              alt={`Additional image ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-border"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              : (
                  <div className="flex items-center justify-center py-8 px-6">
                    <div className="text-center space-y-6 max-w-md">
                      <div className="p-6 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <ExternalLink className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-sm text-muted-foreground">
                            External link
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-mono text-left break-all bg-muted/50 p-3 rounded">
                            {item.content}
                          </p>

                          <Button
                            onClick={handleOpenLink}
                            className="w-full"
                            size="lg"
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open link
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Link was saved in old format.
                        Edit for another parse.
                      </div>
                    </div>
                  </div>
                )}
          </div>

          <div className="flex-shrink-0">
            <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0.8 }}
                className="flex gap-2 justify-center p-4"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEdit}
                  className="text-xs hover:bg-muted"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDelete}
                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
