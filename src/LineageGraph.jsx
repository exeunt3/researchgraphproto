import React, {
  useEffect, useRef, useCallback, useMemo, forwardRef, useImperativeHandle, useState
} from 'react'
import * as d3 from 'd3'

// Map old cluster names → protocol stack layer keys
const CLUSTER_TO_LAYER = {
  cybernetics: 'epistemology',
  process:     'ontology',
  posthuman:   'ontology',
  media:       'infrastructure',
  governance:  'coordination',
  art:         'aesthetics',
  core:        'core',
}

const LAYER_COLORS = {
  ontology:       '#5a3a8a',
  epistemology:   '#3a6ea8',
  infrastructure: '#c07a28',
  coordination:   '#2a8a7a',
  aesthetics:     '#7c5cbf',
  core:           '#0f172a',
}

const LAYER_LABELS = {
  ontology:       'Layer 1 — Ontology',
  epistemology:   'Layer 2 — Epistemology',
  infrastructure: 'Layer 3 — Infrastructure',
  coordination:   'Layer 4 — Coordination',
  aesthetics:     'Layer 5 — Aesthetics',
}

// Keep CLUSTER_COLORS as alias for backwards-compat (edge colors etc)
const CLUSTER_COLORS = Object.fromEntries(
  Object.entries(CLUSTER_TO_LAYER).map(([c, l]) => [c, LAYER_COLORS[l]])
)

const CLUSTER_ANCHORS = {
  cybernetics: { x: -320, y: -200 },
  process:     { x: -320, y:  200 },
  media:       { x:  320, y: -200 },
  posthuman:   { x:  320, y:  200 },
  governance:  { x:    0, y:  350 },
  art:         { x:    0, y: -430 },
  core:        { x:    0, y:    0 },
}

const PAPER_BG   = '#f4f0e6'
const INK        = '#1a1510'
const GRID_MINOR = '#ddd5c4'
const GRID_MAJOR = '#c8baa8'

const TIMELINE_YEAR_MIN = 1620
const TIMELINE_YEAR_MAX = 2030
const TIMELINE_X_MIN    = -720
const TIMELINE_X_MAX    =  720

// Timeline lanes keyed by protocol stack layer
const TIMELINE_LANES = {
  aesthetics:     -360,
  epistemology:   -200,
  core:            -40,
  infrastructure:  120,
  coordination:    280,
  ontology:        440,
}

// Map a node's cluster to its timeline lane Y
function getLaneY(cluster) {
  const layer = CLUSTER_TO_LAYER[cluster] || 'core'
  return TIMELINE_LANES[layer] !== undefined ? TIMELINE_LANES[layer] : 0
}

const ERA_YEAR_FALLBACKS = {
  'early-modern': 1700,
  'early-20c':    1920,
  'mid-20c':      1955,
  'late-20c':     1985,
  'contemporary': 2010,
}

const ERA_BANDS = [
  { label: 'Early Modern', year1: 1620, year2: 1900, color: 'rgba(154,80,16,0.07)' },
  { label: 'Early 20c',    year1: 1900, year2: 1945, color: 'rgba(30,80,162,0.06)' },
  { label: 'Mid 20c',      year1: 1945, year2: 1975, color: 'rgba(92,45,145,0.06)' },
  { label: 'Late 20c',     year1: 1975, year2: 2000, color: 'rgba(26,107,74,0.06)' },
  { label: 'Contemporary', year1: 2000, year2: 2030, color: 'rgba(168,32,90,0.05)' },
]

function nodeRadius(size) {
  return 7 + (size - 12) * 1.1
}

function getEdgeColor(edge, nodes) {
  const source = nodes.find(n => n.id === (edge.source?.id || edge.source))
  if (!source) return '#8090a8'
  return CLUSTER_COLORS[source.cluster] || '#8090a8'
}

function yearToX(year) {
  const t = (year - TIMELINE_YEAR_MIN) / (TIMELINE_YEAR_MAX - TIMELINE_YEAR_MIN)
  return TIMELINE_X_MIN + t * (TIMELINE_X_MAX - TIMELINE_X_MIN)
}

function getNodeYear(node) {
  if (node.key_year) return node.key_year
  return ERA_YEAR_FALLBACKS[node.era] || 1960
}

