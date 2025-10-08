import { useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { Video, ChevronRight, CheckCircle, Zap, Shield, Cloud, FileText, Download } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  const handleDownloadExtension = () => {
    router.push('/install-extension')
  }

  return (
    <>
      <Head>
        <title>Logam Meet - AI-Powered Meeting Recorder</title>
        <meta name="description" content="Record, transcribe, and analyze your Google Meet sessions with AI" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="border-b border-black/10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video className="text-black" size={32} />
              <span className="text-2xl font-bold">Logam Meet</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleDownloadExtension}
                className="px-6 py-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition font-medium flex items-center gap-2"
              >
                <Download size={18} />
                Download Extension
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition font-medium"
              >
                Get Started
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold mb-6 leading-tight">
              Record & Transcribe
              <br />
              <span className="relative">
                Google Meet
                <span className="absolute -bottom-2 left-0 right-0 h-3 bg-black/10 -z-10" />
              </span>
            </h1>

            <p className="text-xl text-black/60 mb-12 max-w-2xl mx-auto">
              Never miss a meeting detail. Automatically record, transcribe, and analyze your Google Meet sessions with AI-powered insights.
            </p>

            <div className="flex items-center justify-center gap-4 mb-16">
              <button
                onClick={handleDownloadExtension}
                className="px-8 py-4 border-2 border-black rounded-xl hover:bg-black hover:text-white transition font-semibold flex items-center gap-2 text-lg"
              >
                <Download size={24} />
                Download Extension
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-4 bg-black text-white rounded-xl hover:bg-black/90 transition font-semibold flex items-center gap-2 text-lg"
              >
                Start Recording Free
                <ChevronRight size={24} />
              </button>
            </div>

            {/* Demo Video Placeholder */}
            <div className="bg-black/5 border-4 border-black rounded-2xl aspect-video flex items-center justify-center">
              <Video className="text-black/40" size={120} />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-6 py-20">
          <h2 className="text-4xl font-bold text-center mb-16">Everything you need</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                <Zap className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Instant Recording</h3>
              <p className="text-black/60 leading-relaxed">
                One-click recording directly from Google Meet. Captures video, audio, and screen sharing automatically.
              </p>
            </div>

            <div className="bg-white border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                <FileText className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">AI Transcription</h3>
              <p className="text-black/60 leading-relaxed">
                Automatic transcription powered by AI. Search and reference meeting content with ease.
              </p>
            </div>

            <div className="bg-white border-2 border-black rounded-2xl p-8 hover:shadow-2xl transition">
              <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-6">
                <Cloud className="text-white" size={24} />
              </div>
              <h3 className="text-2xl font-bold mb-4">Cloud Storage</h3>
              <p className="text-black/60 leading-relaxed">
                All recordings securely stored in the cloud. Access from anywhere, anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="bg-black text-white">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <h2 className="text-4xl font-bold text-center mb-16">Why teams choose Logam</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
              <div className="flex gap-4">
                <CheckCircle className="flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold mb-2">Never miss important details</h3>
                  <p className="text-white/60">Review key moments and decisions from every meeting</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle className="flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold mb-2">Save time on note-taking</h3>
                  <p className="text-white/60">Focus on the conversation, not writing everything down</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle className="flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold mb-2">Share with your team</h3>
                  <p className="text-white/60">Easy sharing and collaboration on meeting recordings</p>
                </div>
              </div>

              <div className="flex gap-4">
                <CheckCircle className="flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="text-xl font-bold mb-2">Secure & private</h3>
                  <p className="text-white/60">Enterprise-grade security for all your recordings</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to get started?</h2>
          <p className="text-xl text-black/60 mb-12">
            Start recording your meetings in minutes
          </p>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-10 py-5 bg-black text-white rounded-xl hover:bg-black/90 transition font-bold text-xl"
          >
            Start Free Trial
          </button>
        </section>

        {/* Footer */}
        <footer className="border-t border-black/10">
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
