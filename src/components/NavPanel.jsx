import React, { useEffect, useMemo, useState } from 'react'
import {
  Box, List, ListItemButton, ListItemText, Typography, TextField, MenuItem,
  Chip, IconButton, Stack, Tooltip, ToggleButtonGroup, ToggleButton, Collapse, Button
} from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TuneIcon from '@mui/icons-material/Tune'
import PublicIcon from '@mui/icons-material/Public'
import SellIcon from '@mui/icons-material/Sell'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import GraphicEqIcon from '@mui/icons-material/GraphicEq'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import AttachFileIcon from '@mui/icons-material/AttachFile'

const LANG_LABEL = { ar: 'Arabic', fa: 'Farsi', zh: 'Chinese', ru: 'Russian', en: 'English' }
const SCOPE_LANGS = ['ar', 'fa', 'zh', 'ru', 'en']

const SORTS = [
  { value: 'recency', label: 'Most recent' },
  { value: 'untranslated', label: 'Untranslated first' },
  { value: 'volume', label: 'Message count' }
]

const TYPES = [
  { key: 'message', label: 'Message', icon: ChatBubbleOutlineIcon },
  { key: 'transcript', label: 'Transcript', icon: GraphicEqIcon },
  { key: 'document', label: 'Document', icon: DescriptionOutlinedIcon }
]

const FACETS = [
  { key: 'has-selector', label: 'Selector', color: 'entity.phone' },
  { key: 'has-passport', label: 'Passport', color: 'entity.passport' },
  { key: 'has-person', label: 'Person', color: 'entity.person' },
  { key: 'has-geo', label: 'Geo', color: 'entity.geo' },
  { key: 'has-image', label: 'Image', color: 'entity.handle' },
  { key: 'unenriched', label: 'Unenriched', color: '#6b7686' }
]

const ENTITY_COLOR = { person: 'entity.person', geo: 'entity.geo', phone: 'entity.phone', passport: 'entity.passport', handle: 'entity.handle' }
const TYPE_META = { message: ChatBubbleOutlineIcon, transcript: GraphicEqIcon, document: DescriptionOutlinedIcon }

function Snippet({ text, q, dir }) {
  const parts = useMemo(() => {
    const out = []
    if (!q) { out.push({ s: text }); return out }
    const lower = text.toLowerCase(); const needle = q.toLowerCase(); let i = 0
    while (needle) {
      const at = lower.indexOf(needle, i); if (at < 0) break
      if (at > i) out.push({ s: text.slice(i, at) })
      out.push({ s: text.slice(at, at + needle.length), hit: true }); i = at + needle.length
    }
    out.push({ s: text.slice(i) }); return out
  }, [text, q])
  return (
    <Typography variant="body2" dir={dir} sx={{ fontSize: 12, lineHeight: 1.5, textAlign: dir === 'rtl' ? 'right' : 'left' }}>
      {parts.map((p, i) => p.hit
        ? <Box key={i} component="mark" sx={{ bgcolor: '#3d5a80', color: '#eaf2ff', borderRadius: 0.5, px: 0.25 }}>{p.s}</Box>
        : <React.Fragment key={i}>{p.s}</React.Fragment>)}
    </Typography>
  )
}

