export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, filename } = req.query

  if (!url) {
    return res.status(400).json({ error: 'URL parameter required' })
  }

  try {
    console.log('📥 Proxying download:', url)

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    const blob = await response.blob()
    const buffer = Buffer.from(await blob.arrayBuffer())

    // Set headers for download
    res.setHeader('Content-Type', 'video/webm')
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'recording.webm'}"`)
    res.setHeader('Content-Length', buffer.length)

    res.status(200).send(buffer)
  } catch (error) {
    console.error('Download proxy error:', error)
    res.status(500).json({ error: 'Download failed', details: error.message })
  }
}
