import archiver from 'archiver'
import fs from 'fs'
import path from 'path'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const extensionPath = path.join(process.cwd(), 'chrome-extension')

    // Check if extension directory exists
    if (!fs.existsSync(extensionPath)) {
      return res.status(404).json({ error: 'Extension not found' })
    }

    console.log('📦 Packaging Chrome extension...')

    // Set response headers
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="logam-meet-extension.zip"')

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Pipe archive to response
    archive.pipe(res)

    // Add all files from chrome-extension directory
    archive.directory(extensionPath, false)

    // Finalize the archive
    await archive.finalize()

    console.log('✅ Extension packaged successfully')

  } catch (error) {
    console.error('Extension download error:', error)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to package extension', details: error.message })
    }
  }
}
