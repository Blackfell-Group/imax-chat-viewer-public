import React, { useEffect, useState } from 'react'
import { Box, Typography, Stack, Button, Paper, Collapse, IconButton, Tooltip } from '@mui/material'
import SummarizeIcon from '@mui/icons-material/Summarize'
import CloseIcon from '@mui/icons-material/Close'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import MessageBubble from './MessageBubble.jsx'
import OcrDialog from './OcrDialog.jsx'

// Chat Log Viewer (center panel): renders the message stream with timestamps
// and attribution; mixed-script and RTL text render correctly in a single
// stream. Thread summarization is on-demand and collapses back out of the
// way — density belongs to the analyst, not the tool.
export default function ChatViewer({ thread, focusMsg, onClip, reviews, notes, onReview, onNote, docNotes, docTags, onDocNote, onDocTag }) {
  const [messages, setMessages] = useState([])
  const [summary, setSummary] = useState(null)
  const [showSummary, setShowSummary] = useState(false)
  const [attachment, setAttachment] = useState(null)
  const [flashId, setFlashId] = useState(null)

  useEffect(() => {
    setSummary(null)
    setShowSummary(false)
    if (!thread) { setMessages([]); return }
    fetch(`/api/search/threads/${thread.threadId}/messages`)
      .then(r => r.json())
      .then(d => setMessages(d.messages || []))
      .catch(() => setMessages([]))
  }, [thread])

  // Arriving from a search hit: scroll the target message into view and flash
  // it so the analyst lands on the evidence, not the top of a long thread.
  useEffect(() => {
    if (!focusMsg || messages.length === 0) return
    const el = document.querySelector(`[data-testid="msg-${focusMsg.messageId}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'center' })
    setFlashId(focusMsg.messageId)
    const timer = setTimeout(() => setFlashId(null), 1800)
    return () => clearTimeout(timer)
  }, [focusMsg, messages])

  const summarize = async () => {
    if (summary) { setShowSummary(v => !v); return }
    const r = await fetch('/api/summarize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: thread.threadId })
    })
    const d = await r.json()
    setSummary(d)
    setShowSummary(true)
  }

  if (!thread) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>Select a thread from the queue to begin triage.</Typography>
      </Box>
    )
  }

  return (
    <Box data-testid="chat-viewer" sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1, borderBottom: '1px solid #263140' }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap>{thread.title}</Typography>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>{thread.network} · {thread.messageCount} messages · {thread.languages.join(', ')}</Typography>
        </Box>
        <Button size="small" startIcon={<SummarizeIcon />} onClick={summarize} data-testid="summarize-btn">
          {showSummary ? 'Hide summary' : 'Summarize thread'}
        </Button>
      </Stack>

      <Collapse in={showSummary}>
        {summary && (
          <Paper variant="outlined" data-testid="summary-widget" sx={{ mx: 2, mt: 1.5, p: 1.5, borderColor: '#2e4a6b', bgcolor: '#16222f' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', flex: 1 }}>
                EXECUTIVE SUMMARY · {summary.service}
              </Typography>
              <Tooltip title="Clip summary to gold copy">
                <IconButton size="small" data-testid="clip-summary" onClick={() => onClip({ type: 'summary', content: summary.summary, provenance: { threadId: thread.threadId, service: summary.service, ts: new Date().toISOString() } })}>
                  <ContentCutIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setShowSummary(false)}><CloseIcon sx={{ fontSize: 14 }} /></IconButton>
            </Stack>
            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{summary.summary}</Typography>
          </Paper>
        )}
      </Collapse>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {messages.map(m => (
          <MessageBubble key={m.messageId} msg={m} thread={thread} highlighted={flashId === m.messageId} onClip={onClip}
            review={reviews?.[m.messageId]} note={notes?.[m.messageId]} onReview={onReview} onNote={onNote}
            onOpenAttachment={(a, prov) => setAttachment({ ...a, provenance: prov })} />
        ))}
      </Box>

      <OcrDialog attachment={attachment} onClose={() => setAttachment(null)} onClip={onClip}
        note={attachment ? docNotes?.[attachment.attachmentId] : ''}
        tags={attachment ? (docTags?.[attachment.attachmentId]?.tags || []) : []}
        onNote={onDocNote} onTag={onDocTag} />
    </Box>
  )
}