function computeTimelinePositions(nodes) {
  const positions = {}
  const byCluster = {}
  nodes.forEach(node => {
    const c = node.cluster || 'core'
    if (!byCluster[c]) byCluster[c] = []
    byCluster[c].push(node)
  })

  Object.entries(byCluster).forEach(([cluster, clusterNodes]) => {
    const laneY = getLaneY(cluster)
    clusterNodes.sort((a, b) => getNodeYear(a) - getNodeYear(b))

    const items = clusterNodes.map(node => ({
      id: node.id,
      x:  yearToX(getNodeYear(node)),
    }))

    const SPREAD = 42
    const CLUSTER_DIST = 60
    let i = 0
    while (i < items.length) {
      let j = i + 1
      while (j < items.length && items[j].x - items[i].x < CLUSTER_DIST) j++
      const group = items.slice(i, j)
      const n = group.length
      const totalH = (n - 1) * SPREAD
      group.forEach((item, k) => {
        positions[item.id] = {
          x: item.x,
          y: laneY - totalH / 2 + k * SPREAD,
        }
      })
      i = j
    }
  })

  return positions
}

const LineageGraph = forwardRef(function LineageGraph({
  data,
  selectedNode,
  hoveredNode,
  activeFilters,
  timelineMode,
  onNodeSelect,
  onNodeHover,
  onViewTransformChange,
  onNodePositionsChange,
}, ref) {
  const svgRef = useRef(null)
  const simulationRef = useRef(null)
  const zoomRef = useRef(null)
  const nodesDataRef = useRef([])
  const edgesDataRef = useRef([])
  const animFrameRef = useRef(null)
  const transformRef = useRef({ x: 0, y: 0, k: 0.85 })
  const timeRef = useRef(0)
  const reducedMotion = useRef(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
  const timelineProgressRef = useRef(timelineMode ? 1 : 0)
  const timelinePositionsRef = useRef({})
  const transitionAnimRef = useRef(null)

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.85 })
  const [simulationReady, setSimulationReady] = useState(false)
  const [edgeTooltip, setEdgeTooltip] = useState(null)
  const [tick, setTick] = useState(0)

  // Filter to thinkers + open_machine only, then apply cluster filter
  const { filteredNodes, filteredEdges } = useMemo(() => {
    const fNodes = data.nodes.filter(n =>
      (n.type === 'thinker' || n.id === 'open_machine') &&
      (n.cluster === 'core' || activeFilters.has(CLUSTER_TO_LAYER[n.cluster]))
    )
    const nodeIds = new Set(fNodes.map(n => n.id))
    const fEdges = data.edges.filter(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source
      const tgt = typeof e.target === 'object' ? e.target.id : e.target
      return nodeIds.has(src) && nodeIds.has(tgt)
    })
    return { filteredNodes: fNodes, filteredEdges: fEdges }
  }, [data, activeFilters])

  const connectedToSelected = useMemo(() => {
    if (!selectedNode) return null
    const connected = new Set([selectedNode.id])
    data.edges.forEach(e => {
      const src = typeof e.source === 'object' ? e.source.id : e.source
      const tgt = typeof e.target === 'object' ? e.target.id : e.target
      if (src === selectedNode.id) connected.add(tgt)
      if (tgt === selectedNode.id) connected.add(src)
    })
    return connected
  }, [selectedNode, data.edges])

  // Init simulation
  useEffect(() => {
    const nodes = filteredNodes.map(n => ({
      ...n,
      x: (n.x_hint || 0) * 0.8 + (Math.random() - 0.5) * 20,
      y: (n.y_hint || 0) * 0.8 + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
    }))

    const nodeMap = new Map(nodes.map(n => [n.id, n]))
    const edges = filteredEdges
      .map(e => {
        const src = typeof e.source === 'object' ? e.source.id : e.source
        const tgt = typeof e.target === 'object' ? e.target.id : e.target
        const sourceNode = nodeMap.get(src)
        const targetNode = nodeMap.get(tgt)
        if (!sourceNode || !targetNode) return null
        return { ...e, source: sourceNode, target: targetNode }
      })
      .filter(Boolean)

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(edges).id(d => d.id).distance(120).strength(0.3))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(0, 0))
      .force('x', d3.forceX(d => (CLUSTER_ANCHORS[d.cluster] || { x: 0 }).x).strength(0.1))
      .force('y', d3.forceY(d => (CLUSTER_ANCHORS[d.cluster] || { y: 0 }).y).strength(0.1))
      .force('collide', d3.forceCollide(d => nodeRadius(d.size) + 22))
      .alphaDecay(0.02)

    sim.stop()
    for (let i = 0; i < 200; i++) sim.tick()

    nodesDataRef.current = nodes
    edgesDataRef.current = edges
    simulationRef.current = sim

    timelinePositionsRef.current = computeTimelinePositions(nodes)

    const positions = {}
    nodes.forEach(n => { positions[n.id] = { x: n.x, y: n.y } })
    if (onNodePositionsChange) onNodePositionsChange(positions)

    setSimulationReady(true)
    setTick(t => t + 1)

    let running = true
    sim.on('tick', () => {
      if (!running) return
      nodesDataRef.current = nodes
      edgesDataRef.current = edges
      setTick(t => t + 1)
    })
    sim.restart()
    sim.alpha(0.3)

    setTimeout(() => {
      if (running) {
        const pos = {}
        nodes.forEach(n => { pos[n.id] = { x: n.x, y: n.y } })
        if (onNodePositionsChange) onNodePositionsChange(pos)
      }
    }, 3000)

    return () => { running = false; sim.stop() }
  }, [filteredNodes.length, filteredEdges.length])

  // Ambient drift
  useEffect(() => {
    if (!simulationReady) return
    let running = true
    const animate = (ts) => {
      if (!running) return
      timeRef.current = ts
      if (!reducedMotion.current && timelineProgressRef.current < 0.05) {
        setTick(t => t + 1)
      }
      animFrameRef.current = requestAnimationFrame(animate)
    }
    animFrameRef.current = requestAnimationFrame(animate)
    return () => { running = false; cancelAnimationFrame(animFrameRef.current) }
  }, [simulationReady])

  // Setup zoom
  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    const w = svgRef.current.clientWidth
    const h = svgRef.current.clientHeight

    const zoom = d3.zoom()
      .scaleExtent([0.15, 3])
      .on('zoom', (event) => {
        const t = event.transform
        transformRef.current = { x: t.x, y: t.y, k: t.k }
        setTransform({ x: t.x, y: t.y, k: t.k })
        if (onViewTransformChange) onViewTransformChange({ x: t.x, y: t.y, k: t.k })
      })

    svg.call(zoom)
    zoomRef.current = zoom

    const initialTransform = d3.zoomIdentity.translate(w / 2, h / 2).scale(0.85)
    svg.call(zoom.transform, initialTransform)

    return () => { svg.on('.zoom', null) }
  }, [])

  // Timeline transition
  useEffect(() => {
    if (timelineMode) {
      timelinePositionsRef.current = computeTimelinePositions(nodesDataRef.current)
    }

    const startProgress = timelineProgressRef.current
    const targetProgress = timelineMode ? 1 : 0
    const startTime = performance.now()
    const duration = 900

    if (transitionAnimRef.current) cancelAnimationFrame(transitionAnimRef.current)

    const animate = (now) => {
      const raw = Math.min((now - startTime) / duration, 1)
      const eased = raw < 0.5
        ? 4 * raw * raw * raw
        : 1 - Math.pow(-2 * raw + 2, 3) / 2
      timelineProgressRef.current = startProgress + (targetProgress - startProgress) * eased
      setTick(t => t + 1)
      if (raw < 1) {
        transitionAnimRef.current = requestAnimationFrame(animate)
      } else {
        timelineProgressRef.current = targetProgress
        setTick(t => t + 1)
      }
    }
    transitionAnimRef.current = requestAnimationFrame(animate)

    if (svgRef.current && zoomRef.current) {
      const svg = d3.select(svgRef.current)
      const w = svgRef.current.clientWidth
      const h = svgRef.current.clientHeight
      if (timelineMode) {
        const tlW = TIMELINE_X_MAX - TIMELINE_X_MIN + 240
        const tlH = 1200
        const k = Math.min(w / tlW, h / tlH) * 0.82
        svg.transition().duration(900).call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(w / 2, h / 2 - 60 * k).scale(k)
        )
      } else {
        svg.transition().duration(750).call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(w / 2, h / 2).scale(0.85)
        )
      }
    }

    return () => { if (transitionAnimRef.current) cancelAnimationFrame(transitionAnimRef.current) }
  }, [timelineMode])

  useImperativeHandle(ref, () => ({
    resetView() {
      if (!svgRef.current || !zoomRef.current) return
      const svg = d3.select(svgRef.current)
      const w = svgRef.current.clientWidth
      const h = svgRef.current.clientHeight
      svg.transition().duration(750).call(
        zoomRef.current.transform,
        d3.zoomIdentity.translate(w / 2, h / 2).scale(0.85)
      )
    },
    panTo(x, y) {
      if (!svgRef.current || !zoomRef.current) return
      const svg = d3.select(svgRef.current)
      const w = svgRef.current.clientWidth
      const h = svgRef.current.clientHeight
      svg.transition().duration(500).call(
        zoomRef.current.transform,
        d3.zoomIdentity
          .translate(w / 2 - x * transformRef.current.k, h / 2 - y * transformRef.current.k)
          .scale(transformRef.current.k)
      )
    },
  }), [])

  function getDisplayPos(nodeId) {
    const node = nodesDataRef.current.find(n => n.id === nodeId)
    if (!node) return { x: 0, y: 0 }
    const p = timelineProgressRef.current
    if (p === 0) return { x: node.x || 0, y: node.y || 0 }
    const tPos = timelinePositionsRef.current[nodeId]
    if (!tPos) return { x: node.x || 0, y: node.y || 0 }
    const fx = node.x || 0
    const fy = node.y || 0
    return {
      x: fx + (tPos.x - fx) * p,
      y: fy + (tPos.y - fy) * p,
    }
  }

  const edgePaths = useMemo(() => {
    return edgesDataRef.current.map((edge, i) => {
      const src = edge.source
      const tgt = edge.target
      if (!src || !tgt) return null
      const srcId = typeof src === 'object' ? src.id : src
      const tgtId = typeof tgt === 'object' ? tgt.id : tgt
      const sp = getDisplayPos(srcId)
      const tp = getDisplayPos(tgtId)
      const sx = sp.x, sy = sp.y
      const tx = tp.x, ty = tp.y
      const dx = tx - sx, dy = ty - sy
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const offset = edge.relation === 'conceptual_affinity' ? 25 : 35
      const mx = (sx + tx) / 2 - (dy / len) * offset
      const my = (sy + ty) / 2 + (dx / len) * offset
      return { edge, path: `M${sx},${sy} Q${mx},${my} ${tx},${ty}`, key: i }
    }).filter(Boolean)
  }, [tick])

  function getDriftOffset(node, idx) {
    if (reducedMotion.current) return { dx: 0, dy: 0 }
    if (timelineProgressRef.current > 0.05) return { dx: 0, dy: 0 }
    const phase = idx * 0.5
    const amp = 0.8
    const t = timeRef.current
    return {
      dx: Math.sin(t * 0.0006 + phase) * amp,
      dy: Math.cos(t * 0.0005 + phase * 1.3) * amp * 0.7,
    }
  }

  function getNodeOpacity(node) {
    if (!connectedToSelected) return 1
    return connectedToSelected.has(node.id) ? 1 : 0.15
  }

  function getEdgeOpacity(edge) {
    if (!connectedToSelected) return 1
    const src = typeof edge.source === 'object' ? edge.source.id : edge.source
    const tgt = typeof edge.target === 'object' ? edge.target.id : edge.target
    return (connectedToSelected.has(src) && connectedToSelected.has(tgt)) ? 1 : 0.07
  }

  function getEdgeStyle(edge) {
    const color = getEdgeColor(edge, nodesDataRef.current)
    const opacity = getEdgeOpacity(edge)
    if (edge.relation === 'direct_influence') {
      return {
        stroke: color,
        strokeWidth: 1.0 + (edge.weight || 0.7) * 0.4,
        strokeOpacity: opacity * 0.75,
        strokeDasharray: undefined,
      }
    } else if (edge.relation === 'conceptual_affinity') {
      return {
        stroke: color,
        strokeWidth: 0.7,
        strokeOpacity: opacity * 0.5,
        strokeDasharray: '8,5',
      }
    } else {
      return {
        stroke: color,
        strokeWidth: 1.1,
        strokeOpacity: opacity * 0.65,
        strokeDasharray: '3,3',
      }
    }
  }

  const showLabelAtZoom = (node) => {
    if (timelineMode) return true
    if (node.id === 'open_machine') return true
    if (transform.k > 1.4) return true
    return node.size >= 16
  }

  const transformStr = `translate(${transform.x},${transform.y}) scale(${transform.k})`
  const tlProgress = timelineProgressRef.current

  const yearTicks = []
  for (let yr = 1650; yr <= 2025; yr += 25) yearTicks.push(yr)

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ position: 'absolute', inset: 0, background: 'transparent' }}
      onClick={(e) => {
        if (e.target === svgRef.current || e.target.tagName === 'svg') onNodeSelect(null)
      }}
    >
      <defs>
        <pattern id="lg-grid-minor" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke={GRID_MINOR} strokeWidth="0.35" />
        </pattern>
        <pattern id="lg-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#lg-grid-minor)" />
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke={GRID_MAJOR} strokeWidth="0.7" />
        </pattern>
        {Object.entries(CLUSTER_COLORS).map(([cluster, color]) => (
          <marker
            key={cluster}
            id={`lg-arrow-${cluster}`}
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M1,1 L7,4 L1,7" fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
          </marker>
        ))}
        <filter id="lg-lift" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1.5" dy="1.5" stdDeviation="2" floodColor={INK} floodOpacity="0.18" />
        </filter>
      </defs>

      <g transform={transformStr}>
        <rect x="-6000" y="-6000" width="12000" height="12000" fill={PAPER_BG} />
        <rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#lg-grid-major)" />

        {/* Timeline decorations */}
        {tlProgress > 0.01 && (
          <g opacity={tlProgress}>
            {ERA_BANDS.map(band => {
              const bx = yearToX(band.year1)
              const bw = yearToX(band.year2) - bx
              return (
                <rect key={band.label} x={bx} y={-540} width={bw} height={1200} fill={band.color} />
              )
            })}

            {ERA_BANDS.map(band => {
              const x1 = yearToX(band.year1)
              const x2 = yearToX(band.year2)
              return (
                <text
                  key={`era-lbl-${band.label}`}
                  x={(x1 + x2) / 2} y={-526}
                  textAnchor="middle" fontSize={8}
                  fontFamily="'Courier New', monospace"
                  fill={INK} opacity={0.45} letterSpacing="0.12em"
                  style={{ textTransform: 'uppercase' }}
                >
                  {band.label}
                </text>
              )
            })}

            {yearTicks.map(year => {
              const x = yearToX(year)
              const isMajor = year % 100 === 0
              const isMid = year % 50 === 0
              return (
                <g key={year}>
                  <line
                    x1={x} y1={-510} x2={x} y2={680}
                    stroke={GRID_MAJOR}
                    strokeWidth={isMajor ? 0.9 : 0.4}
                    strokeDasharray={isMajor ? undefined : '4,4'}
                    opacity={isMajor ? 0.7 : 0.45}
                  />
                  {(isMajor || isMid) && (
                    <text
                      x={x} y={700}
                      textAnchor="middle"
                      fontSize={isMajor ? 9.5 : 7.5}
                      fontFamily="'Courier New', monospace"
                      fill={INK} opacity={isMajor ? 0.65 : 0.4}
                    >
                      {year}
                    </text>
                  )}
                </g>
              )
            })}

            <text
              x={(TIMELINE_X_MIN + TIMELINE_X_MAX) / 2} y={-548}
              textAnchor="middle" fontSize={10}
              fontFamily="'Courier New', monospace"
              fill={INK} opacity={0.4} letterSpacing="0.2em"
            >
              INTELLECTUAL LINEAGE — CHRONOLOGICAL
            </text>

            {Object.entries(TIMELINE_LANES).map(([layer, laneY]) => {
              const color = LAYER_COLORS[layer] || '#5a6070'
              const label = LAYER_LABELS[layer] || layer
              return (
                <g key={`lane-${layer}`}>
                  <line
                    x1={TIMELINE_X_MIN - 180} y1={laneY - 75}
                    x2={TIMELINE_X_MAX + 40} y2={laneY - 75}
                    stroke={color} strokeWidth={0.5} strokeDasharray="6,4" opacity={0.3}
                  />
                  <text
                    x={TIMELINE_X_MIN - 14} y={laneY + 5}
                    textAnchor="end" fontSize={8.5}
                    fontFamily="'Courier New', monospace"
                    fill={color} letterSpacing="0.1em" opacity={0.9}
                    style={{ textTransform: 'uppercase' }}
                  >
                    {label}
                  </text>
                  <line
                    x1={TIMELINE_X_MIN - 8} y1={laneY}
                    x2={TIMELINE_X_MIN - 2} y2={laneY}
                    stroke={color} strokeWidth={1} opacity={0.6}
                  />
                </g>
              )
            })}

            <line
              x1={TIMELINE_X_MIN - 2} y1={-510}
              x2={TIMELINE_X_MIN - 2} y2={660}
              stroke={INK} strokeWidth={0.5} opacity={0.25}
            />
          </g>
        )}

        {/* Edges */}
        <g>
          {edgePaths.map(({ edge, path, key }) => {
            const style = getEdgeStyle(edge)
            const srcCluster = (typeof edge.source === 'object' ? edge.source : nodesDataRef.current.find(n => n.id === edge.source))?.cluster || 'core'
            return (
              <path
                key={key}
                d={path}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth}
                strokeOpacity={style.strokeOpacity}
                strokeDasharray={style.strokeDasharray}
                fill="none"
                markerEnd={edge.relation === 'direct_influence' ? `url(#lg-arrow-${srcCluster})` : undefined}
                style={{ cursor: edge.note ? 'pointer' : 'default' }}
                onMouseEnter={(e) => {
                  if (edge.note) {
                    const rect = svgRef.current.getBoundingClientRect()
                    setEdgeTooltip({ note: edge.note, x: e.clientX - rect.left, y: e.clientY - rect.top })
                  }
                }}
                onMouseLeave={() => setEdgeTooltip(null)}
              />
            )
          })}
        </g>

        {/* Nodes */}
        <g>
          {nodesDataRef.current.map((node, idx) => {
            const dp = getDisplayPos(node.id)
            const { dx, dy } = getDriftOffset(node, idx)
            const nx = dp.x + dx
            const ny = dp.y + dy
            const r = nodeRadius(node.size)
            const color = CLUSTER_COLORS[node.cluster] || '#5a6070'
            const isSelected = selectedNode?.id === node.id
            const isHovered = hoveredNode?.id === node.id
            const opacity = getNodeOpacity(node)
            const isCore = node.id === 'open_machine'
            const strokeWidth = isSelected ? 2.2 : isHovered ? 1.8 : 1.2
            const scale = isSelected ? 1.08 : isHovered ? 1.04 : 1

            return (
              <g
                key={node.id}
                transform={`translate(${nx},${ny}) scale(${scale})`}
                style={{
                  opacity,
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, opacity 0.25s ease',
                }}
                filter={isSelected ? 'url(#lg-lift)' : undefined}
                onClick={(e) => { e.stopPropagation(); onNodeSelect(node) }}
                onMouseEnter={() => onNodeHover && onNodeHover(node)}
                onMouseLeave={() => onNodeHover && onNodeHover(null)}
              >
                {isCore ? (
                  <>
                    <circle r={r + 12} fill="none" stroke={color} strokeWidth={0.7} strokeDasharray="4,3" />
                    <circle r={r + 5} fill="none" stroke={color} strokeWidth={0.5} strokeOpacity={0.5} />
                    <circle r={r} fill={PAPER_BG} stroke={color} strokeWidth={2} />
                    <circle r={r * 0.55} fill="none" stroke={color} strokeWidth={0.8} />
                    <line x1={-r * 0.3} y1={0} x2={r * 0.3} y2={0} stroke={color} strokeWidth={1.2} />
                    <line x1={0} y1={-r * 0.3} x2={0} y2={r * 0.3} stroke={color} strokeWidth={1.2} />
                    {[0, 90, 180, 270].map(deg => {
                      const rad = (deg * Math.PI) / 180
                      return <line key={deg}
                        x1={Math.cos(rad) * (r + 2)} y1={Math.sin(rad) * (r + 2)}
                        x2={Math.cos(rad) * (r + 7)} y2={Math.sin(rad) * (r + 7)}
                        stroke={color} strokeWidth={1.2} />
                    })}
                    {isSelected && (
                      <circle r={r + 18} fill="none" stroke={color} strokeWidth={0.8} />
                    )}
                  </>
                ) : (
                  <>
                    <circle r={r} fill={PAPER_BG} stroke={color} strokeWidth={strokeWidth} />
                    <circle r={r - strokeWidth} fill={color} opacity={0.07} />
                    <circle r={Math.max(1.8, r * 0.22)} fill={color} opacity={0.85} />
                    {[0, 90, 180, 270].map(deg => {
                      const rad = (deg * Math.PI) / 180
                      const inner = r + 1.5
                      const outer = r + 5
                      return (
                        <line key={deg}
                          x1={Math.cos(rad) * inner} y1={Math.sin(rad) * inner}
                          x2={Math.cos(rad) * outer} y2={Math.sin(rad) * outer}
                          stroke={color} strokeWidth={0.8}
                        />
                      )
                    })}
                    {isSelected && (
                      <circle r={r + 8} fill="none" stroke={color} strokeWidth={0.9} />
                    )}
                  </>
                )}
              </g>
            )
          })}
        </g>

        {/* Labels */}
        <g pointerEvents="none">
          {nodesDataRef.current.map((node, idx) => {
            if (!showLabelAtZoom(node)) return null
            const dp = getDisplayPos(node.id)
            const { dx, dy } = getDriftOffset(node, idx)
            const nx = dp.x + dx
            const ny = dp.y + dy
            const r = nodeRadius(node.size)
            const isCore = node.id === 'open_machine'
            const isSelected = selectedNode?.id === node.id
            const opacity = getNodeOpacity(node)
            const color = CLUSTER_COLORS[node.cluster] || '#5a6070'
            const fontSize = isCore ? 13 : 10.5
            const fontFamily = "'Courier New', 'JetBrains Mono', monospace"
            const fontWeight = isCore || isSelected ? '600' : '400'
            const fill = isSelected ? color : INK
            const labelY = ny + r + (isCore ? 18 : 14)

            const rawLabel = node.label
            const label = rawLabel.length > 24 ? rawLabel.slice(0, 22) + '…' : rawLabel
            const showYear = timelineMode && node.key_year

            return (
              <g key={`label-${node.id}`}>
                <text
                  x={nx} y={labelY}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  fontWeight={fontWeight}
                  fill={fill}
                  letterSpacing="0.02em"
                  opacity={opacity * (isSelected ? 1 : 0.9)}
                  style={{ userSelect: 'none' }}
                >
                  {label}
                </text>
                {showYear && (
                  <text
                    x={nx} y={labelY + 11}
                    textAnchor="middle" fontSize={7.5}
                    fontFamily={fontFamily}
                    fill={color}
                    opacity={opacity * tlProgress * 0.6}
                    style={{ userSelect: 'none' }}
                  >
                    {node.key_year}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </g>

      {/* Edge tooltip */}
      {edgeTooltip && (
        <foreignObject x={edgeTooltip.x + 12} y={edgeTooltip.y - 36} width="230" height="90">
          <div
            xmlns="http://www.w3.org/1999/xhtml"
            style={{
              background: PAPER_BG,
              border: `1px solid ${GRID_MAJOR}`,
              borderLeft: `3px solid ${INK}`,
              padding: '8px 10px',
              fontSize: '10px',
              fontFamily: "'Courier New', monospace",
              color: '#3a3028',
              lineHeight: '1.5',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            {edgeTooltip.note}
          </div>
        </foreignObject>
      )}
    </svg>
  )
})

export default LineageGraph
