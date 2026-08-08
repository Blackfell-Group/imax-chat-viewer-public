import React, { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, Box, Typography, IconButton, Stack, Tooltip, Divider, Chip, Button, TextField, Paper } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import CommentIcon from '@mui/icons-material/Comment'
import EditNoteIcon from '@mui/icons-material/EditNote'
import SellIcon from '@mui/icons-material/Sell'

// Officer's quick-tag vocabulary for triaging a document. Free-text tags are
// also allowed; both flow into Search & Triage as a filterable facet.
const QUICK_TAGS = ['priority', 'identity-doc', 'matches-open-case', 'follow-up']

// OCR Image Viewer: split pane — raw graphic on the left, extracted text on
// the right. Extracted text clips into gold copy line-by-line or whole. Below
// the read pane, the officer annotates the document itself: a free-text note
// (interpretation the machine can't produce) and triage tags that make the
// document findable back in Search & Triage.
export default function OcrDialog({ attachment, onClose, onClip, note, tags = [], onNote, onTag }) {
  const [ocr, setOcr] = useState(null)
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    setOcr(null)
    setNoteEditing(false)
    setTagInput('')
    if (!attachment) return
    fetch('/api/ocr', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ attachmentId: attachment.attachmentId })
    }).then(r => r.json()).then(setOcr).catch(() => setOcr(null))
  }, [attachment])

  if (!attachment) return null

  const attId = attachment.attachmentId
  const threadId = attachment.provenance?.threadId
  const toggleTag = tag => onTag(attId, threadId, tag)
  const addCustomTag = () => { const v = tagInput.trim().toLowerCase(); if (v && !tags.includes(v)) onTag(attId, threadId, v); setTagInput('') }
  const saveNote = () => { onNote(attId, noteDraft); setNoteEditing(false) }
  // Clip closes the viewer so the officer sees the note land in the tray.
  const clipNote = () => { onClip({ type: 'note', content: note, provenance: { ...attachment.provenance, attachmentId: attId, service: 'officer-note' } }); onClose() }

  // Clip closes the viewer so the analyst sees the clip land in the tray —
  // the modal otherwise hides the only feedback that the action worked.
  const clipFullText = () => {
    onClip({
      type: 'ocr',
      content: ocr.fullText,
      provenance: { ...attachment.provenance, attachmentId: attachment.attachmentId, service: ocr.engine }
    })
    onClose()
  }

  const clipGloss = () => {
    onClip({
      type: 'ocr',
      content: ocr.englishGloss,
      provenance: { ...attachment.provenance, attachmentId: attachment.attachmentId, service: 'mock-translate' }
    })
    onClose()
  }

  return (
    <Dialog open maxWidth="md" fullWidth onClose={onClose} data-testid="ocr-dialog">
      <DialogTitle component="div" sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>OCR Viewer · {attachment.name}</Typography>
        {/* span wrapper: Tooltip needs an event-capable child while the button is disabled */}
        <Tooltip title="Clip extracted text to gold copy">
          <span>
            <IconButton size="small" data-testid="clip-ocr" onClick={clipFullText} disabled={!ocr}><ContentCutIcon fontSize="small" /></IconButton>
          </span>
        </Tooltip>
        <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', gap: 2, minHeight: 380 }}>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', bgcolor: '#0c1116', borderRadius: 1, p: 1 }}>
          <img src={attachment.uri} alt={attachment.name} style={{ maxWidth: '100%', maxHeight: 420 }} />
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            EXTRACTED TEXT {ocr ? `· ${ocr.engine}${ocr.srcLang ? ' · ' + ocr.srcLang.toUpperCase() : ''} · schema ${ocr.schemaVersion}` : '· running…'}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }} data-testid="ocr-blocks">
            {(ocr?.blocks || []).map((b, i) => (
              <Typography key={i} variant="body2" dir="auto" sx={{ fontFamily: 'monospace', fontSize: 12.5 }}>{b.text}</Typography>
            ))}
          </Stack>
          {ocr?.englishGloss && (
            <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid #263140' }}>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.disabled', flex: 1 }}>ENGLISH GLOSS · mock-translate</Typography>
                <Tooltip title="Clip English gloss to gold copy"><IconButton size="small" data-testid="clip-ocr-gloss" onClick={clipGloss}><ContentCutIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
              </Stack>
              <Typography variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.5, color: 'text.secondary' }} data-testid="ocr-gloss">{ocr.englishGloss}</Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Officer annotation of the document itself — note + triage tags */}
      <Box data-testid="doc-annotation" sx={{ px: 3, py: 1.5, borderTop: '1px solid #263140', bgcolor: '#10151b' }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', letterSpacing: 0.5, fontWeight: 700 }}>OFFICER ANNOTATION</Typography>

        <Stack direction="row" alignItems="center" sx={{ mt: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
          <SellIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
          {QUICK_TAGS.map(tag => {
            const on = tags.includes(tag)
            return <Chip key={tag} size="small" label={tag} onClick={() => toggleTag(tag)} data-testid={`doctag-${tag}`}
              sx={{ height: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', color: on ? '#10151b' : 'text.primary', bgcolor: on ? 'secondary.main' : 'transparent', border: '1px solid', borderColor: 'secondary.main' }} />
          })}
          {tags.filter(t => !QUICK_TAGS.includes(t)).map(tag => (
            <Chip key={tag} size="small" label={tag} onDelete={() => toggleTag(tag)} data-testid={`doctag-${tag}`}
              sx={{ height: 20, fontSize: 10, fontWeight: 600, color: '#10151b', bgcolor: 'secondary.main' }} />
          ))}
          <TextField size="small" variant="standard" placeholder="+ tag" value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            inputProps={{ 'data-testid': 'doctag-input' }} sx={{ width: 84, '& input': { fontSize: 11 } }} />
        </Stack>

        {noteEditing ? (
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <TextField size="small" multiline autoFocus value={noteDraft} onChange={e => setNoteDraft(e.target.value)}
              placeholder="Officer interpretation — what this document is, who it implicates, what it corroborates…"
              inputProps={{ 'data-testid': 'doc-note-field' }} />
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" data-testid="doc-note-save" onClick={saveNote}>Save note</Button>
              <Button size="small" onClick={() => setNoteEditing(false)}>Cancel</Button>
              {note && <Button size="small" color="error" onClick={() => { onNote(attId, ''); setNoteEditing(false) }}>Delete</Button>}
            </Stack>
          </Stack>
        ) : note ? (
          <Paper variant="outlined" data-testid="doc-note-display" sx={{ mt: 1, p: 0.9, borderColor: '#3a4a6b', bgcolor: '#1a2233' }}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
              <CommentIcon sx={{ fontSize: 12, color: 'secondary.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', flex: 1 }}>NOTE</Typography>
              <Tooltip title="Edit note"><IconButton size="small" data-testid="doc-note-edit" onClick={() => { setNoteDraft(note); setNoteEditing(true) }}><EditNoteIcon sx={{ fontSize: 14 }} /></IconButton></Tooltip>
              <Tooltip title="Clip note to gold copy"><IconButton size="small" data-testid="clip-doc-note" onClick={clipNote}><ContentCutIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
            </Stack>
            <Typography variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.5 }}>{note}</Typography>
          </Paper>
        ) : (
          <Button size="small" startIcon={<CommentIcon sx={{ fontSize: 14 }} />} data-testid="doc-note-add" onClick={() => { setNoteDraft(''); setNoteEditing(true) }} sx={{ mt: 0.5, fontSize: 11, color: 'text.secondary' }}>Add note</Button>
        )}
      </Box>
    </Dialog>
  )
}
