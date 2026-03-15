import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { VISION_2, VISION_3 } from './data.js'
import lineageData from './lineage.json'
import FilterBar from './FilterBar.jsx'
import DetailPanel from './DetailPanel.jsx'
import MiniMap from './MiniMap.jsx'
import Graph from './Graph.jsx'
import LineageGraph from './LineageGraph.jsx'
import ResearchAreasGraph from './ResearchAreasGraph.jsx'

const FILTERBAR_HEIGHT = 44

const LINEAGE_CLUSTERS = ['ontology', 'epistemology', 'infrastructure', 'coordination', 'aesthetics']

const CLUSTER_TO_LAYER = {
  cybernetics: 'epistemology',
  process:     'ontology',
  posthuman:   'ontology',
  media:       'infrastructure',
  governance:  'coordination',
  art:         'aesthetics',
  core:        'core',
}

const LINEAGE_CLUSTER_COLORS = {
  cybernetics: '#3a6ea8',
  process:     '#5a3a8a',
  posthuman:   '#5a3a8a',
  media:       '#c07a28',
  governance:  '#2a8a7a',
  art:         '#7c5cbf',
  core:        '#0f172a',
}

export default function App() {
  const [activeVision, setActiveVision] = useState('v2')
  const [selectedNode, setSelectedNode] = useState(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })

  // Actual SVG dimensions tracked via ResizeObserver
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight - FILTERBAR_HEIGHT : 756,
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setDimensions({ width, height })
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const dataset = activeVision === 'v2' ? VISION_2 : activeVision === 'v3' ? VISION_3 : null
  const isResearchAreas = activeVision === 'research'

  // Initialize activeFilters to all clusters in the current dataset
  const [activeFilters, setActiveFilters] = useState(() => {
    const seen = new Set()
    for (const n of VISION_2.nodes) {
      if (n.cluster !== 'core') seen.add(n.cluster)
    }
    return seen
  })

  // Lineage-specific state
  const [lineageFilters, setLineageFilters] = useState(() => new Set(LINEAGE_CLUSTERS))
  const [lineageTimelineMode, setLineageTimelineMode] = useState(true)
  const [lineageNodePositions, setLineageNodePositions] = useState(null)

  const lineageGraphRef = useRef(null)

  // When vision changes, reset filters and selected node
  function handleSetActiveVision(v) {
    setActiveVision(v)
    setSelectedNode(null)
    setTransform({ x: 0, y: 0, k: 1 })
    if (v === 'v2' || v === 'v3' || v === 'research') {
      const seen = new Set()
      if (v === 'research') return
      const ds = v === 'v2' ? VISION_2 : VISION_3
      for (const n of ds.nodes) {
        if (n.cluster !== 'core') seen.add(n.cluster)
      }
      setActiveFilters(seen)
    }
  }

  const handleTransformChange = useCallback((t) => {
    setTransform({ x: t.x, y: t.y, k: t.k })
  }, [])

  const handleLineageNodePositions = useCallback((positions) => {
    setLineageNodePositions(positions)
  }, [])

  // Build minimap node list from the dataset
  const minimapNodes = useMemo(() => {
    if (activeVision === 'lineage' || isResearchAreas) return null
    return dataset ? dataset.nodes : null
  }, [activeVision, dataset, isResearchAreas])

  // For lineage minimap, build nodes from positions
  const lineageMinimapNodes = useMemo(() => {
    if (activeVision !== 'lineage' || !lineageNodePositions) return null
    return lineageData.nodes
      .filter(n => (n.type === 'thinker' || n.id === 'open_machine') && (n.cluster === 'core' || lineageFilters.has(CLUSTER_TO_LAYER[n.cluster])))
      .map(n => ({
        ...n,
        x: lineageNodePositions[n.id]?.x,
        y: lineageNodePositions[n.id]?.y,
      }))
      .filter(n => n.x != null)
  }, [activeVision, lineageNodePositions, lineageFilters])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <FilterBar
        activeVision={activeVision}
        setActiveVision={handleSetActiveVision}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        nodes={dataset ? dataset.nodes : []}
        lineageFilters={lineageFilters}
        setLineageFilters={setLineageFilters}
        lineageTimelineMode={lineageTimelineMode}
        setLineageTimelineMode={setLineageTimelineMode}
      />

      {/* Graph container — takes remaining height below FilterBar */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: FILTERBAR_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {isResearchAreas && (
          <ResearchAreasGraph
            width={dimensions.width}
            height={dimensions.height}
            setSelectedNode={setSelectedNode}
          />
        )}

        {!isResearchAreas && activeVision !== 'lineage' && dataset && (
          <Graph
            key={activeVision}
            nodes={dataset.nodes}
            edges={dataset.edges}
            activeFilters={activeFilters}
            selectedNode={selectedNode}
            setSelectedNode={setSelectedNode}
            activeVision={activeVision}
            onTransformChange={handleTransformChange}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}

        {activeVision === 'lineage' && (
          <LineageGraph
            ref={lineageGraphRef}
            data={lineageData}
            selectedNode={selectedNode}
            hoveredNode={null}
            activeFilters={lineageFilters}
            timelineMode={lineageTimelineMode}
            onNodeSelect={setSelectedNode}
            onNodeHover={() => {}}
            onViewTransformChange={handleTransformChange}
            onNodePositionsChange={handleLineageNodePositions}
            width={dimensions.width}
            height={dimensions.height}
          />
        )}
      </div>

      <DetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        isLineage={activeVision === 'lineage'}
        allNodes={activeVision === 'lineage' ? lineageData.nodes : null}
        allEdges={activeVision === 'lineage' ? lineageData.edges : null}
        clusterColors={activeVision === 'lineage' ? LINEAGE_CLUSTER_COLORS : null}
        onNodeSelect={activeVision === 'lineage' ? setSelectedNode : null}
      />

      <MiniMap
        nodes={activeVision === 'lineage' ? lineageMinimapNodes : minimapNodes}
        transform={transform}
        svgWidth={dimensions.width}
        svgHeight={dimensions.height}
        clusterColors={activeVision === 'lineage' ? LINEAGE_CLUSTER_COLORS : null}
        isLineage={activeVision === 'lineage'}
      />
    </div>
  )
}
