import { useRouter } from 'next/router'
import Head from 'next/head'
import { Video, Download, Chrome, FolderOpen, Settings, CheckCircle } from 'lucide-react'

export default function InstallExtension() {
  const router = useRouter()

  const handleDownloadExtension = () => {
    window.location.href = '/api/download-extension'
  }

  return (
    <>
      <Head>
        <title>Install Extension - Logam Meet</title>
        <meta name="description" content="Install the Logam Meet Chrome extension" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="border-b border-black/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
              <Video className="text-black" size={32} />
              <span className="text-2xl font-bold">Logam Meet</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition font-medium"
              >
                Dashboard
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Install Chrome Extension</h1>
            <p className="text-xl text-black/60">
              Follow these simple steps to install the Logam Meet extension
            </p>
          </div>

          {/* Download Button */}
          <div className="text-center mb-16">
            <button
              onClick={handleDownloadExtension}
              className="px-10 py-5 bg-black text-white rounded-xl hover:bg-black/90 transition font-bold text-xl flex items-center gap-3 mx-auto"
            >
              <Download size={28} />
              Download Extension
            </button>
          </div>

          {/* Installation Steps */}
          <div className="space-y-8">
            <div className="border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Download size={24} />
                    <h3 className="text-2xl font-bold">Download & Extract</h3>
                  </div>
                  <p className="text-black/60 leading-relaxed mb-3">
                    Click the "Download Extension" button above to get the zip file. Once downloaded, extract the zip file to a folder on your computer.
                  </p>
                  <div className="bg-black/5 p-4 rounded-lg font-mono text-sm">
                    Right-click → Extract All... (Windows)<br />
                    Double-click to unzip (Mac)
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Chrome size={24} />
                    <h3 className="text-2xl font-bold">Open Chrome Extensions</h3>
                  </div>
                  <p className="text-black/60 leading-relaxed mb-3">
                    Open Google Chrome and navigate to the extensions page:
                  </p>
                  <div className="bg-black/5 p-4 rounded-lg font-mono text-sm mb-3">
                    chrome://extensions/
                  </div>
                  <p className="text-black/60 text-sm">
                    Or: Click the three dots menu (⋮) → Extensions → Manage Extensions
                  </p>
                </div>
              </div>
            </div>

            <div className="border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Settings size={24} />
                    <h3 className="text-2xl font-bold">Enable Developer Mode</h3>
                  </div>
                  <p className="text-black/60 leading-relaxed mb-3">
                    In the top-right corner of the extensions page, toggle on "Developer mode".
                  </p>
                  <div className="bg-black/5 p-4 rounded-lg">
                    <div className="flex items-center justify-between border-2 border-black rounded-lg p-3 bg-white">
                      <span className="font-medium">Developer mode</span>
                      <div className="w-12 h-6 bg-black rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center text-2xl font-bold">
                  4
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <FolderOpen size={24} />
                    <h3 className="text-2xl font-bold">Load Unpacked Extension</h3>
                  </div>
                  <p className="text-black/60 leading-relaxed mb-3">
                    Click "Load unpacked" button and select the extracted folder (the folder containing manifest.json).
                  </p>
                  <div className="bg-black/5 p-4 rounded-lg font-mono text-sm">
                    Click: Load unpacked → Select extracted folder → Open
                  </div>
                </div>
              </div>
            </div>

            <div className="border-2 border-black rounded-2xl p-8 bg-black text-white">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 bg-white text-black rounded-xl flex items-center justify-center text-2xl font-bold">
                  5
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle size={24} />
                    <h3 className="text-2xl font-bold">All Done!</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed mb-4">
                    The Logam Meet extension is now installed! You'll see it in your Chrome toolbar. Click the extension icon to get started.
                  </p>
                  <div className="bg-white/10 p-4 rounded-lg">
                    <p className="text-sm text-white/80">
                      💡 <strong>Tip:</strong> Pin the extension to your toolbar by clicking the puzzle icon and then the pin icon next to Logam Meet Recorder.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-16 text-center">
            <h2 className="text-3xl font-bold mb-4">Need Help?</h2>
            <p className="text-black/60 mb-8">
              Visit our dashboard for support or to view your recordings
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 border-2 border-black rounded-xl hover:bg-black hover:text-white transition font-semibold"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-black/10 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="text-black" size={28} />
                <span className="text-xl font-bold">Logam Meet</span>
              </div>
              <p className="text-black/60">
                © 2025 Logam Meet. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
