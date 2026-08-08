import React, { useState } from 'react'
import {
  Box, Typography, Stack, Paper, IconButton, Chip, Button, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import IosShareIcon from '@mui/icons-material/IosShare'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FingerprintIcon from '@mui/icons-material/Fingerprint'

const TYPE_LABEL = { message: 'MESSAGE', entity: 'ENTITY', summary: 'SUMMARY', ocr: 'OCR TEXT', note: 'NOTE' }

function Provenance({ p }) {
  const parts = [
    p.threadId && `thread ${p.threadId}`,
    p.messageId && `msg ${p.messageId}`,
    p.sender && `@${p.sender}`,
    p.attachmentId && `att ${p.attachmentId}`,
    p.service && `via ${p.service}`,
    p.ts && p.ts.slice(0, 19).replace('T', ' ') + 'Z'
  ].filter(Boolean)
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
      <FingerprintIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
      <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>{parts.join(' · ')}</Typography>
    </Stack>
  )
}

// Gold-Copy Production Panel: clips arrive from the chat viewer with
// provenance already attached — the finished product stays traceable to the
// originating message without the analyst doing bookkeeping. Export renders
// the standardized product template.
export default function GoldCopyPanel({ clips, onRemove }) {
  const [collapsed, setCollapsed] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  if (collapsed) {
    return (
      <Box sx={{ width: 40, borderLeft: '1px solid #263140', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
        <Tooltip title={`Expand gold copy (${clips.length})`}>
          <IconButton size="small" onClick={() => setCollapsed(false)} data-testid="goldcopy-expand">
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {clips.length > 0 && <Chip size="small" label={clips.length} sx={{ mt: 1, height: 18, fontSize: 10 }} />}
      </Box>
    )
  }

  const product = [
    'INTELLIGENCE PRODUCT (DRAFT) — UNCLASSIFIED DEMONSTRATION',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...clips.map((c, i) => {
      const p = c.provenance
      const src = [p.threadId, p.messageId, p.sender && '@' + p.sender, p.service].filter(Boolean).join(' / ')
      return `${i + 1}. [${TYPE_LABEL[c.type]}${c.entityType ? ': ' + c.entityType : ''}] ${c.content}\n   SOURCE: ${src} @ ${p.ts || ''}`
    })
  ].join('\n')

  return (
    <Box data-testid="goldcopy-panel" sx={{ width: 330, flexShrink: 0, borderLeft: '1px solid #263140', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1 }}>
        <IconButton size="small" onClick={() => setCollapsed(true)}><ChevronRightIcon fontSize="small" /></IconButton>
        <Typography variant="overline" sx={{ color: 'text.secondary', flex: 1, ml: 0.5 }}>Gold Copy · {clips.length} clips</Typography>
        <Button size="small" startIcon={<IosShareIcon />} disabled={clips.length === 0} onClick={() => setExportOpen(true)} data-testid="export-btn">
          Export
        </Button>
      </Stack>
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pb: 1.5 }}>
        {clips.length === 0 && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Clip messages, entities, summaries, or OCR text from the viewer. Every clip carries its source attribution forward.
          </Typography>
        )}
        {clips.map(c => (
          <Paper key={c.clipId} variant="outlined" data-testid={`goldclip-${c.clipId}`} sx={{ p: 1, mb: 1, borderColor: '#233040' }}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Chip size="small" label={TYPE_LABEL[c.type]} sx={{ height: 16, fontSize: 9, fontWeight: 700 }} />
              {c.entityType && <Chip size="small" label={c.entityType} sx={{ height: 16, fontSize: 9, color: '#10151b', bgcolor: `entity.${c.entityType}` }} />}
              <Box sx={{ flex: 1 }} />
              <IconButton size="small" onClick={() => onRemove(c.clipId)}><DeleteOutlineIcon sx={{ fontSize: 14 }} /></IconButton>
            </Stack>
            <Typography variant="body2" sx={{ mt: 0.5, fontSize: 12, lineHeight: 1.5 }}>
              {c.content.length > 220 ? c.content.slice(0, 220) + '…' : c.content}
            </Typography>
            <Provenance p={c.provenance} />
          </Paper>
        ))}
      </Box>

      <Dialog open={exportOpen} onClose={() => setExportOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle component="div" sx={{ py: 1.5 }}><Typography variant="subtitle2">Product Export — Standardized Template</Typography></DialogTitle>
        <DialogContent dividers>
          <Typography component="pre" data-testid="export-preview" sx={{ fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', m: 0 }}>
            {product}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => navigator.clipboard?.writeText(product)}>Copy</Button>
          <Button size="small" onClick={() => setExportOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
