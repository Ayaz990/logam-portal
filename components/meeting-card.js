import { Calendar, Copy, Play, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function MeetingCard({ meeting }) {
  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const handlePlayVideo = () => {
    window.open(meeting.videoUrl, '_blank')
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(meeting.videoUrl)
      // Optional: Add a toast notification here
      alert('Video link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy link:', error)
      alert('Failed to copy link')
    }
  }

  const handleOpenMeet = () => {
    window.open(meeting.meetUrl, '_blank')
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="truncate">Meeting Recording</span>
          <Button variant="ghost" size="icon" onClick={handleOpenMeet}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription className="flex items-center space-x-2">
          <Calendar className="h-4 w-4" />
          <span>{formatDate(meeting.timestamp)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-2">Meeting URL:</p>
        <p className="text-sm font-mono bg-muted p-2 rounded truncate">
          {meeting.meetUrl}
        </p>
      </CardContent>
      <CardFooter className="flex space-x-2">
        <Button onClick={handlePlayVideo} className="flex items-center space-x-2">
          <Play className="h-4 w-4" />
          <span>Play</span>
        </Button>
        <Button variant="outline" onClick={handleCopyLink} className="flex items-center space-x-2">
          <Copy className="h-4 w-4" />
          <span>Copy Link</span>
        </Button>
      </CardFooter>
    </Card>
  )
}