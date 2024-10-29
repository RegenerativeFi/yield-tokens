export const defaultFetch = async (options: {
  tokens: string[]
  url: string
  path: string
  scale?: number
}) => {
  const { tokens, url, path, scale = 100 } = options
  const response = await fetch(url, { headers: { 'User-Agent': 'cf' } })
  const json = await response.json()
  const value = path === '' ? json : getValueFromPath(json, path)
  const scaledValue = Math.round(parseFloat(value) * scale)

  return tokens.reduce((acc, token) => {
    acc[token] = scaledValue
    return acc
  }, {} as { [key: string]: number })
}

// Get a specific value from a JSON object based on a path
export const getValueFromPath = (obj: any, path: string) => {
  const parts = path.split('.')
  let value = obj
  for (const part of parts) {
    if (part[0] === '{' && part[part.length - 1] === '}') {
      const selector = part.slice(1, -1)
      const variableName = selector.split('==')[0].trim()
      const variableValue = selector.split('==')[1].trim().replace(/"/g, '')
      value = value.find((v: any) => v[variableName] === variableValue)
    } else {
      value = value[part]
    }
  }
  return value
}
