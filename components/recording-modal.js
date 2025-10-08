'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Circle, Square, Save, Play, Pause } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function RecordingModal({ isOpen, onClose, meetUrl }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const previewRef = useRef(null)
  const intervalRef = useRef(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isRecording) {
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' },
        audio: true
      })

      streamRef.current = stream
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      })

      const chunks = []
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        const url = URL.createObjectURL(blob)
        if (previewRef.current) {
          previewRef.current.src = url
        }
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordingTime(0)

      toast({
        title: "Recording Started",
        description: "Screen recording is now active",
      })

    } catch (error) {
      console.error('Error starting recording:', error)
      toast({
        title: "Recording Failed",
        description: "Could not start screen recording",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      setIsRecording(false)

      toast({
        title: "Recording Stopped",
        description: "Recording saved successfully",
      })
    }
  }

  const togglePreview = () => {
    if (previewRef.current) {
      if (isPlaying) {
        previewRef.current.pause()
      } else {
        previewRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const uploadRecording = async () => {
    if (!recordedBlob || !meetUrl) return

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('video', recordedBlob, 'recording.webm')
      formData.append('meetUrl', meetUrl)
      formData.append('timestamp', Date.now().toString())

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Upload Successful",
          description: "Recording has been saved to your dashboard",
        })
        onClose()
        setRecordedBlob(null)
        setRecordingTime(0)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload Failed",
        description: "Could not save recording",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (isRecording) {
      stopRecording()
    }
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meeting Recording</DialogTitle>
          <DialogClose onClick={handleClose} />
        </DialogHeader>

        <div className="space-y-6">
          {/* Recording Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center space-x-3">
              {isRecording ? (
                <Circle className="h-4 w-4 text-red-500 fill-current animate-pulse" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">
                {isRecording ? 'Recording' : recordedBlob ? 'Stopped' : 'Ready'}
              </span>
            </div>
            <div className="text-lg font-mono">
              {formatTime(recordingTime)}
            </div>
          </div>

          {/* Video Preview */}
          {recordedBlob && (
            <div className="space-y-4">
              <h3 className="font-medium">Preview Recording</h3>
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={previewRef}
                  className="w-full h-64 object-contain"
                  controls={false}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <div className="absolute bottom-4 left-4">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={togglePreview}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              Meeting: {meetUrl ? new URL(meetUrl).pathname : 'Unknown'}
            </div>
            <div className="flex space-x-2">
              {!isRecording && !recordedBlob && (
                <Button onClick={startRecording} className="flex items-center space-x-2">
                  <Circle className="h-4 w-4" />
                  <span>Start Recording</span>
                </Button>
              )}

              {isRecording && (
                <Button onClick={stopRecording} variant="destructive" className="flex items-center space-x-2">
                  <Square className="h-4 w-4" />
                  <span>Stop Recording</span>
                </Button>
              )}

              {recordedBlob && !isRecording && (
                <Button
                  onClick={uploadRecording}
                  disabled={isUploading}
                  className="flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isUploading ? 'Uploading...' : 'Save Recording'}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}