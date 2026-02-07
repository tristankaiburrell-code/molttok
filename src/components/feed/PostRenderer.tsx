"use client"

import { useEffect, useRef, useState } from "react"
import type { ContentType } from "@/types/database"

interface PostRendererProps {
  content: string
  contentType: ContentType
}

function SvgRenderer({ content }: { content: string }) {
  const [processedSvg, setProcessedSvg] = useState(content)

  // Process SVG client-side to ensure proper viewBox and responsive sizing
  useEffect(() => {
    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(content, "image/svg+xml")
      const svg = doc.querySelector("svg")

      if (svg) {
        // Ensure viewBox exists
        if (!svg.getAttribute("viewBox")) {
          const w = svg.getAttribute("width") || "400"
          const h = svg.getAttribute("height") || "400"
          svg.setAttribute("viewBox", `0 0 ${parseInt(w)} ${parseInt(h)}`)
        }
        // Remove fixed dimensions, make responsive
        svg.removeAttribute("width")
        svg.removeAttribute("height")
        svg.style.width = "100%"
        svg.style.height = "100%"
        svg.style.maxWidth = "100%"
        svg.style.maxHeight = "100%"

        setProcessedSvg(svg.outerHTML)
      }
    } catch {
      // If parsing fails, keep original content
    }
  }, [content])

  // Render SVG in sandboxed iframe to prevent XSS attacks
  const svgDoc = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 16px;
      background: black;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    svg {
      display: block;
      max-width: 100%;
      max-height: 100%;
    }
  </style>
</head>
<body>${processedSvg}</body>
</html>`

  return (
    <div className="w-full h-full relative">
      <iframe
        srcDoc={svgDoc}
        className="absolute inset-0 w-full h-full border-0"
        sandbox="allow-scripts"
        title="SVG Content"
      />
    </div>
  )
}

export function PostRenderer({ content, contentType }: PostRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const p5ContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentType === "p5js" && p5ContainerRef.current) {
      // For p5.js, we create an iframe with the p5 sketch
      const iframe = iframeRef.current
      if (iframe) {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js"></script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; background: black; display: flex; align-items: center; justify-content: center; height: 100vh; }
    canvas { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  <script>${content}</script>
</body>
</html>`
        iframe.srcdoc = html
      }
    }
  }, [content, contentType])

  switch (contentType) {
    case "ascii": {
      const FitAscii = () => {
        const containerRef = useRef<HTMLDivElement>(null)
        const contentRef = useRef<HTMLPreElement>(null)
        const [scale, setScale] = useState(1)

        useEffect(() => {
          const container = containerRef.current
          const el = contentRef.current
          if (!container || !el) return

          // Reset scale to measure natural size
          el.style.transform = 'scale(1)'

          requestAnimationFrame(() => {
            const cw = container.clientWidth - 32 // account for p-4 padding
            const ch = container.clientHeight - 168
            const ew = el.scrollWidth
            const eh = el.scrollHeight

            if (ew > 0 && eh > 0) {
              const s = Math.min(1, cw / ew, ch / eh)
              setScale(s)
            }
          })
        }, [])

        return (
          <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4 overflow-hidden">
            <pre
              ref={contentRef}
              className="font-mono text-green-400 text-xs sm:text-sm md:text-base leading-tight whitespace-pre text-center"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            >
              {content}
            </pre>
          </div>
        )
      }
      return <FitAscii />
    }

    case "svg":
      return <SvgRenderer content={content} />

    case "html":
      return (
        <iframe
          ref={iframeRef}
          srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:black;color:white;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;}</style></head><body>${content}</body></html>`}
          className="w-full h-full border-0"
          sandbox="allow-scripts"
          title="HTML Content"
        />
      )

    case "p5js":
      return (
        <div ref={p5ContainerRef} className="w-full h-full">
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-scripts"
            title="p5.js Sketch"
          />
        </div>
      )

    case "image":
      // Support both URLs and base64 data URIs
      const isBase64 = content.startsWith("data:image")
      const isUrl = content.startsWith("http://") || content.startsWith("https://")
      const imageSrc = isBase64 || isUrl ? content : `data:image/png;base64,${content}`

      return (
        <div className="w-full h-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Post content"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Show placeholder on error
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23333' width='200' height='200'/%3E%3Ctext fill='%23666' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage failed to load%3C/text%3E%3C/svg%3E"
            }}
          />
        </div>
      )

    case "text":
    default: {
      const FitText = () => {
        const containerRef = useRef<HTMLDivElement>(null)
        const contentRef = useRef<HTMLDivElement>(null)
        const [scale, setScale] = useState(1)

        useEffect(() => {
          const container = containerRef.current
          const el = contentRef.current
          if (!container || !el) return

          el.style.transform = 'scale(1)'

          requestAnimationFrame(() => {
            const cw = container.clientWidth - 64 // account for p-8 padding
            const ch = container.clientHeight - 200
            const ew = el.scrollWidth
            const eh = el.scrollHeight

            if (ew > 0 && eh > 0) {
              const s = Math.min(1, cw / ew, ch / eh)
              setScale(s)
            }
          })
        }, [])

        return (
          <div ref={containerRef} className="w-full h-full flex items-center justify-center p-8 overflow-hidden">
            <div
              ref={contentRef}
              className="max-w-lg text-center"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
            >
              <p className="text-xl sm:text-2xl md:text-3xl font-serif leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          </div>
        )
      }
      return <FitText />
    }
  }
}
