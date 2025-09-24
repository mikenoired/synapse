import type { NextRequest } from 'next/server'
import type { LinkContent } from '@/shared/lib/schemas'
import { JSDOM } from 'jsdom'
import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/shared/api/supabase-client'

interface ContentBlock {
  type: 'paragraph' | 'heading' | 'image' | 'list' | 'quote' | 'code' | 'divider'
  content?: string
  attrs?: Record<string, any>
  marks?: Array<{
    type: string
    attrs?: Record<string, any>
  }>
}

interface StructuredContent {
  type: 'doc'
  content: ContentBlock[]
}

interface MetaData {
  title?: string
  description?: string
  image?: string
  siteName?: string
  author?: string
  publishedTime?: string
}

function extractMetaTags(document: Document): MetaData {
  const meta: MetaData = {}

  const metaTags = document.querySelectorAll('meta')
  metaTags.forEach((tag) => {
    const property = tag.getAttribute('property')
    const name = tag.getAttribute('name')
    const content = tag.getAttribute('content')

    if (!content)
      return

    // Open Graph tags
    const propertyMap: Record<string, keyof MetaData> = {
      'og:title': 'title',
      'og:description': 'description',
      'og:image': 'image',
      'og:site_name': 'siteName',
      'og:author': 'author',
      'article:published_time': 'publishedTime',
    }

    if (property && propertyMap[property]) {
      meta[propertyMap[property]] = content
    }

    // Twitter Card tags
    if (name === 'twitter:title' && !meta.title)
      meta.title = content
    if (name === 'twitter:description' && !meta.description)
      meta.description = content
    if (name === 'twitter:image' && !meta.image)
      meta.image = content

    // // Standard meta tags
    if (name === 'description' && !meta.description)
      meta.description = content
    if (name === 'author' && !meta.author)
      meta.author = content
  })

  return meta
}

function convertHtmlToStructuredContent(document: Document): StructuredContent {
  const selectors = [
    'article',
    '[role="main"]',
    'main',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '.story-body',
    '.post-body',
  ]

  let contentContainer: Element | null = null

  // Найти основной контейнер контента
  for (const selector of selectors) {
    const element = document.querySelector(selector)
    if (element) {
      contentContainer = element
      break
    }
  }

  // Если не нашли контейнер, используем все параграфы
  if (!contentContainer) {
    contentContainer = document.body
  }

  const blocks: ContentBlock[] = []
  const allImages: string[] = []

  function processElement(element: Element): void {
    const tagName = element.tagName.toLowerCase()

    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const level = Number.parseInt(tagName.charAt(1))
        const text = element.textContent?.trim()
        if (text) {
          blocks.push({
            type: 'heading',
            content: text,
            attrs: { level },
          })
        }
        break
      }

      case 'p': {
        const pText = element.textContent?.trim()
        if (pText && pText.length > 10) { // Игнорируем очень короткие параграфы
          blocks.push({
            type: 'paragraph',
            content: pText,
          })
        }
        break
      }

      case 'img': {
        const src = element.getAttribute('src')
        const alt = element.getAttribute('alt') || ''
        if (src) {
          try {
            const absoluteUrl = new URL(src, document.location.href).href
            allImages.push(absoluteUrl)
            blocks.push({
              type: 'image',
              attrs: {
                src: absoluteUrl,
                alt,
                title: element.getAttribute('title') || alt,
              },
            })
          }
          catch {
            // Игнорируем некорректные URL
          }
        }
        break
      }

      case 'blockquote': {
        const quoteText = element.textContent?.trim()
        if (quoteText) {
          blocks.push({
            type: 'quote',
            content: quoteText,
          })
        }
        break
      }

      case 'pre':
      case 'code': {
        const codeText = element.textContent?.trim()
        if (codeText) {
          blocks.push({
            type: 'code',
            content: codeText,
            attrs: {
              language: element.getAttribute('class')?.match(/language-(\w+)/)?.[1] || 'text',
            },
          })
        }
        break
      }

      case 'ul':
      case 'ol': {
        const listItems = Array.from(element.querySelectorAll('li'))
          .map(li => li.textContent?.trim())
          .filter(text => text)

        if (listItems.length > 0) {
          blocks.push({
            type: 'list',
            content: listItems.join('\n'),
            attrs: {
              listType: tagName === 'ul' ? 'bullet' : 'ordered',
            },
          })
        }
        break
      }

      case 'hr':
        blocks.push({
          type: 'divider',
        })
        break

      default:
        // Рекурсивно обрабатываем дочерние элементы
        Array.from(element.children).forEach(processElement)
        break
    }
  }

  // Обрабатываем все элементы в контейнере
  Array.from(contentContainer.children).forEach(processElement)

  return {
    type: 'doc',
    content: blocks.length > 0
      ? blocks
      : [{
          type: 'paragraph',
          content: 'Не удалось извлечь содержимое статьи',
        }],
  }
}

