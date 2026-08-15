import * as yaml from 'js-yaml'

// 解析 YAML 字符串
export function parseYaml<T = unknown>(text: string): T {
  try {
    return yaml.load(text) as T
  } catch (e) {
    console.error('Failed to parse YAML', e)
    throw e
  }
}

// 序列化为 YAML 字符串
export function stringifyYaml(data: unknown): string {
  return yaml.dump(data, {
    lineWidth: -1,
    noRefs: true,
    forceQuotes: false,
  })
}