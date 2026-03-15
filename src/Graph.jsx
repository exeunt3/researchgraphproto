import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import * as d3 from 'd3'
import { COLORS } from './data.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAPER_BG = '#f4f0e6'
const TEXT_PRIMARY = '#1a1510'
const TEXT_MUTED = '#8a7d6e'
const FONT_MONO = "'Courier New', 'JetBrains Mono', monospace"

function hexToRgba(hex, alpha) {
  if (!hex || hex[0] !== '#') return `rgba(128,128,128,${alpha})`
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Split a label at a natural word break for two lines
function splitLabel(label, maxChars = 20) {
  if (label.length <= maxChars) return [label]
  const words = label.split(' ')
  let best = words[0]
  let rest = words.slice(1).join(' ')
  for (let i = 1; i < words.length; i++) {
    const candidate = words.slice(0, i + 1).join(' ')
    if (candidate.length <= maxChars) {
      best = candidate
      rest = words.slice(i + 1).join(' ')
    } else {
      break
    }
  }
  return rest.length > 0 ? [best, rest] : [best]
}


// ── V2 Layout: Three Node Clouds ─────────────────────────────────────────────

function computeV2Layout(nodes, width, height) {
  const MOVEMENTS = [
    { cluster: 'critique',     label: 'Movement 1' },
    { cluster: 'archive',      label: 'Movement 2' },
    { cluster: 'construction', label: 'Movement 3' },
  ]

  const cardW = 118
  const cardH = 50
  const coreW = 150
  const coreH = 44

  const territories = []
  const cards = []

  MOVEMENTS.forEach((movement, colIdx) => {
    const color = COLORS[movement.cluster] || '#8a7d6e'

    // Zone center: spread wide so clouds have clear breathing room
    const zoneCx = width * (0.12 + colIdx * 0.38)
    const zoneCy = height * 0.50

    const clusterNodes = nodes.filter(
      n => n.cluster === movement.cluster && n.type !== 'core'
    )
    const coreNode = nodes.find(
      n => n.cluster === movement.cluster && n.type === 'core'
    )

    const N = clusterNodes.length
    const nodeR = 16           // circle node radius
    const nodeBox = nodeR * 2  // square bounding box for hit detection / zoom-fit
    // Ring radius grows with node count; circles are compact so can be tighter
    const ringR = Math.max(90, N * 18)

    territories.push({
      id: `territory-${movement.cluster}`,
      cluster: movement.cluster,
      clusterColor: color,
      label: movement.label,
      coreLabel: coreNode ? coreNode.label : movement.cluster,
      coreNodeId: coreNode ? coreNode.id : null,
      cx: zoneCx,
      labelY: zoneCy - ringR - 52,
      // bounds used by zoom-to-fit (include label text below circles)
      x: zoneCx - ringR - nodeBox,
      y: zoneCy - ringR - nodeBox,
      width: (ringR + nodeBox) * 2,
      height: (ringR + nodeBox) * 2 + 28,
    })

    // Core node (movement title) stays a rectangle at zone center
    if (coreNode) {
      cards.push({
        nodeId: coreNode.id,
        node: coreNode,
        cluster: movement.cluster,
        clusterColor: color,
        label: coreNode.label,
        x: zoneCx - coreW / 2,
        y: zoneCy - coreH / 2,
        width: coreW,
        height: coreH,
        isCore: true,
      })
    }

    // Concept nodes as circles orbiting the core rectangle
    clusterNodes.forEach((node, i) => {
      const angle = (i / N) * Math.PI * 2 - Math.PI / 2 + colIdx * 0.22
      const r = ringR + (i % 2 === 1 ? 18 : 0)
      const nx = zoneCx + r * Math.cos(angle)
      const ny = zoneCy + r * Math.sin(angle)
      cards.push({
        nodeId: node.id,
        node: node,
        cluster: movement.cluster,
        clusterColor: color,
        label: node.label,
        x: nx - nodeBox / 2,
        y: ny - nodeBox / 2,
        width: nodeBox,
        height: nodeBox,
        isCircleNode: true,
        nodeRadius: nodeR,
      })
    })
  })

  // Open Machine: floating at top center
  const omNode = nodes.find(n => n.type === 'open_machine')
  if (omNode) {
    const omW = 148
    const omH = 34
    cards.push({
      nodeId: omNode.id,
      node: omNode,
      cluster: 'core',
      clusterColor: COLORS['core'] || '#1a1510',
      label: omNode.label,
      x: width / 2 - omW / 2,
      y: 28,
      width: omW,
      height: omH,
      isOpenMachine: true,
      wz: 0,
    })
  }

  return { territories, cards }
}

// ── V3 Layout: Five Horizontal Bands ─────────────────────────────────────────

function computeV3Layout(nodes, width, height) {
  const sidePad = 36
  const topPad = 28
  const bandGap = 10
  const bandWidth = width - sidePad * 2
  const bandHeight = (height - topPad * 2 - bandGap * 4) / 5

  const LAYERS = [
    { layer: 5, cluster: 'aesthetics',     label: 'Layer 5', name: 'Aesthetics & Phenomenology' },
    { layer: 4, cluster: 'coordination',   label: 'Layer 4', name: 'Coordination & Governance' },
    { layer: 3, cluster: 'infrastructure', label: 'Layer 3', name: 'Infrastructure' },
    { layer: 2, cluster: 'epistemology',   label: 'Layer 2', name: 'Epistemology & Cognition' },
    { layer: 1, cluster: 'ontology',       label: 'Layer 1', name: 'Ontology' },
  ]

  const cardWidth = 120
  const cardGap = 10
  const cardStartX = sidePad + 172

  const territories = []
  const cards = []

  LAYERS.forEach((layerDef, layerIdx) => {
    const color = COLORS[layerDef.cluster] || '#8a7d6e'
    const tx = sidePad
    const ty = topPad + layerIdx * (bandHeight + bandGap)

    const coreNode = nodes.find(
      n => n.cluster === layerDef.cluster && n.type === 'core'
    )
    const conceptNodes = nodes.filter(
      n => n.cluster === layerDef.cluster && n.type !== 'core'
    )

    territories.push({
      id: `territory-layer${layerDef.layer}`,
      cluster: layerDef.cluster,
      clusterColor: color,
      label: layerDef.label,
      layerNum: layerDef.layer,
      coreLabel: coreNode ? coreNode.label : layerDef.name,
      coreNodeId: coreNode ? coreNode.id : null,
      x: tx,
      y: ty,
      width: bandWidth,
      height: bandHeight,
    })

    // Horizontal cards
    conceptNodes.forEach((node, cardIdx) => {
      const cx = cardStartX + cardIdx * (cardWidth + cardGap)
      const ch = bandHeight - 20
      const cy = ty + 10
      cards.push({
        nodeId: node.id,
        node: node,
        cluster: layerDef.cluster,
        clusterColor: color,
        label: node.label,
        x: cx,
        y: cy,
        width: cardWidth,
        height: ch,
        v3: true,
      })
    })
  })

  // open_machine: vertical side element to the right of all bands
  const omNode = nodes.find(n => n.type === 'open_machine')
  if (omNode) {
    const omW = 36
    const omH = (bandHeight + bandGap) * 5 - bandGap
    const omX = width - sidePad + 8
    const omY = topPad
    cards.push({
      nodeId: omNode.id,
      node: omNode,
      cluster: 'core',
      clusterColor: COLORS['core'] || '#1a1510',
      label: omNode.label,
      x: omX,
      y: omY,
      width: omW,
      height: omH,
      isOpenMachine: true,
      v3Side: true,
    })
  }

  return { territories, cards }
}

// ── Connection computation ────────────────────────────────────────────────────

function computeConnections(edges, cards, activeVision) {
  const cardByNodeId = {}
  cards.forEach(c => { cardByNodeId[c.nodeId] = c })

  const connections = []

  for (const edge of edges) {
    const src = cardByNodeId[edge.source]
    const tgt = cardByNodeId[edge.target]
    if (!src || !tgt) continue

    // Only cross-territory connections
    if (src.cluster === tgt.cluster) continue

    const color = src.clusterColor

    let path = ''
    if (activeVision === 'v2') {
      // Center-to-center bezier — works for both circle nodes and rectangles
      const x1 = src.x + src.width / 2
      const y1 = src.y + src.height / 2
      const x2 = tgt.x + tgt.width / 2
      const y2 = tgt.y + tgt.height / 2
      const dx = x2 - x1
      const cpOffset = Math.max(60, Math.abs(dx) * 0.3)
      const sign = dx >= 0 ? 1 : -1
      const cp1x = x1 + sign * cpOffset
      const cp2x = x2 - sign * cpOffset

      path = `M${x1},${y1} C${cp1x},${y1} ${cp2x},${y2} ${x2},${y2}`
    } else {
      // V3: vertical bezier (concept-to-concept cross-layer)
      // Skip layer-to-layer applied_extension — those are drawn as arrows separately
      const srcLayerNode = src.node
      const tgtLayerNode = tgt.node
      if (
        edge.type === 'applied_extension' &&
        srcLayerNode && tgtLayerNode &&
        srcLayerNode.type === 'core' && tgtLayerNode.type === 'core'
      ) {
        continue
      }

      // For cross-layer concept connections: draw vertical bezier
      const x1 = src.x + src.width / 2
      const x2 = tgt.x + tgt.width / 2
      // Connect from bottom of source to top of target (or vice versa)
      const srcBottom = src.y + src.height
      const tgtTop = tgt.y
      const srcTop = src.y
      const tgtBottom = tgt.y + tgt.height

      let y1, y2
      if (srcBottom < tgtTop) {
        y1 = srcBottom
        y2 = tgtTop
      } else if (tgtBottom < srcTop) {
        y1 = srcTop
        y2 = tgtBottom
      } else {
        y1 = src.y + src.height / 2
        y2 = tgt.y + tgt.height / 2
      }

      const cpY = (y1 + y2) / 2
      path = `M${x1},${y1} C${x1},${cpY} ${x2},${cpY} ${x2},${y2}`
    }

    let strokeWidth = 0.7
    let opacity = 0.35
    let strokeDasharray = null
    if (edge.type === 'direct_influence') {
      strokeWidth = 1.0
      opacity = 0.5
      strokeDasharray = null
    } else if (edge.type === 'conceptual_affinity') {
      strokeWidth = 0.7
      opacity = 0.35
      strokeDasharray = '8,5'
    } else if (edge.type === 'applied_extension') {
      strokeWidth = 1.0
      opacity = 0.5
      strokeDasharray = '3,3'
    }

    connections.push({
      id: `${edge.source}->${edge.target}`,
      path,
      type: edge.type,
      color,
      strokeWidth,
      opacity,
      strokeDasharray,
      sourceId: edge.source,
      targetId: edge.target,
    })
  }

  return connections
}

// ── V3 vertical layer arrows (applied_extension between layers) ───────────────

function computeLayerArrows(edges, territories) {
  const territoryByCluster = {}
  territories.forEach(t => { territoryByCluster[t.cluster] = t })

  // Find applied_extension edges between core layer nodes
  const layerOrder = ['ontology', 'epistemology', 'infrastructure', 'coordination', 'aesthetics']
  const arrows = []

  // Draw arrows on the right side of the bands
  for (let i = 0; i < layerOrder.length - 1; i++) {
    const fromCluster = layerOrder[i]
    const toCluster = layerOrder[i + 1]
    const from = territoryByCluster[fromCluster]
    const to = territoryByCluster[toCluster]
    if (!from || !to) continue

    const x = from.x + from.width + 18
    const y1 = from.y + from.height + 2
    const y2 = to.y - 2

    arrows.push({
      id: `layer-arrow-${fromCluster}-${toCluster}`,
      x1: x, y1,
      x2: x, y2,
      color: COLORS[toCluster] || '#8a7d6e',
    })
  }

  return arrows
}

// ── Main layout computation ───────────────────────────────────────────────────

function computeLayout(nodes, edges, activeVision, width, height, activeFilters) {
  if (!width || !height || !nodes || nodes.length === 0) {
    return { territories: [], cards: [], connections: [], layerArrows: [] }
  }

  // Filter nodes by activeFilters
  const visibleNodes = nodes.filter(
    n => n.type === 'open_machine' || n.cluster === 'core' || activeFilters.has(n.cluster)
  )

  let territories, cards
  if (activeVision === 'v2') {
    ;({ territories, cards } = computeV2Layout(visibleNodes, width, height))
  } else {
    ;({ territories, cards } = computeV3Layout(visibleNodes, width, height))
  }

  const connections = computeConnections(edges, cards, activeVision)
  const layerArrows = activeVision === 'v3' ? computeLayerArrows(edges, territories) : []

  return { territories, cards, connections, layerArrows }
}

// ── Card component (React SVG) ────────────────────────────────────────────────

function CardRect({ card, isSelected, isRelated, isAnySelected, onClick }) {
  const lines = splitLabel(card.label, card.v3 ? 16 : 20)
  const color = card.clusterColor
  const dimmed = isAnySelected && !isRelated && !isSelected

  let fillOpacity = 1
  let cardOpacity = dimmed ? 0.2 : 1
  let strokeWidth = isSelected ? 1.8 : 0.8
  let strokeOpacity = isSelected ? 1.0 : 0.7

  if (card.isOpenMachine) {
    return (
      <g
        className="card-group"
        onClick={(e) => { e.stopPropagation(); onClick(card.node) }}
        style={{ cursor: 'pointer', opacity: cardOpacity }}
      >
        <rect
          x={card.x}
          y={card.y}
          width={card.width}
          height={card.height}
          rx={3}
          ry={3}
          fill={hexToRgba(color, 0.08)}
          stroke={color}
          strokeWidth={isSelected ? 1.8 : 1.2}
          strokeDasharray={null}
        />
        {card.v3Side ? (
          // Vertical text for V3 side panel
          <text
            x={card.x + card.width / 2}
            y={card.y + card.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={FONT_MONO}
            fontSize={8}
            fill={color}
            letterSpacing="0.12em"
            transform={`rotate(-90, ${card.x + card.width / 2}, ${card.y + card.height / 2})`}
            pointerEvents="none"
          >
            {card.label.toUpperCase()}
          </text>
        ) : (
          <text
            x={card.x + card.width / 2}
            y={card.y + card.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={FONT_MONO}
            fontSize={9.5}
            fill={color}
            letterSpacing="0.1em"
            fontWeight="bold"
            pointerEvents="none"
          >
            {card.label.toUpperCase()}
          </text>
        )}
      </g>
    )
  }

  // ── Circle node (concept nodes in v2 cloud layout) ────────────────────────
  if (card.isCircleNode) {
    const cx = card.x + card.width / 2
    const cy = card.y + card.height / 2
    const r = card.nodeRadius
    const sw = isSelected ? 2.2 : 1.2
    const circleLines = splitLabel(card.label, 13)
    const finalOpacity = cardOpacity
    return (
      <g
        className="card-group"
        onClick={(e) => { e.stopPropagation(); onClick(card.node) }}
        style={{ cursor: 'pointer', opacity: finalOpacity, transition: 'opacity 0.2s' }}
      >
        {/* Invisible hit rect so label area is also clickable */}
        <rect
          x={cx - r - 2} y={cy - r - 2}
          width={r * 2 + 4} height={r * 2 + 4 + circleLines.length * 11 + 6}
          fill="transparent" stroke="none"
        />
        {/* Outer selection ring */}
        {isSelected && (
          <circle cx={cx} cy={cy} r={r + 8}
            fill="none" stroke={color} strokeWidth={0.9} strokeOpacity={0.5}
          />
        )}
        {/* Main node circle — paper background */}
        <circle
          cx={cx} cy={cy} r={r}
          fill={PAPER_BG}
          stroke={color}
          strokeWidth={sw}
        />
        {/* Inner color tint */}
        <circle cx={cx} cy={cy} r={r - sw} fill={color} opacity={0.07} />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={Math.max(1.8, r * 0.22)} fill={color} opacity={0.85} />
        {/* Cardinal tick marks */}
        {[0, 90, 180, 270].map(deg => {
          const rad = (deg * Math.PI) / 180
          return (
            <line key={deg}
              x1={cx + Math.cos(rad) * (r + 1.5)} y1={cy + Math.sin(rad) * (r + 1.5)}
              x2={cx + Math.cos(rad) * (r + 5)}   y2={cy + Math.sin(rad) * (r + 5)}
              stroke={color} strokeWidth={0.8}
            />
          )
        })}
        {/* Per-path indicator dots — subtle, non-text, just signals branch count */}
        {!isSelected && card.node.researchPaths && card.node.researchPaths.map((_, i) => {
          const N = card.node.researchPaths.length
          const angle = (i / N) * Math.PI * 2 - Math.PI / 2
          return (
            <circle key={i}
              cx={cx + Math.cos(angle) * (r + 7)}
              cy={cy + Math.sin(angle) * (r + 7)}
              r={1.4} fill={color} opacity={0.4}
            />
          )
        })}
        {circleLines.map((line, i) => (
          <text
            key={i}
            x={cx}
            y={cy + r + 6 + i * 8}
            textAnchor="middle"
            dominantBaseline="hanging"
            fontFamily={FONT_MONO}
            fontSize={8}
            fill={TEXT_PRIMARY}
            letterSpacing="0.06em"
            pointerEvents="none"
          >
            {line.toUpperCase()}
          </text>
        ))}
      </g>
    )
  }

  const textY = card.y + card.height / 2
  const lineHeight = card.v3 ? 10 : 11
  const totalTextHeight = lines.length * lineHeight
  const firstLineY = textY - (totalTextHeight / 2) + lineHeight / 2

  // Core hub nodes (movement centers in cloud layout) get solid fill + color text
  const isCore = !!card.isCore
  const rectFill = isCore ? hexToRgba(color, 0.18) : hexToRgba(color, 0.09)
  const rectDash = isCore ? null : '4,2.5'
  const rectStrokeW = isCore ? (isSelected ? 2.2 : 1.5) : strokeWidth
  const textFill = isCore ? color : TEXT_PRIMARY
  const textWeight = isCore ? 'bold' : undefined

  return (
    <g
      className="card-group"
      onClick={(e) => { e.stopPropagation(); onClick(card.node) }}
      style={{ cursor: 'pointer', opacity: cardOpacity, transition: 'opacity 0.2s' }}
    >
      <rect
        x={card.x}
        y={card.y}
        width={card.width}
        height={card.height}
        rx={3}
        ry={3}
        fill={rectFill}
        stroke={color}
        strokeWidth={rectStrokeW}
        strokeDasharray={rectDash || undefined}
        strokeOpacity={strokeOpacity}
      />
      <text
        textAnchor="middle"
        fontFamily={FONT_MONO}
        fontSize={card.v3 ? 9 : 9.5}
        fill={textFill}
        fontWeight={textWeight}
        letterSpacing="0.06em"
        pointerEvents="none"
      >
        {lines.map((line, i) => (
          <tspan
            key={i}
            x={card.x + card.width / 2}
            y={firstLineY + i * lineHeight}
          >
            {line.toUpperCase()}
          </tspan>
        ))}
      </text>
    </g>
  )
}

// ── Territory component ───────────────────────────────────────────────────────

function TerritoryRect({ territory, activeVision }) {
  const color = territory.clusterColor

  // V2 cloud layout: no background shape, just a floating zone label above the cloud
  if (activeVision === 'v2') {
    return (
      <g className="territory-group">
        <text
          x={territory.cx}
          y={territory.labelY}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontFamily={FONT_MONO}
          fontSize={8}
          fill={TEXT_MUTED}
          letterSpacing="0.14em"
          pointerEvents="none"
        >
          {territory.label.toUpperCase()}
        </text>
      </g>
    )
  }

  // V3 band layout: keep the rectangle
  return (
    <g className="territory-group">
      <rect
        x={territory.x}
        y={territory.y}
        width={territory.width}
        height={territory.height}
        rx={4}
        ry={4}
        fill={hexToRgba(color, 0.04)}
        stroke={color}
        strokeWidth={1}
      />
      <text
        x={territory.x + 10}
        y={territory.y + 10}
        dominantBaseline="hanging"
        fontFamily={FONT_MONO}
        fontSize={8}
        fill={TEXT_MUTED}
        letterSpacing="0.12em"
        pointerEvents="none"
      >
        {territory.label.toUpperCase()}
      </text>
      <text
        x={territory.x + 10}
        y={territory.y + 22}
        dominantBaseline="hanging"
        fontFamily={FONT_MONO}
        fontSize={11}
        fontWeight="bold"
        fill={color}
        letterSpacing="0.04em"
        pointerEvents="none"
      >
        {territory.coreLabel
          ? territory.coreLabel.toUpperCase().slice(0, 30)
          : ''}
      </text>
    </g>
  )
}


// ── Research Path Cards (radial node-cards shown when concept node is selected) ─

function ResearchPathCards({ card }) {
  const cx = card.x + card.width / 2
  const cy = card.y + card.height / 2
  const r = card.nodeRadius || 16
  const color = card.clusterColor
  const paths = card.node.researchPaths
  const N = paths.length
  const cardW = 112
  // Radius large enough that cards don't overlap each other tangentially
  const cardR = Math.max(85, (N * (cardW + 10)) / (2 * Math.PI))

  return (
    <g id="research-path-cards">
      {paths.map((path, i) => {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2
        const pcx = cx + Math.cos(angle) * cardR
        const pcy = cy + Math.sin(angle) * cardR
        const titleLines = splitLabel(path.title, 17)
        const lineH = 10
        const textBlockH = titleLines.length * lineH
        const cardH = textBlockH + 12
        const textStartY = pcy - textBlockH / 2 + lineH / 2

        return (
          <g key={i}>
            {/* Spoke from circle edge to card — card background covers line end */}
            <line
              x1={cx + Math.cos(angle) * (r + 2)}
              y1={cy + Math.sin(angle) * (r + 2)}
              x2={pcx}
              y2={pcy}
              stroke={color} strokeWidth={0.9} opacity={0.45}
            />
            <rect
              x={pcx - cardW / 2}
              y={pcy - cardH / 2}
              width={cardW}
              height={cardH}
              rx={3} ry={3}
              fill={PAPER_BG}
              stroke={color}
              strokeWidth={1.5}
            />
            {titleLines.map((line, li) => (
              <text key={li}
                x={pcx}
                y={textStartY + li * lineH}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily={FONT_MONO}
                fontSize={8}
                fontWeight="bold"
                fill={color}
                letterSpacing="0.05em"
                pointerEvents="none"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}

// ── Main Graph component ──────────────────────────────────────────────────────

export default function Graph({
  nodes,
  edges,
  activeFilters,
  selectedNode,
  setSelectedNode,
  activeVision,
  onTransformChange,
  width,
  height,
}) {
  const svgRef = useRef(null)
  const zoomRef = useRef(null)
  const didFitRef = useRef(false)


  // Compute layout from props
  const layout = useMemo(() => {
    return computeLayout(nodes, edges, activeVision, width, height, activeFilters)
  }, [nodes, edges, activeVision, width, height, activeFilters])


  // Build adjacency set for selected node
  const relatedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set()
    const related = new Set([selectedNode.id])
    for (const e of edges) {
      if (e.source === selectedNode.id) related.add(e.target)
      if (e.target === selectedNode.id) related.add(e.source)
    }
    return related
  }, [selectedNode, edges])

  const isAnySelected = !!selectedNode

  const handleCardClick = useCallback((node) => {
    setSelectedNode(prev => (prev && prev.id === node.id) ? null : node)
  }, [setSelectedNode])

  const handleBgClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])


  // Set up D3 zoom on the SVG
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return

    const svg = d3.select(svgEl)

    const zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .filter((event) => !event.ctrlKey && !event.button)
      .on('zoom', (event) => {
        const t = event.transform
        const canvas = svg.select('#canvas')
        canvas.attr('transform', `translate(${t.x},${t.y}) scale(${t.k})`)
        if (onTransformChange) {
          onTransformChange({ x: t.x, y: t.y, k: t.k })
        }
      })

    svg.call(zoom)
    zoomRef.current = zoom

    return () => {
      svg.on('.zoom', null)
    }
  }, [onTransformChange])

  // Zoom-to-fit on mount and when vision/dimensions change
  useEffect(() => {
    const svgEl = svgRef.current
    const zoom = zoomRef.current
    if (!svgEl || !zoom || !width || !height) return
    if (layout.territories.length === 0 && layout.cards.length === 0) return

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const t of layout.territories) {
      minX = Math.min(minX, t.x)
      minY = Math.min(minY, t.y)
      maxX = Math.max(maxX, t.x + t.width)
      maxY = Math.max(maxY, t.y + t.height)
    }
    for (const c of layout.cards) {
      minX = Math.min(minX, c.x)
      minY = Math.min(minY, c.y)
      maxX = Math.max(maxX, c.x + c.width)
      maxY = Math.max(maxY, c.y + c.height)
    }

    if (!isFinite(minX)) return

    const contentW = maxX - minX
    const contentH = maxY - minY
    const pad = 40

    const scaleX = (width - pad * 2) / contentW
    const scaleY = (height - pad * 2) / contentH
    const k = Math.min(scaleX, scaleY, 1)

    const tx = (width - contentW * k) / 2 - minX * k
    const ty = (height - contentH * k) / 2 - minY * k

    const svg = d3.select(svgEl)
    svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k))
  }, [layout, width, height, activeVision])

  return (
    <svg
      ref={svgRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: '#f4f0e6',
        cursor: 'default',
      }}
      onClick={handleBgClick}
    >
      <defs>
        {/* Graph paper grid patterns */}
        <pattern id="grid-minor" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ddd5c4" strokeWidth="0.35" />
        </pattern>
        <pattern id="grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#grid-minor)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#c8baa8" strokeWidth="0.7" />
        </pattern>
        {/* Drop shadow filter for selected cards */}
        <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.15)" />
        </filter>
        {/* Arrowhead for layer arrows */}
        <marker
          id="layer-arrow-head"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M1,1 L7,4 L1,7" fill="none" stroke={TEXT_MUTED} strokeWidth="1.2" />
        </marker>
      </defs>

      {/* Main canvas group — managed by D3 zoom */}
      <g id="canvas">
        {/* ── Graph paper background (scrolls/zooms with content) ── */}
        <rect x="-6000" y="-6000" width="12000" height="12000" fill="#f4f0e6" />
        <rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#grid-major)" />

        {/* ── Connections (drawn behind everything) ── */}
        <g id="connections">
          {layout.connections.map(conn => (
            <path
              key={conn.id}
              d={conn.path}
              fill="none"
              stroke={conn.color}
              strokeWidth={conn.strokeWidth}
              opacity={conn.opacity}
              strokeDasharray={conn.strokeDasharray || undefined}
            />
          ))}
        </g>

        {/* ── V3 Layer arrows ── */}
        {layout.layerArrows && layout.layerArrows.map(arrow => (
          <g key={arrow.id}>
            <line
              x1={arrow.x1}
              y1={arrow.y1}
              x2={arrow.x2}
              y2={arrow.y2}
              stroke={arrow.color}
              strokeWidth={1.2}
              opacity={0.6}
              markerEnd="url(#layer-arrow-head)"
            />
          </g>
        ))}

        {/* ── Territory rectangles ── */}
        <g id="territories">
          {layout.territories.map(territory => (
            <TerritoryRect
              key={territory.id}
              territory={territory}
              activeVision={activeVision}
            />
          ))}
        </g>

        {/* ── Cards ── */}
        <g id="cards">
          {layout.cards.map(card => {
            const isSelected = !!(selectedNode && selectedNode.id === card.nodeId)
            const isRelated = relatedNodeIds.has(card.nodeId)
            return (
              <CardRect
                key={card.nodeId}
                card={card}
                isSelected={isSelected}
                isRelated={isRelated}
                isAnySelected={isAnySelected}
                onClick={handleCardClick}
              />
            )
          })}
        </g>

        {/* ── Research path cards — top layer so they're never clipped ── */}
        {selectedNode && (() => {
          const card = layout.cards.find(c => c.nodeId === selectedNode.id)
          if (!card || !card.isCircleNode || !card.node.researchPaths) return null
          return <ResearchPathCards card={card} />
        })()}

      </g>
    </svg>
  )
}