function extractTextFromStructuredContent(content: StructuredContent): string {
  return content.content
    .map(block => block.content || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractFavicon(document: Document, baseUrl: string): string | undefined {
  const iconSelectors = [
    'link[rel="icon"]',
    'link[rel="shortcut icon"]',
    'link[rel="apple-touch-icon"]',
  ]

  for (const selector of iconSelectors) {
    const icon = document.querySelector(selector) as HTMLLinkElement
    if (icon?.href) {
      try {
        return new URL(icon.href, baseUrl).href
      }
      catch {
        continue
      }
    }
  }

  try {
    return new URL('/favicon.ico', baseUrl).href
  }
  catch {
    return undefined
  }
}

function makeAbsoluteUrl(url: string | undefined, baseUrl: string): string | undefined {
  if (!url)
    return undefined
  try {
    return new URL(url, baseUrl).href
  }
  catch {
    return undefined
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseClient(token)

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }
    try {
      const _ = new URL(url)
    }
    catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Synapse-LinkParser/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: AbortSignal.timeout(10000), // 10 seconds timeout
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
          { status: 400 },
        )
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('text/html')) {
        return NextResponse.json(
          { error: 'URL does not point to an HTML page' },
          { status: 400 },
        )
      }

      const html = await response.text()
      const dom = new JSDOM(html, { url })
      const document = dom.window.document

      const title = document.querySelector('title')?.textContent?.trim()
        || document.querySelector('h1')?.textContent?.trim()
        || 'Untitled'

      const metaData = extractMetaTags(document)
      const structuredContent = convertHtmlToStructuredContent(document)
      const rawText = extractTextFromStructuredContent(structuredContent)
      const favicon = extractFavicon(document, url)

      // Извлекаем все изображения из структурированного контента
      const images = structuredContent.content
        .filter(block => block.type === 'image')
        .map(block => block.attrs?.src)
        .filter(src => src) as string[]

      const linkContent: LinkContent = {
        url,
        title: metaData.title || title,
        description: metaData.description || '',
        content: structuredContent,
        rawText,
        metadata: {
          image: makeAbsoluteUrl(metaData.image, url),
          favicon,
          siteName: metaData.siteName,
          author: metaData.author,
          publishedTime: metaData.publishedTime,
          extractedAt: new Date().toISOString(),
          contentBlocks: structuredContent.content.length,
          images,
        },
        parsing: {
          method: 'jsdom',
          userAgent: 'Mozilla/5.0 (compatible; Synapse-LinkParser/1.0)',
          success: true,
          extractedImages: images.length,
        },
      }

      if (!rawText || rawText.length < 50) {
        return NextResponse.json(
          { error: 'Unable to extract meaningful content from this page' },
          { status: 400 },
        )
      }

      return NextResponse.json({
        success: true,
        data: linkContent,
      })
    }
    catch (error) {
      console.error('Error parsing URL:', error)
      return NextResponse.json(
        { error: 'Failed to parse the webpage content' },
        { status: 500 },
      )
    }
  }
  catch (error) {
    console.error('Parse link API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