// Chat Search & Triage panel (left). Browse mode is a linguist's incoming
// queue: unworked-first, with per-item disposition (review / flag to targeter
// / discard) held in memory (no client-side persistence, per the performance
// claim). Any query, facet, or group switches to triage-search across the
// whole corpus. Filters compose: content type (message/transcript/document),
// a sticky "My languages" scope, language, date range, facet, and group.
export default function NavPanel({ selectedThread, onSelect, docTags }) {
  const [threads, setThreads] = useState([])
  const [results, setResults] = useState(null)
  const [groups, setGroups] = useState([])
  const [typeCounts, setTypeCounts] = useState({})
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('content')
  const [myLangs, setMyLangs] = useState(['ar', 'fa', 'zh', 'ru', 'en'])   // linguist's sticky target languages; narrow to scope the queue
  const [sort, setSort] = useState('untranslated')
  const [type, setType] = useState(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [facet, setFacet] = useState(null)
  const [group, setGroup] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [queueMode, setQueueMode] = useState(true)
  const [dispo, setDispo] = useState({})            // threadId -> 'reviewed'|'flagged'|'discarded'
  const [tagFilter, setTagFilter] = useState(null)  // officer tag currently filtering the queue

  // Officer tags are client-side (no persistence), so tag filtering is resolved
  // here rather than at the mock search service: fold the attachmentId→tags map
  // into tag → { threads, docs } so the queue can filter by a tag and show its count.
  const tagIndex = useMemo(() => {
    const byTag = {}
    for (const rec of Object.values(docTags || {})) {
      for (const tag of rec.tags) {
        if (!byTag[tag]) byTag[tag] = { threads: new Set(), docs: 0 }
        byTag[tag].threads.add(rec.threadId); byTag[tag].docs++
      }
    }
    return byTag
  }, [docTags])
  const officerTags = Object.keys(tagIndex).sort()
  // A tag that gets fully removed shouldn't leave a stale active filter.
  useEffect(() => { if (tagFilter && !tagIndex[tagFilter]) setTagFilter(null) }, [tagFilter, tagIndex])

  const active = q.trim().length >= 2 || !!facet || !!group
  // Scope: the sticky My-languages set (empty = no scope, show everything).
  const scope = myLangs.length ? myLangs : null

  useEffect(() => {
    fetch('/api/search/groups').then(r => r.json()).then(d => setGroups(d.groups || [])).catch(() => setGroups([]))
  }, [])

  useEffect(() => {
    if (active) return
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    fetch(`/api/search/threads?${params}`).then(r => r.json()).then(d => { setThreads(d.threads || []); if (d.typeCounts) setTypeCounts(d.typeCounts) }).catch(() => setThreads([]))
  }, [active, type])

  useEffect(() => {
    if (!active) { setResults(null); return }
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ mode: group ? 'entity' : mode })
      if (q.trim().length >= 2) params.set('q', q.trim())
      if (type) params.set('type', type)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      if (facet) params.set('facet', facet)
      if (group) params.set('group', group)
      fetch(`/api/search/messages?${params}`).then(r => r.json()).then(d => { setResults(d); if (d.typeCounts) setTypeCounts(d.typeCounts) }).catch(() => setResults(null))
    }, 250)
    return () => clearTimeout(timer)
  }, [q, mode, type, from, to, facet, group, active])

  // Browse list: apply My-languages scope, disposition (queue hides worked),
  // and sort. Untranslated-first pushes the linguist's target-language traffic up.
  const visibleThreads = useMemo(() => {
    let copy = threads.filter(t => !scope || t.languages.some(l => scope.includes(l)))
    // An officer-tag filter is a saved-view over tagged docs — it supersedes
    // the queue's unworked-only filter so tagged items stay visible once worked.
    if (tagFilter) copy = copy.filter(t => tagIndex[tagFilter]?.threads.has(t.threadId))
    else if (queueMode) copy = copy.filter(t => !dispo[t.threadId] || dispo[t.threadId] === 'flagged')
    const inScope = t => t.languages.some(l => myLangs.includes(l) && l !== 'en')
    if (sort === 'volume') copy.sort((a, b) => b.messageCount - a.messageCount)
    else if (sort === 'untranslated') copy.sort((a, b) => (inScope(b) - inScope(a)) || b.lastActivity.localeCompare(a.lastActivity))
    else copy.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
    return copy
  }, [threads, scope, myLangs, sort, queueMode, dispo, tagFilter, tagIndex])

  // Search hits: scope by My-languages client-side (source-language of the hit),
  // then by an active officer-tag filter (thread carries a doc with that tag).
  const visibleHits = useMemo(() => {
    let hits = results?.matches || []
    if (myLangs.length) hits = hits.filter(h => myLangs.includes(h.lang))
    if (tagFilter) hits = hits.filter(h => tagIndex[tagFilter]?.threads.has(h.threadId))
    return hits
  }, [results, myLangs, tagFilter, tagIndex])

  const workedCount = Object.values(dispo).filter(Boolean).length
  const newCount = threads.filter(t => !dispo[t.threadId]).length
  const facetCounts = results?.facetCounts || {}
  const mark = (id, state) => setDispo(d => ({ ...d, [id]: d[id] === state ? undefined : state }))
  const clearAll = () => { setQ(''); setFacet(null); setGroup(null); setFrom(''); setTo(''); setMode('content'); setType(null); setTagFilter(null) }
  const toggleMyLang = l => setMyLangs(s => s.includes(l) ? s.filter(x => x !== l) : [...s, l])

  if (collapsed) {
    return (
      <Box sx={{ width: 40, borderRight: '1px solid #263140', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
        <Tooltip title="Expand triage panel"><IconButton size="small" onClick={() => setCollapsed(false)} data-testid="nav-expand"><ChevronRightIcon fontSize="small" /></IconButton></Tooltip>
      </Box>
    )
  }

  return (
    <Box data-testid="nav-panel" sx={{ width: 312, flexShrink: 0, borderRight: '1px solid #263140', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Stack direction="row" alignItems="center" sx={{ px: 1.5, py: 1 }}>
        <Typography variant="overline" sx={{ color: 'text.secondary', flex: 1 }}>Search &amp; Triage</Typography>
        {(active || tagFilter) && <Button size="small" onClick={clearAll} data-testid="clear-search" sx={{ minWidth: 0, mr: 0.5, fontSize: 11 }}>Clear</Button>}
        <IconButton size="small" onClick={() => setCollapsed(true)}><ChevronLeftIcon fontSize="small" /></IconButton>
      </Stack>

      <Stack spacing={1} sx={{ px: 1.5, pb: 1 }}>
        {/* My-languages sticky scope — a linguist works their target languages */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>My languages</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {SCOPE_LANGS.map(l => {
              const on = myLangs.includes(l)
              return <Chip key={l} size="small" label={LANG_LABEL[l]} onClick={() => toggleMyLang(l)} data-testid={`mylang-${l}`}
                sx={{ height: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', color: on ? '#10151b' : 'text.primary', bgcolor: on ? 'primary.main' : 'transparent', border: '1px solid', borderColor: 'primary.main' }} />
            })}
          </Box>
        </Box>

        <TextField size="small" placeholder={mode === 'entity' ? 'Search names, selectors, passports…' : 'Search all messages — any language…'}
          value={q} onChange={e => setQ(e.target.value)} inputProps={{ 'data-testid': 'thread-search', dir: 'auto' }} />
        <ToggleButtonGroup size="small" exclusive value={mode} onChange={(e, v) => v && setMode(v)} data-testid="mode-toggle" fullWidth>
          <ToggleButton value="content" sx={{ py: 0.3, fontSize: 11 }}>Content</ToggleButton>
          <ToggleButton value="entity" sx={{ py: 0.3, fontSize: 11 }}>Entity / Selector</ToggleButton>
        </ToggleButtonGroup>

        {/* Content-type facet — the ingest lane */}
        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>Content type</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {TYPES.map(t => {
              const on = type === t.key; const Icon = t.icon; const c = typeCounts[t.key]
              return <Chip key={t.key} size="small" icon={<Icon sx={{ fontSize: 12 }} />} label={`${t.label}${c != null ? ` ${c}` : ''}`}
                onClick={() => setType(on ? null : t.key)} data-testid={`type-${t.key}`}
                sx={{ height: 22, fontSize: 10, fontWeight: 600, cursor: 'pointer', color: on ? '#10151b' : 'text.primary', bgcolor: on ? 'secondary.main' : 'transparent', border: '1px solid', borderColor: 'secondary.main' }} />
            })}
          </Box>
        </Box>

        <TextField size="small" select fullWidth value={sort} onChange={e => setSort(e.target.value)} label="Sort" disabled={active}>
          {SORTS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>

        <Button size="small" startIcon={<TuneIcon sx={{ fontSize: 15 }} />} onClick={() => setShowFilters(v => !v)} data-testid="filters-toggle" sx={{ justifyContent: 'flex-start', fontSize: 11, color: 'text.secondary' }}>
          Date range {(from || to) ? `· ${from || '…'} → ${to || '…'}` : ''}
        </Button>
        <Collapse in={showFilters}>
          <Stack direction="row" spacing={1}>
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={e => setFrom(e.target.value)} inputProps={{ 'data-testid': 'date-from' }} fullWidth />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={e => setTo(e.target.value)} inputProps={{ 'data-testid': 'date-to' }} fullWidth />
          </Stack>
        </Collapse>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>Facets</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {FACETS.map(f => {
              const on = facet === f.key; const count = facetCounts[f.key]
              return <Chip key={f.key} size="small" label={`${f.label}${count != null ? ` ${count}` : ''}`} onClick={() => setFacet(on ? null : f.key)} data-testid={`facet-${f.key}`}
                sx={{ height: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', color: on ? '#10151b' : 'text.primary', bgcolor: on ? f.color : 'transparent', border: '1px solid', borderColor: f.color }} />
            })}
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>Groups — geo-fences &amp; watchlists</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
            {groups.map(g => {
              const on = group === g.id
              return <Chip key={g.id} size="small" icon={g.kind === 'geofence' ? <PublicIcon sx={{ fontSize: 12 }} /> : <SellIcon sx={{ fontSize: 12 }} />} label={g.label} onClick={() => setGroup(on ? null : g.id)} data-testid={`group-${g.id}`}
                sx={{ height: 22, fontSize: 10, cursor: 'pointer', color: on ? '#10151b' : 'text.primary', bgcolor: on ? (g.kind === 'geofence' ? 'entity.geo' : 'entity.phone') : 'transparent', border: '1px solid', borderColor: g.kind === 'geofence' ? 'entity.geo' : 'entity.phone' }} />
            })}
          </Box>
        </Box>

        {/* Officer tags — appear once the linguist has tagged any document */}
        {officerTags.length > 0 && (
          <Box>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>Officer tags — your triage marks</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {officerTags.map(tag => {
                const on = tagFilter === tag
                return <Chip key={tag} size="small" icon={<SellIcon sx={{ fontSize: 12 }} />} label={`${tag} ${tagIndex[tag].docs}`} onClick={() => setTagFilter(on ? null : tag)} data-testid={`officertag-${tag}`}
                  sx={{ height: 22, fontSize: 10, fontWeight: 600, cursor: 'pointer', color: on ? '#10151b' : 'text.primary', bgcolor: on ? 'secondary.main' : 'transparent', border: '1px solid', borderColor: 'secondary.main' }} />
              })}
            </Box>
          </Box>
        )}
      </Stack>

      {active ? (
        <>
          <Box sx={{ px: 1.5, pb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled' }} data-testid="search-stats">
              {results ? `${visibleHits.length}${results.stats.truncated ? '+' : ''} hits · scanned ${results.stats.scanned.toLocaleString()} of ${results.stats.corpusMessages.toLocaleString()} messages · ${results.stats.threadsHit} threads · ${results.stats.tookMs} ms` : 'searching…'}
            </Typography>
          </Box>
          <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
            {results && visibleHits.length === 0 && <Typography variant="caption" sx={{ px: 1.5, color: 'text.disabled' }}>No messages match the current filters.</Typography>}
            {visibleHits.map(hit => {
              const TIcon = TYPE_META[hit.contentType] || ChatBubbleOutlineIcon
              return (
                <ListItemButton key={hit.messageId} onClick={() => onSelect(hit.thread, hit.messageId)} data-testid={`hit-${hit.messageId}`}
                  sx={{ borderBottom: '1px solid #1c242e', alignItems: 'flex-start', display: 'block', py: 0.75 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.25 }}>
                    <TIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', flex: 1 }} noWrap>{hit.thread.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>{hit.ts.slice(0, 10)}</Typography>
                  </Stack>
                  {hit.entity && <Chip size="small" label={`${hit.entity.type}: ${hit.entity.text}`} sx={{ height: 18, fontSize: 10, fontWeight: 600, mb: 0.5, color: '#10151b', bgcolor: ENTITY_COLOR[hit.entity.type] || 'grey.500' }} />}
                  <Snippet text={hit.snippet} q={hit.field === 'text' || hit.field === 'translation' ? q.trim() : ''} dir={hit.dir} />
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip size="small" variant="outlined" label={hit.lang.toUpperCase()} sx={{ height: 16, fontSize: 9 }} />
                    {hit.field === 'translation' && <Chip size="small" label="matched in EN translation" sx={{ height: 16, fontSize: 9, bgcolor: '#28405e' }} />}
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>@{hit.sender}</Typography>
                  </Stack>
                </ListItemButton>
              )
            })}
          </List>
        </>
      ) : (
        <>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', flex: 1 }} data-testid="queue-stats">
              {queueMode ? 'Queue' : 'All'} · {newCount} new · {workedCount} worked
            </Typography>
            <Button size="small" onClick={() => setQueueMode(v => !v)} data-testid="queue-toggle" sx={{ minWidth: 0, fontSize: 10 }}>{queueMode ? 'Show all' : 'Queue only'}</Button>
          </Stack>
          <List dense disablePadding sx={{ overflowY: 'auto', flex: 1 }}>
            {visibleThreads.length === 0 && <Typography variant="caption" sx={{ px: 1.5, color: 'text.disabled' }}>Queue clear — no unworked items in scope.</Typography>}
            {visibleThreads.map(t => {
              const state = dispo[t.threadId]
              const TIcon = TYPE_META[t.contentType] || ChatBubbleOutlineIcon
              return (
                <ListItemButton key={t.threadId} selected={selectedThread?.threadId === t.threadId} onClick={() => onSelect(t)} data-testid={`thread-${t.threadId}`}
                  sx={{ borderBottom: '1px solid #1c242e', alignItems: 'flex-start', display: 'block', py: 0.6, opacity: state === 'discarded' ? 0.45 : 1 }}>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <TIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, textDecoration: state === 'discarded' ? 'line-through' : 'none' }} noWrap>{t.title}</Typography>
                    {t.contentType !== 'document' && t.hasAttachment && (
                      <Tooltip title="Contains a document"><AttachFileIcon data-testid={`hasdoc-${t.threadId}`} sx={{ fontSize: 13, color: 'secondary.main', transform: 'rotate(45deg)' }} /></Tooltip>
                    )}
                    {state === 'reviewed' && <Chip size="small" label="reviewed" sx={{ height: 15, fontSize: 8, bgcolor: 'entity.geo', color: '#10151b' }} />}
                    {state === 'flagged' && <Chip size="small" label="flagged" sx={{ height: 15, fontSize: 8, bgcolor: 'entity.passport', color: '#10151b' }} />}
                  </Stack>
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.4 }}>
                    <Chip size="small" label={t.network} sx={{ height: 16, fontSize: 9 }} />
                    {t.languages.map(l => <Chip key={l} size="small" variant="outlined" label={l.toUpperCase()} sx={{ height: 16, fontSize: 9 }} />)}
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: 10 }}>{t.messageCount}</Typography>
                    <Box sx={{ flex: 1 }} />
                    <Tooltip title="Mark reviewed"><IconButton size="small" data-testid={`dispo-reviewed-${t.threadId}`} onClick={e => { e.stopPropagation(); mark(t.threadId, 'reviewed') }}><CheckCircleOutlineIcon sx={{ fontSize: 15, color: state === 'reviewed' ? 'entity.geo' : 'text.disabled' }} /></IconButton></Tooltip>
                    <Tooltip title="Flag for targeter"><IconButton size="small" data-testid={`dispo-flagged-${t.threadId}`} onClick={e => { e.stopPropagation(); mark(t.threadId, 'flagged') }}><FlagOutlinedIcon sx={{ fontSize: 15, color: state === 'flagged' ? 'entity.passport' : 'text.disabled' }} /></IconButton></Tooltip>
                    <Tooltip title="Discard"><IconButton size="small" data-testid={`dispo-discarded-${t.threadId}`} onClick={e => { e.stopPropagation(); mark(t.threadId, 'discarded') }}><RemoveCircleOutlineIcon sx={{ fontSize: 15, color: state === 'discarded' ? 'error.main' : 'text.disabled' }} /></IconButton></Tooltip>
                  </Stack>
                </ListItemButton>
              )
            })}
          </List>
        </>
      )}
    </Box>
  )
}
