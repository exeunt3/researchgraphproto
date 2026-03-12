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

// ── V2 Layout: Three Columns ──────────────────────────────────────────────────

function computeV2Layout(nodes, width, height) {
  const sidePad = 36
  const topPad = 36
  const colGap = 20
  const colWidth = (width - sidePad * 2 - colGap * 2) / 3
  const colHeight = height - topPad * 2

  const MOVEMENTS = [
    { cluster: 'critique',     label: 'Movement I' },
    { cluster: 'archive',      label: 'Movement II' },
    { cluster: 'construction', label: 'Movement III' },
  ]

  const cardWidth = colWidth - 28
  const cardHeight = 68
  const cardGap = 8
  const cardStartY = 56 // below the header labels

  const territories = []
  const cards = []

  MOVEMENTS.forEach((movement, colIdx) => {
    const color = COLORS[movement.cluster] || '#8a7d6e'
    const tx = sidePad + colIdx * (colWidth + colGap)
    const ty = topPad

    // Collect nodes for this cluster (excluding core/open_machine)
    const clusterNodes = nodes.filter(
      n => n.cluster === movement.cluster && n.type !== 'core'
    )
    const coreNode = nodes.find(
      n => n.cluster === movement.cluster && n.type === 'core'
    )

    territories.push({
      id: `territory-${movement.cluster}`,
      cluster: movement.cluster,
      clusterColor: color,
      label: movement.label,
      coreLabel: coreNode ? coreNode.label : movement.cluster,
      coreNodeId: coreNode ? coreNode.id : null,
      x: tx,
      y: ty,
      width: colWidth,
      height: colHeight,
    })

    // Cards for concept nodes
    clusterNodes.forEach((node, cardIdx) => {
      const cx = tx + (colWidth - cardWidth) / 2
      const cy = ty + cardStartY + cardIdx * (cardHeight + cardGap)
      cards.push({
        nodeId: node.id,
        node: node,
        cluster: movement.cluster,
        clusterColor: color,
        label: node.label,
        x: cx,
        y: cy,
        width: cardWidth,
        height: cardHeight,
      })
    })
  })

  // open_machine: floating banner above all columns, centered
  const omNode = nodes.find(n => n.type === 'open_machine')
  if (omNode) {
    const omWidth = colWidth * 1.4
    const omHeight = 36
    const omX = width / 2 - omWidth / 2
    const omY = topPad / 2 - omHeight / 2
    cards.push({
      nodeId: omNode.id,
      node: omNode,
      cluster: 'core',
      clusterColor: COLORS['core'] || '#1a1510',
      label: omNode.label,
      x: omX,
      y: omY,
      width: omWidth,
      height: omHeight,
      isOpenMachine: true,
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
      // Horizontal bezier from right/left edges of cards
      // Determine direction: which card is to the left?
      const srcCenterX = src.x + src.width / 2
      const tgtCenterX = tgt.x + tgt.width / 2

      let x1, y1, x2, y2
      if (srcCenterX < tgtCenterX) {
        // source is left, connect from right edge of src to left edge of tgt
        x1 = src.x + src.width
        y1 = src.y + src.height / 2
        x2 = tgt.x
        y2 = tgt.y + tgt.height / 2
      } else {
        x1 = src.x
        y1 = src.y + src.height / 2
        x2 = tgt.x + tgt.width
        y2 = tgt.y + tgt.height / 2
      }

      const cpOffset = 60
      const cp1x = x1 + (srcCenterX < tgtCenterX ? cpOffset : -cpOffset)
      const cp1y = y1
      const cp2x = x2 + (srcCenterX < tgtCenterX ? -cpOffset : cpOffset)
      const cp2y = y2

      path = `M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`
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

  const textY = card.y + card.height / 2
  const lineHeight = card.v3 ? 10 : 11
  const totalTextHeight = lines.length * lineHeight
  const firstLineY = textY - (totalTextHeight / 2) + lineHeight / 2

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
        fill="rgba(244,240,230,0.85)"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray="4,2.5"
        strokeOpacity={strokeOpacity}
      />
      <text
        textAnchor="middle"
        fontFamily={FONT_MONO}
        fontSize={card.v3 ? 9 : 9.5}
        fill={color}
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

  return (
    <g className="territory-group">
      {/* Territory background */}
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

      {/* Territory label header (muted, small) */}
      <text
        x={territory.x + (activeVision === 'v3' ? 10 : 12)}
        y={territory.y + (activeVision === 'v3' ? 10 : 12)}
        dominantBaseline="hanging"
        fontFamily={FONT_MONO}
        fontSize={8}
        fill={TEXT_MUTED}
        letterSpacing="0.12em"
        pointerEvents="none"
      >
        {territory.label.toUpperCase()}
      </text>

      {/* Core node / movement name */}
      <text
        x={territory.x + (activeVision === 'v3' ? 10 : 14)}
        y={territory.y + (activeVision === 'v3' ? 22 : 24)}
        dominantBaseline="hanging"
        fontFamily={FONT_MONO}
        fontSize={11}
        fontWeight="bold"
        fill={color}
        letterSpacing="0.04em"
        pointerEvents="none"
      >
        {territory.coreLabel
          ? territory.coreLabel.toUpperCase().slice(0, activeVision === 'v3' ? 30 : 36)
          : ''}
      </text>
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

  // Handle card click
  const handleCardClick = useCallback((node) => {
    setSelectedNode(prev => (prev && prev.id === node.id) ? null : node)
  }, [setSelectedNode])

  // Handle background click to deselect
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

    // Compute bounding box of all layout elements
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
      </g>
    </svg>
  )
}
