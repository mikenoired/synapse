'use client'

import type { ParsedLinkData } from '../../model/types'
import { Button, Input } from '@synapse/ui/components'
import { Clock, ExternalLink, Globe, X } from 'lucide-react'

interface LinkPreviewProps {
  content: string
  parsedLinkData: ParsedLinkData | null
  linkParsing: boolean
  isLoading: boolean
  onContentChange: (content: string) => void
  onParseLink: (url: string) => void
  onClearParsedData: () => void
}

export function LinkPreview({
  content,
  parsedLinkData,
  linkParsing,
  isLoading,
  onContentChange,
  onParseLink,
  onClearParsedData,
}: LinkPreviewProps) {
  return (
    <div className="space-y-2">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            id="content"
            type="url"
            placeholder="https://example.com"
            value={content}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onContentChange(e.target.value)}
            required
            disabled={isLoading || linkParsing}
          />
          <Button
            type="button"
            onClick={() => onParseLink(content)}
            disabled={!content.trim() || linkParsing || isLoading}
            size="sm"
            className="min-w-24"
          >
            {linkParsing
              ? (
                  <Clock className="w-4 h-4 animate-spin" />
                )
              : (
                  <>
                    <Globe className="w-4 h-4 mr-1" />
                    Parse
                  </>
                )}
          </Button>
        </div>

        {parsedLinkData && (
          <div className="border p-4 bg-muted/20 space-y-3">
            <div className="flex items-start gap-3">
              {parsedLinkData.metadata.favicon && (
                <img
                  src={parsedLinkData.metadata.favicon}
                  alt=""
                  className="w-4 h-4 mt-1 flex-shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight mb-1">
                  {parsedLinkData.title}
                </h3>
                {parsedLinkData.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {parsedLinkData.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  {parsedLinkData.metadata.siteName && (
                    <span>{parsedLinkData.metadata.siteName}</span>
                  )}
                  {parsedLinkData.metadata.author && (
                    <span>
                      • by
                      {parsedLinkData.metadata.author}
                    </span>
                  )}
                  {parsedLinkData.metadata.publishedTime && (
                    <span>
                      •
                      {new Date(parsedLinkData.metadata.publishedTime).toLocaleDateString()}
                    </span>
                  )}
                  <span>
                    •
                    {parsedLinkData.metadata.contentBlocks}
                    {' '}
                    blocks
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearParsedData}
                className="p-1 h-auto"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>

            {parsedLinkData.metadata.image && (
              <div className="relative">
                <img
                  src={parsedLinkData.metadata.image}
                  alt=""
                  className="w-full h-32 object-cover rounded border"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}

            {parsedLinkData.rawText && (
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded border">
                <div className="font-medium mb-1">Parsed content:</div>
                <p className="line-clamp-3">
                  {parsedLinkData.rawText.substring(0, 200)}
                  {parsedLinkData.rawText.length > 200 ? '...' : ''}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t">
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-mono truncate">
                {content}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
