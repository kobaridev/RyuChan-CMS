import * as yaml from 'js-yaml'

// 解析 frontmatter
export function parseFrontmatter(text: string): { data: Record<string, unknown>; content: string } {
  const match = text.match(/^---\n([\s\S]+?)\n---\n([\s\S]*)$/)
  if (match) {
    try {
      const data = yaml.load(match[1]) as Record<string, unknown>
      return { data, content: match[2] }
    } catch (e) {
      console.error('Failed to parse frontmatter', e)
    }
  }
  return { data: {}, content: text }
}

// 序列化 frontmatter
export function stringifyFrontmatter(data: Record<string, unknown>, content: string): string {
  return `---\n${yaml.dump(data, { lineWidth: -1 })}---\n${content}`
}

// 从文件名提取 slug
export function slugFromFilename(filename: string): string {
  return filename.replace(/\.(md|mdx)$/, '')
}