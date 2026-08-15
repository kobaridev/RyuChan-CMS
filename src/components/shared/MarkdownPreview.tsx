import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { createHighlighter, type BundledLanguage, type ThemeName } from 'shiki'

const DEFAULT_THEME: ThemeName = 'one-dark-pro'

interface MarkdownPreviewProps {
  content: string
  className?: string
  codeTheme?: string
}

export function MarkdownPreview({ content, className = '', codeTheme }: MarkdownPreviewProps) {
  const theme = (codeTheme && (codeTheme as ThemeName)) || DEFAULT_THEME
  const containerRef = useRef<HTMLDivElement>(null)
  const [highlighter, setHighlighter] = useState<ReturnType<typeof createHighlighter> | null>(null)

  // 异步初始化 highlighter
  useEffect(() => {
    createHighlighter({
      themes: [theme],
      langs: ['typescript', 'javascript', 'python', 'bash', 'shell', 'yaml', 'json', 'markdown',
              'html', 'css', 'tsx', 'jsx', 'sql', 'rust', 'go', 'ruby', 'java', 'c', 'cpp',
              'csharp', 'php', 'swift', 'kotlin', 'dart', 'lua', 'toml', 'ini', 'diff',
              'graphql', 'dockerfile', 'plaintext'],
    }).then(setHighlighter).catch(() => {})
  }, [theme])

  // highlighter 就绪后，用 Shiki 替换 DOM 中的代码块
  useEffect(() => {
    if (!highlighter || !containerRef.current) return
    const container = containerRef.current
    // 只处理块级代码：pre > code
    const codeBlocks = container.querySelectorAll('pre > code')
    codeBlocks.forEach((el) => {
      const cls = el.className || ''
      const match = cls.match(/language-(\w+)/)
      if (!match) return
      const lang = match[1] as BundledLanguage
      const codeText = el.textContent || ''
      try {
        // Shiki 输出：<div class="shiki ..."><pre><code class="... language-xxx">...</code></pre></div>
        const outer = document.createElement('div')
        outer.innerHTML = highlighter.codeToHtml(codeText.trimEnd(), { lang, theme })
        // 取 Shiki 输出的 pre 节点，替换原来的 pre > code
        const shikiPre = outer.querySelector('pre')
        if (shikiPre) {
          const parent = el.parentElement
          if (parent && parent.tagName === 'PRE') {
            parent.replaceWith(shikiPre.cloneNode(true))
          } else {
            el.replaceWith(shikiPre.cloneNode(true))
          }
        }
      } catch {
        // 高亮失败则保留原始内容
      }
    })
  }, [highlighter, content, theme])

  return (
    <div className={`markdown-preview ${className}`}>
      <div ref={containerRef}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={{
            code({ className: codeClassName, children, ...props }: any) {
              const match = /language-(\w+)/.exec(codeClassName || '')
              const inline = !match && !String(children).includes('\n')
              if (inline || !match) return <code className={codeClassName} {...props}>{children}</code>
              return <code className={codeClassName} {...props}>{children}</code>
            },
            p({ node, children, ...props }: any) {
              const text = String(children)
              if (typeof children === 'string' && children.startsWith('<') && children.endsWith('>')) {
                return (
                  <div className="bg-info/10 border border-info/30 rounded-lg p-3 my-2">
                    <span className="text-xs text-info font-mono">MDX 组件</span>
                    <pre className="text-sm mt-1 font-mono text-base-content/70">{text}</pre>
                  </div>
                )
              }
              return <p {...props}>{children}</p>
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
