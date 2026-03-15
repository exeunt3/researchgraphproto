import React, { useState } from 'react'

const PAPER_BG = '#f4f0e6'
const TEXT_PRIMARY = '#1a1510'
const TEXT_MUTED = '#8a7d6e'
const FONT_MONO = "'Courier New', 'JetBrains Mono', monospace"

const IMMANENCE_COLOR = '#6b3fa0'
const OM_COLOR = '#1a1510'

// ── Data ──────────────────────────────────────────────────────────────────────

const AREAS = [
  {
    id: 'cognitive_security',
    label: 'Cognitive Security',
    color: '#c4622d',
    existingConversation: [
      'Protection of epistemic environments,',
      'attention commons, and cognitive',
      'sovereignty. Covers information warfare,',
      'platform governance, algorithmic',
      'accountability, anti-disinformation.',
    ],
    immanenceInsert: [
      'Reframes security as commons-building.',
      'Not fortification against attack but',
      'relational cultivation of shared',
      'epistemic ground — the cognitive',
      'commons as a generative field.',
    ],
    arrowLabel: 'defense as commons',
  },
  {
    id: 'diverse_intelligence',
    label: 'Diverse Intelligence',
    color: '#2a8a7a',
    existingConversation: [
      'Non-standard cognition — artificial,',
      'animal, basal, collective, distributed.',
      'AI alignment, consciousness studies,',
      'cognitive ecology, posthumanism,',
      'morphogenetic biology.',
    ],
    immanenceInsert: [
      'Shifts from alignment-to-human-values',
      'toward a flat ecology of minds.',
      'Cognition as immanent, distributed',
      'process — not a faculty centered in',
      'any privileged substrate.',
    ],
    arrowLabel: 'flat ecology of minds',
  },
  {
    id: 'coordination_infra',
    label: 'Coordination Infrastructure',
    color: '#3d5a8a',
    existingConversation: [
      'Systems for collective action, commons',
      'governance, and democratic innovation.',
      'DAOs, Ostrom principles, cosmo-local',
      'governance, protocol design,',
      'cryptoeconomics.',
    ],
    immanenceInsert: [
      'Grounds coordination in substrate and',
      'extitutional space. Protocol design as',
      'immanent emergence from encounter —',
      'not transcendent architecture imposed',
      'from a sovereign design position.',
    ],
    arrowLabel: 'protocol as emergence',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

// Cubic bezier point at parameter t
function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t
  return u*u*u*p0 + 3*u*u*t*p1 + 3*u*t*t*p2 + t*t*t*p3
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResearchAreasGraph({ width, height, setSelectedNode }) {
  const [selected, setSelected] = useState(null)

  if (!width || !height) return null

  // ── Layout ──────────────────────────────────────────────────────────────────

  const cardGap = 28
  const areaW = Math.min(310, Math.floor((width - 80 - cardGap * 2) / 3))
  const totalCardsW = areaW * 3 + cardGap * 2
  const cardsStartX = (width - totalCardsW) / 2

  const areaCenters = [
    cardsStartX + areaW / 2,
    cardsStartX + areaW + cardGap + areaW / 2,
    cardsStartX + 2 * (areaW + cardGap) + areaW / 2,
  ]

  // Immanence node
  const imW = 252, imH = 76
  const imX = width / 2 - imW / 2
  const imY = 32

  // OM node
  const omW = 166, omH = 40
  const omX = width / 2 - omW / 2
  const omY = imY + imH + 22

  // Area cards
  const areaY = omY + omH + 60
  const areaH = Math.min(290, height - areaY - 36)

  const omBottomX = width / 2
  const omBottomY = omY + omH

  // ── Click handling ───────────────────────────────────────────────────────────

  function handleAreaClick(e, area) {
    e.stopPropagation()
    const next = selected === area.id ? null : area.id
    setSelected(next)
    if (setSelectedNode) {
      setSelectedNode(next ? {
        id: area.id,
        label: area.label,
        type: 'research_area',
        cluster: 'research',
        summary: area.existingConversation.join(' '),
        whyItMatters: area.immanenceInsert.join(' '),
        tags: ['research-area', 'immanence'],
        researchPaths: null,
      } : null)
    }
  }

  function handleBgClick() {
    setSelected(null)
    if (setSelectedNode) setSelectedNode(null)
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <svg
      style={{ width: '100%', height: '100%', display: 'block', background: PAPER_BG }}
      onClick={handleBgClick}
    >
      <defs>
        <pattern id="ra-minor" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ddd5c4" strokeWidth="0.35" />
        </pattern>
        <pattern id="ra-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#ra-minor)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c8baa8" strokeWidth="0.7" />
        </pattern>
        <marker id="ra-arrow" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="5" markerHeight="5" orient="auto">
          <path d="M 1 1 L 9 5 L 1 9 z" fill={IMMANENCE_COLOR} opacity="0.65" />
        </marker>
      </defs>

      {/* Paper background */}
      <rect x="0" y="0" width={width} height={height} fill={PAPER_BG} />
      <rect x="0" y="0" width={width} height={height} fill="url(#ra-major)" />

      {/* ── Straight arrow: Immanence → OM ── */}
      <line
        x1={width / 2} y1={imY + imH + 1}
        x2={width / 2} y2={omY - 2}
        stroke={IMMANENCE_COLOR} strokeWidth={1.4} opacity={0.5}
        markerEnd="url(#ra-arrow)"
      />
      <text
        x={width / 2 + 6} y={(imY + imH + omY) / 2}
        dominantBaseline="middle"
        fontFamily={FONT_MONO} fontSize={7} fill={IMMANENCE_COLOR}
        letterSpacing="0.1em" opacity={0.7}
      >
        CHANNELS
      </text>

      {/* ── Curved arrows: OM → each research area ── */}
      {AREAS.map((area, i) => {
        const tx = areaCenters[i]
        const ty = areaY

        // Bezier control points: fan out from OM bottom
        const cp1x = omBottomX
        const cp1y = omBottomY + (ty - omBottomY) * 0.38
        const cp2x = tx
        const cp2y = ty - (ty - omBottomY) * 0.28

        const path = `M${omBottomX},${omBottomY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty}`

        // Label at t=0.48
        const t = 0.48
        const lx = bezierPoint(omBottomX, cp1x, cp2x, tx, t)
        const ly = bezierPoint(omBottomY, cp1y, cp2y, ty, t)

        // Offset labels to avoid center collision
        const labelOffsetX = i === 0 ? -10 : i === 2 ? 10 : 0
        const labelAnchor = i === 0 ? 'end' : i === 2 ? 'start' : 'middle'

        return (
          <g key={area.id}>
            <path
              d={path}
              fill="none"
              stroke={IMMANENCE_COLOR}
              strokeWidth={1.3}
              opacity={0.45}
              strokeDasharray="5,4"
              markerEnd="url(#ra-arrow)"
            />
            <text
              x={lx + labelOffsetX} y={ly - 5}
              textAnchor={labelAnchor}
              fontFamily={FONT_MONO} fontSize={7}
              fill={IMMANENCE_COLOR} opacity={0.75}
              letterSpacing="0.05em"
            >
              {area.arrowLabel}
            </text>
          </g>
        )
      })}

      {/* ── Immanence node ── */}
      <g>
        {/* Outer glow ring */}
        <rect
          x={imX - 4} y={imY - 4}
          width={imW + 8} height={imH + 8}
          rx={6} ry={6}
          fill="none"
          stroke={IMMANENCE_COLOR}
          strokeWidth={0.5}
          opacity={0.2}
        />
        {/* Main rect */}
        <rect
          x={imX} y={imY}
          width={imW} height={imH}
          rx={4} ry={4}
          fill={`rgba(${hexToRgb(IMMANENCE_COLOR)},0.07)`}
          stroke={IMMANENCE_COLOR}
          strokeWidth={2}
        />
        {/* Inner border detail */}
        <rect
          x={imX + 4} y={imY + 4}
          width={imW - 8} height={imH - 8}
          rx={2} ry={2}
          fill="none"
          stroke={IMMANENCE_COLOR}
          strokeWidth={0.5}
          opacity={0.35}
        />
        <text
          x={width / 2} y={imY + 20}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily={FONT_MONO} fontSize={15}
          fontWeight="bold" fill={IMMANENCE_COLOR}
          letterSpacing="0.18em"
        >
          IMMANENCE
        </text>
        <text
          x={width / 2} y={imY + 38}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily={FONT_MONO} fontSize={8}
          fill={IMMANENCE_COLOR} letterSpacing="0.1em"
          opacity={0.75}
        >
          philosophical concept &amp; lineage
        </text>
        <text
          x={width / 2} y={imY + 57}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily={FONT_MONO} fontSize={7.5}
          fill={TEXT_MUTED} letterSpacing="0.06em"
          fontStyle="italic"
        >
          Spinoza · Bergson · Whitehead · Deleuze · Latour · Haraway
        </text>
      </g>

      {/* ── Open Machine node ── */}
      <g>
        <rect
          x={omX} y={omY}
          width={omW} height={omH}
          rx={3} ry={3}
          fill="rgba(26,21,16,0.9)"
          stroke={OM_COLOR}
          strokeWidth={1.5}
        />
        <text
          x={width / 2} y={omY + omH / 2 - 5}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily={FONT_MONO} fontSize={10}
          fontWeight="bold" fill="#f4f0e6"
          letterSpacing="0.12em"
        >
          OPEN MACHINE
        </text>
        <text
          x={width / 2} y={omY + omH / 2 + 7}
          textAnchor="middle" dominantBaseline="middle"
          fontFamily={FONT_MONO} fontSize={7}
          fill="rgba(244,240,230,0.55)"
          letterSpacing="0.1em"
        >
          vehicle of insertion
        </text>
      </g>

      {/* ── Research area cards ── */}
      {AREAS.map((area, i) => {
        const cardX = areaCenters[i] - areaW / 2
        const isSelected = selected === area.id
        const isDimmed = selected !== null && !isSelected
        const pad = 14

        // Content y positions (relative to areaY)
        const labelY = 14
        const titleY = 28
        const divider1Y = 54
        const descStartY = 64
        const descLineCount = area.existingConversation.length
        const sectionGapY = descStartY + descLineCount * 13 + 16
        const insertionLabelY = sectionGapY
        const divider2Y = insertionLabelY + 14
        const insertionStartY = divider2Y + 10

        return (
          <g
            key={area.id}
            onClick={(e) => handleAreaClick(e, area)}
            style={{
              cursor: 'pointer',
              opacity: isDimmed ? 0.3 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {/* Card background */}
            <rect
              x={cardX} y={areaY}
              width={areaW} height={areaH}
              rx={4} ry={4}
              fill={isSelected
                ? `rgba(${hexToRgb(area.color)},0.06)`
                : PAPER_BG}
              stroke={area.color}
              strokeWidth={isSelected ? 2 : 1.3}
            />

            {/* Left accent bar */}
            <rect
              x={cardX} y={areaY}
              width={3} height={areaH}
              rx={1.5}
              fill={area.color}
              opacity={0.65}
            />

            {/* "EXISTING CONVERSATION" */}
            <text
              x={cardX + pad + 3} y={areaY + labelY}
              dominantBaseline="hanging"
              fontFamily={FONT_MONO} fontSize={7}
              fill={TEXT_MUTED} letterSpacing="0.14em"
            >
              EXISTING CONVERSATION
            </text>

            {/* Area title */}
            <text
              x={cardX + pad + 3} y={areaY + titleY}
              dominantBaseline="hanging"
              fontFamily={FONT_MONO} fontSize={12}
              fontWeight="bold" fill={area.color}
              letterSpacing="0.06em"
            >
              {area.label}
            </text>

            {/* Divider */}
            <line
              x1={cardX + pad} y1={areaY + divider1Y}
              x2={cardX + areaW - pad} y2={areaY + divider1Y}
              stroke={area.color} strokeWidth={0.5} opacity={0.25}
            />

            {/* Description */}
            {area.existingConversation.map((line, li) => (
              <text
                key={li}
                x={cardX + pad + 3} y={areaY + descStartY + li * 13}
                dominantBaseline="hanging"
                fontFamily={FONT_MONO} fontSize={8.5}
                fill={TEXT_PRIMARY} letterSpacing="0.03em"
                opacity={0.85}
              >
                {line}
              </text>
            ))}

            {/* OM INTERVENTION label */}
            <text
              x={cardX + pad + 3} y={areaY + insertionLabelY}
              dominantBaseline="hanging"
              fontFamily={FONT_MONO} fontSize={7}
              fill={IMMANENCE_COLOR} letterSpacing="0.14em"
            >
              OM INTERVENTION
            </text>

            {/* Divider */}
            <line
              x1={cardX + pad} y1={areaY + divider2Y}
              x2={cardX + areaW - pad} y2={areaY + divider2Y}
              stroke={IMMANENCE_COLOR} strokeWidth={0.5} opacity={0.3}
            />

            {/* Immanence insertion text */}
            {area.immanenceInsert.map((line, li) => (
              <text
                key={li}
                x={cardX + pad + 3} y={areaY + insertionStartY + li * 13}
                dominantBaseline="hanging"
                fontFamily={FONT_MONO} fontSize={8.5}
                fill={IMMANENCE_COLOR} letterSpacing="0.03em"
                opacity={0.82}
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
