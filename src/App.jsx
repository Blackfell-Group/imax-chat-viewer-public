import React, { useState, useCallback } from 'react'
import { Box, AppBar, Toolbar, Typography, Chip } from '@mui/material'
import ForumIcon from '@mui/icons-material/Forum'
import NavPanel from './components/NavPanel.jsx'
import ChatViewer from './components/ChatViewer.jsx'
import GoldCopyPanel from './components/GoldCopyPanel.jsx'

// Three-panel triage layout: navigation (left) / chat log viewer (center) /
// gold-copy production (right). Panels collapse independently so an analyst
// can reclaim screen space during deep-dive reading. Clips flow left→right:
// anything clipped from the viewer lands in the gold-copy tray carrying its
// provenance (thread, message, sender, timestamp, enrichment service).
export default function App() {
  const [selectedThread, setSelectedThread] = useState(null)
  const [focusMsg, setFocusMsg] = useState(null)
  const [clips, setClips] = useState([])
  // Linguist judgment, held in memory (no client-side persistence): a review
  // is the human verdict on the machine translation (confirmed or corrected);
  // a note is free-text analyst interpretation. Both keyed by messageId so
  // they survive navigating away and back within the session.
  const [reviews, setReviews] = useState({})
  const [notes, setNotes] = useState({})
  // Officer annotation of documents (the OCR read surface), keyed by
  // attachmentId, held in memory (no client-side persistence). A doc note is
  // the officer's interpretation of the file; doc tags are officer-applied
  // triage marks that surface back in Search & Triage as a filterable facet.
  // Each tag record carries its threadId so the queue can resolve tagged docs
  // back to their thread.
  const [docNotes, setDocNotes] = useState({})   // attachmentId -> text
  const [docTags, setDocTags] = useState({})     // attachmentId -> { threadId, tags: [] }

  const setReview = useCallback((messageId, review) => {
    setReviews(prev => { const next = { ...prev }; if (review) next[messageId] = review; else delete next[messageId]; return next })
  }, [])
  const setNote = useCallback((messageId, text) => {
    setNotes(prev => { const next = { ...prev }; if (text && text.trim()) next[messageId] = text.trim(); else delete next[messageId]; return next })
  }, [])
  const setDocNote = useCallback((attachmentId, text) => {
    setDocNotes(prev => { const next = { ...prev }; if (text && text.trim()) next[attachmentId] = text.trim(); else delete next[attachmentId]; return next })
  }, [])
  const toggleDocTag = useCallback((attachmentId, threadId, tag) => {
    setDocTags(prev => {
      const rec = prev[attachmentId] || { threadId, tags: [] }
      const tags = rec.tags.includes(tag) ? rec.tags.filter(t => t !== tag) : [...rec.tags, tag]
      const next = { ...prev }
      if (tags.length) next[attachmentId] = { threadId, tags }; else delete next[attachmentId]
      return next
    })
  }, [])

  // From browse mode messageId is absent; from a search hit it names the
  // message to scroll to and flash. The counter re-triggers the scroll when
  // the same hit is clicked twice.
  const selectThread = useCallback((thread, messageId = null) => {
    setSelectedThread(thread)
    setFocusMsg(prev => messageId ? { messageId, seq: (prev?.seq || 0) + 1 } : null)
  }, [])

  const addClip = useCallback((clip) => {
    setClips(prev => [...prev, { ...clip, clipId: `clip-${prev.length + 1}-${clip.provenance.messageId || clip.provenance.threadId}` }])
  }, [])

  const removeClip = useCallback((clipId) => {
    setClips(prev => prev.filter(c => c.clipId !== clipId))
  }, [])

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static" elevation={0} sx={{ bgcolor: '#101820', borderBottom: '1px solid #263140' }}>
        <Toolbar variant="dense" sx={{ gap: 1.5, position: 'relative' }}>
          <ForumIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            IMAX <Typography component="span" variant="subtitle1" sx={{ color: 'text.secondary' }}>· Triage Workspace</Typography>
          </Typography>
          <Chip size="small" label="UNCLASSIFIED — DEMONSTRATION DATA (FABRICATED)"
            sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', bgcolor: '#e3c000', color: '#1a1400', fontWeight: 700 }} />
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <NavPanel selectedThread={selectedThread} onSelect={selectThread} docTags={docTags} />
        <ChatViewer thread={selectedThread} focusMsg={focusMsg} onClip={addClip} reviews={reviews} notes={notes} onReview={setReview} onNote={setNote}
          docNotes={docNotes} docTags={docTags} onDocNote={setDocNote} onDocTag={toggleDocTag} />
        <GoldCopyPanel clips={clips} onRemove={removeClip} />
      </Box>
    </Box>
  )
}
