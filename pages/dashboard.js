import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import {
  Home,
  Video,
  Settings,
  BarChart3,
  Menu,
  X,
  LogOut,
  Calendar,
  Clock,
  Trash2,
  FileText,
  Copy,
  Eye,
  Play,
  Search,
  Filter,
  HardDrive,
  Bot,
  ExternalLink
} from 'lucide-react'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect to sign in if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])
  const [recordings, setRecordings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState({})
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    totalSize: 0
  })

  // Layout state
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('transcript') // 'transcript', 'summary', or 'video'
  const [claiming, setClaiming] = useState(false)
  const [botRequests, setBotRequests] = useState([])
  const [botRequestsLoading, setBotRequestsLoading] = useState(true)
  const [transcribing, setTranscribing] = useState({})

  // Menu items
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'recordings', label: 'Recordings', icon: Video },
    { id: 'bot-requests', label: 'Bot Requests', icon: Bot },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  useEffect(() => {
    // Only fetch recordings if user is authenticated
    if (!session?.user?.id) {
      return
    }

    console.log('🔍 Dashboard: Fetching recordings for user:', session.user.id, 'Role:', session.user.role)

    // Admin users see all recordings, regular users see only their own
    const q = session.user.role === 'admin'
      ? query(collection(db, 'meetings')) // Admin: fetch all recordings
      : query(collection(db, 'meetings'), where('userId', '==', session.user.id)) // Regular: only user's recordings

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        console.log('📊 Firebase snapshot received. Size:', snapshot.size)
        const recordingData = []
        snapshot.forEach((doc) => {
          const data = doc.data()
          console.log('Recording:', doc.id, data)
          recordingData.push({ id: doc.id, ...data })
        })

        // Sort by createdAt descending on client-side
        recordingData.sort((a, b) => {
          const timeA = a.createdAt?.toDate?.() || new Date(0)
          const timeB = b.createdAt?.toDate?.() || new Date(0)
          return timeB - timeA
        })

        console.log('✅ Total recordings loaded for user:', recordingData.length)
        setRecordings(recordingData)

        // Calculate stats
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

        const todayCount = recordingData.filter(r =>
          r.createdAt?.toDate() >= today
        ).length

        const weekCount = recordingData.filter(r =>
          r.createdAt?.toDate() >= weekAgo
        ).length

        const totalSize = recordingData.reduce((sum, r) => sum + (r.fileSize || 0), 0)

        setStats({
          total: recordingData.length,
          today: todayCount,
          thisWeek: weekCount,
          totalSize
        })

        setLoading(false)
      },
      (err) => {
        console.error('❌ Error fetching recordings:', err)
        console.error('Error details:', err.message, err.code)
        setError('Failed to load recordings: ' + err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [session])

  // Fetch bot requests (all users can see their own, admins see all)
  useEffect(() => {
    if (!session?.user?.id) {
      return
    }

    console.log('🤖 Fetching bot requests for user:', session.user.email, 'Role:', session.user.role)

    // Admin sees all requests, regular users see only their own
    const q = session.user.role === 'admin'
      ? query(collection(db, 'bot-requests'), orderBy('requestedAt', 'desc'))
      : query(
          collection(db, 'bot-requests'),
          where('userId', '==', session.user.id),
          orderBy('requestedAt', 'desc')
        )

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const requests = []
        snapshot.forEach((doc) => {
          requests.push({ id: doc.id, ...doc.data() })
        })
        console.log('✅ Bot requests loaded:', requests.length)
        setBotRequests(requests)
        setBotRequestsLoading(false)
      },
      (err) => {
        console.error('❌ Error fetching bot requests:', err)
        setBotRequestsLoading(false)
      }
    )

    return () => unsubscribe()
  }, [session])

  const handleGenerateTranscript = async (recordingId) => {
    try {
      setTranscribing(prev => ({ ...prev, [recordingId]: true }))

      const response = await fetch('/api/trigger-transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ meetingId: recordingId })
      })

      if (!response.ok) {
        throw new Error('Failed to generate transcript')
      }

      showNotification('Transcript generation started. This may take a few minutes.')
    } catch (error) {
      console.error('Error generating transcript:', error)
      showNotification('Failed to start transcript generation')
    } finally {
      setTranscribing(prev => ({ ...prev, [recordingId]: false }))
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (date) => {
    if (!date) return 'Unknown'
    return date.toDate ? date.toDate().toLocaleDateString() : new Date(date).toLocaleDateString()
  }

  const formatTime = (date) => {
    if (!date) return 'Unknown'
    return date.toDate ? date.toDate().toLocaleTimeString() : new Date(date).toLocaleTimeString()
  }

  const copyMeetingUrl = (url) => {
    navigator.clipboard.writeText(url)
    showNotification('URL copied to clipboard')
  }

  const claimExistingRecordings = async () => {
    if (!confirm('This will assign all unclaimed recordings to your account. Continue?')) {
      return
    }

    setClaiming(true)
    try {
      const response = await fetch('/api/claim-recordings', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        showNotification(`Successfully claimed ${data.claimed} recordings!`)
        // Refresh will happen automatically due to the useEffect
      } else {
        showNotification('Failed to claim recordings: ' + data.error)
      }
    } catch (error) {
      console.error('Claim error:', error)
      showNotification('Failed to claim recordings')
    } finally {
      setClaiming(false)
    }
  }

  const deleteRecording = async (recordingId) => {
    if (!confirm('Delete this recording? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting(prev => ({ ...prev, [recordingId]: true }))

      const response = await fetch(`/api/delete?id=${recordingId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setRecordings(prev => prev.filter(r => r.id !== recordingId))
        showNotification('Recording deleted successfully')
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }
    } catch (error) {
      console.error('Delete error:', error)
      setError('Failed to delete recording: ' + error.message)
    } finally {
      setDeleting(prev => ({ ...prev, [recordingId]: false }))
    }
  }

  const showNotification = (message) => {
    // Simple notification implementation
    const notification = document.createElement('div')
    notification.textContent = message
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: black;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `
    document.body.appendChild(notification)
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }

  const filteredRecordings = recordings.filter(recording =>
    recording.meetingTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.meetingName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.meetingUrl?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recording.meetUrl?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  console.log('🔍 Filtered recordings:', filteredRecordings.length, 'out of', recordings.length)

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin mb-4" />
          <p className="text-black/60">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (redirect will happen)
  if (!session) {
    return null
  }

  return (
    <>
      <Head>
        <title>Logam Meet - Dashboard</title>
        <meta name="description" content="Meeting recordings dashboard" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Sidebar */}
        <aside className={`fixed top-0 left-0 h-full bg-black text-white transition-all duration-300 z-50 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-white/10">
            {!sidebarCollapsed && <span className="text-xl font-bold">Logam Meet</span>}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:block p-2 hover:bg-white/10 rounded-lg transition"
            >
              {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-8 px-3">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-lg transition ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  <Icon size={20} />
                  {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
                </button>
              )
            })}
          </nav>

          {/* Stats */}
          {!sidebarCollapsed && (
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Total Recordings</span>
                  <span className="font-semibold">{stats.total}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">This Week</span>
                  <span className="font-semibold">{stats.thisWeek}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Storage</span>
                  <span className="font-semibold">{formatFileSize(stats.totalSize)}</span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}>
          {/* Header */}
          <header className="h-16 bg-white border-b border-black/10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-black/5 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <h1 className="text-2xl font-bold">
                {menuItems.find(item => item.id === activeTab)?.label}
              </h1>
              {session?.user?.role === 'admin' && (
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-300">
                  ADMIN
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-black/60 hidden sm:block">{session?.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-black/90 rounded-lg transition"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          {/* Content Area */}
          <div className="p-6">
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white border-2 border-black rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black/60">Total Recordings</span>
                      <Video className="text-black" size={24} />
                    </div>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </div>

                  <div className="bg-white border-2 border-black rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black/60">Today</span>
                      <Calendar className="text-black" size={24} />
                    </div>
                    <p className="text-3xl font-bold">{stats.today}</p>
                  </div>

                  <div className="bg-white border-2 border-black rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black/60">This Week</span>
                      <Clock className="text-black" size={24} />
                    </div>
                    <p className="text-3xl font-bold">{stats.thisWeek}</p>
                  </div>
                </div>

                {/* Claim Existing Recordings Banner */}
                {stats.total === 0 && (
                  <div className="bg-blue-50 border-2 border-blue-600 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-blue-900 mb-1">
                          Have existing recordings?
                        </h3>
                        <p className="text-sm text-blue-700">
                          Click here to claim any unclaimed recordings and add them to your dashboard
                        </p>
                      </div>
                      <button
                        onClick={claimExistingRecordings}
                        disabled={claiming}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {claiming ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Claiming...
                          </>
                        ) : (
                          'Claim Recordings'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Search and Filters */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={20} />
                    <input
                      type="text"
                      placeholder="Search recordings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                  </div>
                  <button className="px-4 py-3 border-2 border-black rounded-xl hover:bg-black hover:text-white transition flex items-center gap-2">
                    <Filter size={20} />
                    <span>Filter</span>
                  </button>
                </div>

                {/* Recordings List */}
                {loading ? (
                  <div className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                    <p className="mt-4 text-black/60">Loading recordings...</p>
                  </div>
                ) : error ? (
                  <div className="bg-white border-2 border-black rounded-xl p-6 text-center">
                    <p className="text-red-600">{error}</p>
                  </div>
                ) : filteredRecordings.length === 0 ? (
                  <div className="bg-white border-2 border-black rounded-xl p-12 text-center">
                    <Video className="mx-auto mb-4 text-black/40" size={48} />
                    <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
                    <p className="text-black/60">Start recording meetings to see them here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecordings.map((recording) => {
                      return (
                      <div
                        key={recording.id}
                        className="bg-white border-2 border-black rounded-xl p-6 hover:shadow-xl transition group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">
                                {recording.meetingTitle || recording.meetingName || 'Meeting Recording'}
                              </h3>
                              {session?.user?.role === 'admin' && recording.userId && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  User: {recording.userId.substring(0, 8)}
                                </span>
                              )}
                            </div>

                            {recording.meetUrl && (
                              <a
                                href={recording.meetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-black/60 hover:text-black hover:underline mb-2 block"
                              >
                                {recording.meetUrl}
                              </a>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-black/60 mb-4">
                              <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                {formatDate(recording.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={16} />
                                {formatTime(recording.createdAt)}
                              </span>
                              {recording.fileSize && (
                                <span className="flex items-center gap-1">
                                  <HardDrive size={16} />
                                  {formatFileSize(recording.fileSize)}
                                </span>
                              )}
                            </div>

                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            {/* Copy Link Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                copyMeetingUrl(recording.downloadURL || recording.videoUrl)
                              }}
                              disabled={!recording.downloadURL && !recording.videoUrl}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.downloadURL || recording.videoUrl ? "Copy video link" : "Video not available"}
                            >
                              <Copy size={18} />
                            </button>

                            {/* Play Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMeeting(recording)
                                setModalType('video')
                                setModalOpen(true)
                              }}
                              disabled={!recording.downloadURL && !recording.videoUrl}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.downloadURL || recording.videoUrl ? "Play" : "Video not available"}
                            >
                              <Play size={18} />
                            </button>

                            {/* Transcript Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMeeting(recording)
                                setModalType('transcript')
                                setModalOpen(true)
                              }}
                              disabled={!recording.transcript?.text}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.transcript?.text ? "View transcript" : recording.transcript?.status === 'processing' ? "Transcript processing..." : "Transcript not available"}
                            >
                              <FileText size={18} />
                            </button>

                            {/* Summary Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMeeting(recording)
                                setModalType('summary')
                                setModalOpen(true)
                              }}
                              disabled={!recording.summary?.summary}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.summary?.summary ? "View summary" : recording.summary?.status === 'processing' ? "Summary processing..." : "Summary not available"}
                            >
                              <Eye size={18} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                deleteRecording(recording.id)
                              }}
                              disabled={deleting[recording.id]}
                              className="p-2 hover:bg-red-600 hover:text-white hover:border-red-600 border-2 border-black rounded-lg transition disabled:opacity-50"
                              title="Delete"
                            >
                              {deleting[recording.id] ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Recordings Tab - Same as Dashboard */}
            {activeTab === 'recordings' && (
              <>
                {/* Search */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={20} />
                    <input
                      type="text"
                      placeholder="Search recordings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border-2 border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-black/20"
                    />
                  </div>
                </div>

                {/* All Recordings List */}
                {loading ? (
                  <div className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                    <p className="mt-4 text-black/60">Loading recordings...</p>
                  </div>
                ) : filteredRecordings.length === 0 ? (
                  <div className="bg-white border-2 border-black rounded-xl p-12 text-center">
                    <Video className="mx-auto mb-4 text-black/40" size={48} />
                    <h3 className="text-xl font-semibold mb-2">No recordings found</h3>
                    <p className="text-black/60">
                      {searchQuery ? 'Try a different search term' : 'Start recording meetings to see them here'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRecordings.map((recording) => {
                      return (
                      <div
                        key={recording.id}
                        className="bg-white border-2 border-black rounded-xl p-6 hover:shadow-xl transition group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">
                                {recording.meetingTitle || recording.meetingName || 'Meeting Recording'}
                              </h3>
                              {session?.user?.role === 'admin' && recording.userId && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                                  User: {recording.userId.substring(0, 8)}
                                </span>
                              )}
                            </div>

                            {recording.meetUrl && (
                              <a
                                href={recording.meetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-black/60 hover:text-black hover:underline mb-2 block"
                              >
                                {recording.meetUrl}
                              </a>
                            )}

                            <div className="flex flex-wrap gap-4 text-sm text-black/60">
                              <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                {formatDate(recording.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={16} />
                                {formatTime(recording.createdAt)}
                              </span>
                              {recording.fileSize && (
                                <span className="flex items-center gap-1">
                                  <HardDrive size={16} />
                                  {formatFileSize(recording.fileSize)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 ml-4">
                            {/* Copy Link Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                copyMeetingUrl(recording.downloadURL || recording.videoUrl)
                              }}
                              disabled={!recording.downloadURL && !recording.videoUrl}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.downloadURL || recording.videoUrl ? "Copy video link" : "Video not available"}
                            >
                              <Copy size={18} />
                            </button>

                            {/* Play Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMeeting(recording)
                                setModalType('video')
                                setModalOpen(true)
                              }}
                              disabled={!recording.downloadURL && !recording.videoUrl}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.downloadURL || recording.videoUrl ? "Play" : "Video not available"}
                            >
                              <Play size={18} />
                            </button>

                            {/* Transcript Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMeeting(recording)
                                setModalType('transcript')
                                setModalOpen(true)
                              }}
                              disabled={!recording.transcript?.text}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.transcript?.text ? "View transcript" : recording.transcript?.status === 'processing' ? "Transcript processing..." : "Transcript not available"}
                            >
                              <FileText size={18} />
                            </button>

                            {/* Summary Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setSelectedMeeting(recording)
                                setModalType('summary')
                                setModalOpen(true)
                              }}
                              disabled={!recording.summary?.summary}
                              className="p-2 hover:bg-black hover:text-white border-2 border-black rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={recording.summary?.summary ? "View summary" : recording.summary?.status === 'processing' ? "Summary processing..." : "Summary not available"}
                            >
                              <Eye size={18} />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                deleteRecording(recording.id)
                              }}
                              disabled={deleting[recording.id]}
                              className="p-2 hover:bg-red-600 hover:text-white hover:border-red-600 border-2 border-black rounded-lg transition disabled:opacity-50"
                              title="Delete"
                            >
                              {deleting[recording.id] ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 size={18} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                    })}
                  </div>
                )}
              </>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="bg-white border-2 border-black rounded-xl p-12 text-center">
                <BarChart3 className="mx-auto mb-4 text-black/40" size={48} />
                <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-black/60">Track your meeting insights and statistics</p>
              </div>
            )}

            {/* Bot Requests Tab */}
            {activeTab === 'bot-requests' && (
              <>
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">Bot Recording Requests</h2>
                    <p className="text-black/60">
                      {session?.user?.role === 'admin'
                        ? 'All bot recording requests from users'
                        : 'Your bot recording requests - Request bot to join and record your meetings'}
                    </p>
                  </div>
                  {session?.user?.role !== 'admin' && botRequests.length > 0 && (
                    <button
                      onClick={() => {
                        const meetingUrl = prompt('Enter Google Meet URL:')
                        if (!meetingUrl) return
                        const meetingName = prompt('Enter meeting name (optional):') || 'Untitled Meeting'

                        fetch('/api/bot-request', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ meetingUrl, meetingName })
                        })
                        .then(res => res.json())
                        .then(() => alert('✅ Bot request submitted!'))
                        .catch(() => alert('❌ Failed to submit request'))
                      }}
                      className="bg-black text-white px-6 py-3 rounded-lg hover:bg-black/90 transition font-semibold flex items-center gap-2"
                    >
                      <Bot size={20} />
                      New Bot Request
                    </button>
                  )}
                </div>

                {botRequestsLoading ? (
                  <div className="text-center py-20">
                    <div className="inline-block w-8 h-8 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                    <p className="mt-4 text-black/60">Loading requests...</p>
                  </div>
                ) : botRequests.length === 0 ? (
                  <div className="bg-white border-2 border-black rounded-xl p-12">
                    <div className="text-center mb-8">
                      <Bot className="mx-auto mb-4 text-black/40" size={48} />
                      <h3 className="text-xl font-semibold mb-2">No bot requests yet</h3>
                      <p className="text-black/60 mb-6">
                        {session?.user?.role === 'admin'
                          ? 'When users request bot recordings, they will appear here'
                          : 'Request a bot to join and record your Google Meet meetings automatically'}
                      </p>
                    </div>

                    {session?.user?.role !== 'admin' && (
                      <div className="max-w-md mx-auto">
                        <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                          <h4 className="font-semibold mb-4">Request Bot Recording</h4>
                          <form onSubmit={async (e) => {
                            e.preventDefault()
                            const formData = new FormData(e.target)
                            const meetingUrl = formData.get('meetingUrl')
                            const meetingName = formData.get('meetingName')

                            try {
                              const response = await fetch('/api/bot-request', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ meetingUrl, meetingName })
                              })

                              if (response.ok) {
                                alert('✅ Bot request submitted! The bot will join your meeting shortly.')
                                e.target.reset()
                              } else {
                                const error = await response.json()
                                alert('❌ Error: ' + error.error)
                              }
                            } catch (error) {
                              alert('❌ Failed to submit request')
                            }
                          }}>
                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">Meeting URL *</label>
                              <input
                                type="url"
                                name="meetingUrl"
                                required
                                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="mb-4">
                              <label className="block text-sm font-medium mb-2">Meeting Name</label>
                              <input
                                type="text"
                                name="meetingName"
                                placeholder="Team Standup"
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full bg-black text-white py-3 rounded-lg hover:bg-black/90 transition font-semibold flex items-center justify-center gap-2"
                            >
                              <Bot size={20} />
                              Request Bot Recording
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {botRequests.map((request) => (
                      <div
                        key={request.id}
                        className="bg-white border-2 border-black rounded-xl p-6 hover:shadow-xl transition"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">
                                {request.meetingName}
                              </h3>
                              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                request.status === 'joined' ? 'bg-blue-100 text-blue-800' :
                                request.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {request.status}
                              </span>
                            </div>

                            <p className="text-sm text-black/60 mb-2">
                              Requested by: <span className="font-medium">{request.userEmail}</span>
                            </p>

                            <div className="flex items-center gap-4 text-sm text-black/60 mb-3">
                              <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                {request.requestedAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock size={16} />
                                {request.requestedAt?.toDate?.()?.toLocaleTimeString() || 'Unknown'}
                              </span>
                            </div>

                            <a
                              href={request.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline break-all"
                            >
                              {request.meetingUrl}
                            </a>
                          </div>

                          <div className="flex items-center gap-2 ml-4">
                            <a
                              href={request.meetingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90 transition font-semibold flex items-center gap-2"
                            >
                              <ExternalLink size={18} />
                              Join Meeting
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="bg-white border-2 border-black rounded-xl p-12 text-center">
                <Settings className="mx-auto mb-4 text-black/40" size={48} />
                <h3 className="text-xl font-semibold mb-2">Settings Coming Soon</h3>
                <p className="text-black/60">Customize your recording preferences</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Transcript/Summary Modal */}
      {modalOpen && selectedMeeting && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border-4 border-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b-2 border-black">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {modalType === 'video' ? 'Video Player' : modalType === 'transcript' ? 'Transcript' : 'Summary'}
                </h2>
                <p className="text-sm text-black/60 mt-1">
                  {selectedMeeting.meetingTitle || selectedMeeting.meetingName || 'Meeting Recording'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 hover:bg-black/10 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalType === 'video' ? (
                <div className="flex flex-col items-center justify-center">
                  {(selectedMeeting.downloadURL || selectedMeeting.videoUrl) ? (
                    <video
                      key={selectedMeeting.id}
                      src={selectedMeeting.downloadURL || selectedMeeting.videoUrl}
                      controls
                      autoPlay
                      preload="auto"
                      className="w-full max-w-4xl rounded-lg"
                      style={{ maxHeight: '70vh' }}
                      onError={(e) => {
                        const videoElement = e.target
                        console.error('❌ Video load error:', {
                          error: e,
                          errorCode: videoElement.error?.code,
                          errorMessage: videoElement.error?.message,
                          networkState: videoElement.networkState,
                          readyState: videoElement.readyState,
                          url: selectedMeeting.downloadURL || selectedMeeting.videoUrl,
                          meeting: selectedMeeting
                        })

                        let errorMsg = 'Error loading video. '
                        if (videoElement.error) {
                          switch(videoElement.error.code) {
                            case 1: errorMsg += 'Video loading aborted.'; break;
                            case 2: errorMsg += 'Network error.'; break;
                            case 3: errorMsg += 'Video decode failed.'; break;
                            case 4: errorMsg += 'Video format not supported.'; break;
                            default: errorMsg += 'Unknown error.';
                          }
                        }
                        showNotification(errorMsg)
                      }}
                      onLoadedData={() => {
                        console.log('✅ Video loaded successfully')
                      }}
                      onLoadStart={() => {
                        console.log('🎬 Video loading started...')
                      }}
                    >
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <div className="text-center p-8">
                      <p className="text-red-600 font-semibold">No video URL found for this recording</p>
                      <p className="text-sm text-gray-600 mt-2">The recording may not have been uploaded successfully.</p>
                    </div>
                  )}
                </div>
              ) : modalType === 'transcript' ? (
                <div className="space-y-4">
                  {/* Copy button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMeeting.transcript.text)
                        showNotification('Transcript copied to clipboard')
                      }}
                      className="flex items-center gap-2 px-4 py-2 border-2 border-black rounded-lg hover:bg-black hover:text-white transition"
                    >
                      <Copy size={18} />
                      <span>Copy</span>
                    </button>
                  </div>

                  {/* Transcript text */}
                  <div className="prose max-w-none">
                    <div className="whitespace-pre-wrap text-black leading-relaxed">
                      {selectedMeeting.transcript.text}
                    </div>
                  </div>

                  {/* Metadata */}
                  {selectedMeeting.transcript.confidence && (
                    <div className="mt-6 pt-4 border-t border-black/10">
                      <p className="text-sm text-black/60">
                        Confidence: {(selectedMeeting.transcript.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  {selectedMeeting.summary?.summary && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Summary</h3>
                      <p className="text-black/80 leading-relaxed whitespace-pre-wrap">
                        {selectedMeeting.summary.summary}
                      </p>
                    </div>
                  )}

                  {/* Key Points */}
                  {selectedMeeting.summary?.keyPoints && selectedMeeting.summary.keyPoints.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Key Points</h3>
                      <ul className="space-y-2">
                        {selectedMeeting.summary.keyPoints.map((point, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-black font-semibold">•</span>
                            <span className="text-black/80">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Items */}
                  {selectedMeeting.summary?.actionItems && selectedMeeting.summary.actionItems.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Action Items</h3>
                      <ul className="space-y-2">
                        {selectedMeeting.summary.actionItems.map((item, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="text-black font-semibold">□</span>
                            <span className="text-black/80">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Analysis */}
                  {selectedMeeting.summary?.analysis && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Analysis</h3>
                      <div className="bg-black/5 rounded-lg p-4">
                        <pre className="text-sm text-black/80 whitespace-pre-wrap">
                          {JSON.stringify(selectedMeeting.summary.analysis, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  )
}
