import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { VISION_2, VISION_3 } from './data.js'
import FilterBar from './FilterBar.jsx'
import DetailPanel from './DetailPanel.jsx'
import MiniMap from './MiniMap.jsx'
import Graph from './Graph.jsx'

const FILTERBAR_HEIGHT = 44

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

  const dataset = activeVision === 'v2' ? VISION_2 : VISION_3

  // Initialize activeFilters to all clusters in the current dataset
  const [activeFilters, setActiveFilters] = useState(() => {
    const seen = new Set()
    for (const n of VISION_2.nodes) {
      if (n.cluster !== 'core') seen.add(n.cluster)
    }
    return seen
  })

  // When vision changes, reset filters to all-active for new dataset
  function handleSetActiveVision(v) {
    setActiveVision(v)
    setSelectedNode(null)
    const seen = new Set()
    const ds = v === 'v2' ? VISION_2 : VISION_3
    for (const n of ds.nodes) {
      if (n.cluster !== 'core') seen.add(n.cluster)
    }
    setActiveFilters(seen)
  }

  const handleTransformChange = useCallback((t) => {
    setTransform({ x: t.x, y: t.y, k: t.k })
  }, [])

  // Build minimap node list from the dataset with approximate layout positions
  // The MiniMap draws dots at node.x, node.y — we pass the layout-aware positions
  // by just forwarding the dataset nodes (MiniMap will show a generic overview)
  const minimapNodes = useMemo(() => {
    return dataset.nodes
  }, [dataset.nodes])

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <FilterBar
        activeVision={activeVision}
        setActiveVision={handleSetActiveVision}
        activeFilters={activeFilters}
        setActiveFilters={setActiveFilters}
        nodes={dataset.nodes}
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
      </div>

      <DetailPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />

      <MiniMap
        nodes={minimapNodes}
        transform={transform}
        svgWidth={dimensions.width}
        svgHeight={dimensions.height}
      />
    </div>
  )
}
