import React, { useState } from 'react'
import { Box, Paper, Typography, Stack, Chip, IconButton, Tooltip, CircularProgress, TextField, Button } from '@mui/material'
import LanguageIcon from '@mui/icons-material/Language'
import UndoIcon from '@mui/icons-material/Undo'
import LabelIcon from '@mui/icons-material/Label'
import ContentCutIcon from '@mui/icons-material/ContentCut'
import ImageIcon from '@mui/icons-material/Image'
import CheckIcon from '@mui/icons-material/Check'
import EditNoteIcon from '@mui/icons-material/EditNote'
import CommentIcon from '@mui/icons-material/Comment'

const ENTITY_COLOR = { person: 'entity.person', geo: 'entity.geo', phone: 'entity.phone', passport: 'entity.passport', handle: 'entity.handle' }

// One message in the chat log. Enrichment is on-demand and non-destructive.
// Two human-in-the-loop actions layer on top of the machine output:
//  - Translation review: the machine translation is a draft; the linguist
//    confirms it or corrects it. The verdict travels into any clip.
//  - Analyst note: free-text interpretation the machine can't produce
//    ("code word", "same speaker as Falcon-7"), clippable with provenance.
export default function MessageBubble({ msg, thread, highlighted, review, note, onReview, onNote, onClip, onOpenAttachment }) {
  const [translation, setTranslation] = useState(null)
  const [showTranslation, setShowTranslation] = useState(false)
  const [entities, setEntities] = useState(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [noteEditing, setNoteEditing] = useState(false)
  const [noteDraft, setNoteDraft] = useState(note || '')

  const foreign = msg.lang !== 'en'
  // The English shown is the linguist's version if they've reviewed it,
  // otherwise the raw machine translation.
  const enText = review ? review.text : translation?.text
  const displayText = showTranslation && enText ? enText : msg.text
  const displayDir = showTranslation && enText ? 'ltr' : msg.dir

  const provenance = { threadId: thread.threadId, messageId: msg.messageId, sender: msg.sender.handle, network: msg.sender.network, ts: msg.ts }

  const toggleTranslate = async () => {
    if (translation) { setShowTranslation(v => !v); return }
    setBusy(true)
    try {
      const r = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.messageId, srcLang: msg.lang }) })
      const d = await r.json(); setTranslation(d); setShowTranslation(true)
    } finally { setBusy(false) }
  }

  const extractEntities = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/entities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.messageId }) })
      const d = await r.json(); setEntities(d.entities || [])
    } finally { setBusy(false) }
  }

  const confirmMT = () => onReview(msg.messageId, { status: 'confirmed', text: translation.text })
  const startEdit = () => { setDraft(enText || translation?.text || ''); setEditing(true) }
  const saveEdit = () => { onReview(msg.messageId, { status: 'corrected', text: draft }); setEditing(false) }

  const reviewService = review ? (review.status === 'corrected' ? 'linguist-edited' : 'linguist-confirmed') : (translation ? translation.service : null)

  const clipMessage = () => onClip({
    type: 'message', content: displayText, lang: showTranslation ? 'en' : msg.lang,
    provenance: { ...provenance, ...(showTranslation && { service: reviewService }) }
  })

  const saveNote = () => { onNote(msg.messageId, noteDraft); setNoteEditing(false) }
  const clipNote = () => onClip({ type: 'note', content: note, provenance: { ...provenance, service: 'analyst-note' } })

  return (
    <Paper variant="outlined" data-testid={`msg-${msg.messageId}`} sx={{ p: 1.2, mb: 1, transition: 'border-color 0.4s, box-shadow 0.4s', borderColor: highlighted ? 'primary.main' : '#233040', boxShadow: highlighted ? '0 0 0 1px #4da3ff, 0 0 14px rgba(77,163,255,0.35)' : 'none', bgcolor: msg.lang === 'en' ? '#151c24' : '#182130' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main' }}>{msg.sender.handle}</Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled' }}>{new Date(msg.ts).toISOString().replace('T', ' ').slice(0, 19)}Z</Typography>
        <Chip size="small" variant="outlined" label={msg.lang.toUpperCase()} sx={{ height: 16, fontSize: 9 }} />
        {showTranslation && (
          <Chip size="small" data-testid={`translated-${msg.messageId}`}
            label={review ? (review.status === 'corrected' ? 'EN · linguist-edited' : 'EN · linguist-confirmed') : 'EN · mock-translate'}
            sx={{ height: 16, fontSize: 9, bgcolor: review ? '#2e6b4a' : '#28405e' }} />
        )}
        <Box sx={{ flex: 1 }} />
        {busy && <CircularProgress size={12} />}
        {foreign && (
          <Tooltip title={showTranslation ? 'Show original' : 'Translate in place'}>
            <IconButton size="small" data-testid={`translate-${msg.messageId}`} onClick={toggleTranslate}>
              {showTranslation ? <UndoIcon sx={{ fontSize: 15 }} /> : <LanguageIcon sx={{ fontSize: 15 }} />}
            </IconButton>
          </Tooltip>
        )}
        {showTranslation && enText && !editing && (
          <>
            <Tooltip title="Confirm this translation">
              <IconButton size="small" data-testid={`confirm-${msg.messageId}`} onClick={confirmMT}><CheckIcon sx={{ fontSize: 15, color: review?.status === 'confirmed' ? 'entity.geo' : 'text.secondary' }} /></IconButton>
            </Tooltip>
            <Tooltip title="Correct this translation">
              <IconButton size="small" data-testid={`edit-tr-${msg.messageId}`} onClick={startEdit}><EditNoteIcon sx={{ fontSize: 16, color: review?.status === 'corrected' ? 'entity.passport' : 'text.secondary' }} /></IconButton>
            </Tooltip>
          </>
        )}
        <Tooltip title="Extract entities">
          <IconButton size="small" data-testid={`entities-${msg.messageId}`} onClick={extractEntities}><LabelIcon sx={{ fontSize: 15 }} /></IconButton>
        </Tooltip>
        <Tooltip title={note ? 'Edit note' : 'Add note'}>
          <IconButton size="small" data-testid={`note-${msg.messageId}`} onClick={() => { setNoteDraft(note || ''); setNoteEditing(v => !v) }}><CommentIcon sx={{ fontSize: 15, color: note ? 'secondary.main' : 'text.disabled' }} /></IconButton>
        </Tooltip>
        <Tooltip title="Clip message to gold copy">
          <IconButton size="small" data-testid={`clip-${msg.messageId}`} onClick={clipMessage}><ContentCutIcon sx={{ fontSize: 15 }} /></IconButton>
        </Tooltip>
      </Stack>

      {editing ? (
        <Stack spacing={0.5} sx={{ mb: 0.5 }}>
          <TextField size="small" multiline value={draft} onChange={e => setDraft(e.target.value)} inputProps={{ 'data-testid': `edit-field-${msg.messageId}` }} />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" data-testid={`save-tr-${msg.messageId}`} onClick={saveEdit}>Save correction</Button>
            <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>
          </Stack>
        </Stack>
      ) : (
        <Typography variant="body2" dir={displayDir} sx={{ textAlign: displayDir === 'rtl' ? 'right' : 'left', lineHeight: 1.7 }}>{displayText}</Typography>
      )}

      {(msg.attachments || []).map(a => (
        <Chip key={a.attachmentId} icon={<ImageIcon />} label={a.name} size="small" onClick={() => onOpenAttachment(a, provenance)} data-testid={`attachment-${a.attachmentId}`} sx={{ mt: 1, cursor: 'pointer' }} />
      ))}

      {entities && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }} data-testid={`entity-row-${msg.messageId}`}>
          {entities.length === 0 && <Typography variant="caption" sx={{ color: 'text.disabled' }}>no entities detected</Typography>}
          {entities.map((e, i) => (
            <Tooltip key={i} title={`${e.type} · confidence ${e.confidence} · click to clip with provenance`}>
              <Chip size="small" label={`${e.type}: ${e.text}`} data-testid={`entity-chip-${msg.messageId}-${i}`}
                onClick={() => onClip({ type: 'entity', entityType: e.type, content: e.text, confidence: e.confidence, provenance: { ...provenance, service: 'mock-entities' } })}
                sx={{ height: 20, fontSize: 10, fontWeight: 600, color: '#10151b', bgcolor: ENTITY_COLOR[e.type] || 'grey.500' }} />
            </Tooltip>
          ))}
        </Stack>
      )}

      {noteEditing && (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          <TextField size="small" multiline placeholder="Officer interpretation — code words, source correlation, context the MT can't capture…" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} inputProps={{ 'data-testid': `note-field-${msg.messageId}` }} />
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="contained" data-testid={`save-note-${msg.messageId}`} onClick={saveNote}>Save note</Button>
            <Button size="small" onClick={() => setNoteEditing(false)}>Cancel</Button>
            {note && <Button size="small" color="error" onClick={() => { onNote(msg.messageId, ''); setNoteEditing(false) }}>Delete</Button>}
          </Stack>
        </Stack>
      )}

      {note && !noteEditing && (
        <Paper variant="outlined" data-testid={`note-display-${msg.messageId}`} sx={{ mt: 1, p: 0.9, borderColor: '#3a4a6b', bgcolor: '#1a2233' }}>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.25 }}>
            <CommentIcon sx={{ fontSize: 12, color: 'secondary.main' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main', flex: 1 }}>NOTE</Typography>
            <Tooltip title="Clip note to gold copy"><IconButton size="small" data-testid={`clip-note-${msg.messageId}`} onClick={clipNote}><ContentCutIcon sx={{ fontSize: 13 }} /></IconButton></Tooltip>
          </Stack>
          <Typography variant="body2" sx={{ fontSize: 12.5, lineHeight: 1.5 }}>{note}</Typography>
        </Paper>
      )}
    </Paper>
  )
}
