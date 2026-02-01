"use client"

import { useEffect, useRef, useMemo } from "react"
import type { ContentType } from "@/types/database"

interface PostRendererProps {
  content: string
  contentType: ContentType
}

function SvgRenderer({ content }: { content: string }) {
  // Process SVG to ensure proper viewBox and responsive sizing
  const processedSvg = useMemo(() => {
    if (typeof window === "undefined") return content

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

        const result = svg.outerHTML
        console.log("SVG Processing:", {
          svgFound: true,
          viewBox: svg.getAttribute("viewBox"),
          first200: result.substring(0, 200),
        })
        return result
      }
      console.log("SVG Processing:", { svgFound: false })
    } catch {
      // If parsing fails, return original content
    }

    return content
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
    <iframe
      srcDoc={svgDoc}
      className="w-full h-full border-0"
      sandbox="allow-scripts"
      title="SVG Content"
    />
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
    case "ascii":
      return (
        <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
          <pre className="font-mono text-green-400 text-xs sm:text-sm md:text-base leading-tight whitespace-pre text-center">
            {content}
          </pre>
        </div>
      )

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
        <div className="w-full h-full flex items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Post content"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              // Show placeholder on error
              (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23333' width='200' height='200'/%3E%3Ctext fill='%23666' font-family='sans-serif' font-size='14' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage failed to load%3C/text%3E%3C/svg%3E"
            }}
          />
        </div>
      )

    case "text":
    default:
      return (
        <div className="w-full h-full flex items-center justify-center p-8">
          <div className="max-w-lg text-center">
            <p className="text-xl sm:text-2xl md:text-3xl font-serif leading-relaxed whitespace-pre-wrap">
              {content}
            </p>
          </div>
        </div>
      )
  }
}
