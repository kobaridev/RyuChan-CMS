import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import SyntaxHighlighter from 'react-syntax-highlighter/dist/esm/prism'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownPreviewProps {
  content: string
  className?: string
}

export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  return (
    <div className={`markdown-preview ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ node, className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '')
            const inline = !match && !String(children).includes('\n')
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={codeClassName} {...props}>
                {children}
              </code>
            )
          },
          // 对于 MDX 组件标签，渲染为特殊样式
          p({ node, children, ...props }) {
            // 检查是否包含 MDX 组件标签
            const text = String(children)
            if (text.startsWith('<') && text.endsWith('>')) {
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
  )
}