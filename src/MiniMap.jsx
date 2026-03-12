import React, { useRef, useEffect } from 'react'
import { COLORS } from './data.js'

const MAP_W = 200
const MAP_H = 140
const FONT_MONO = "'Courier New', monospace"

export default function MiniMap({ nodes, transform, svgWidth, svgHeight, clusterColors, isLineage }) {
  const canvasRef = useRef(null)
  const colors = clusterColors || COLORS

  useEffect(() => {
    if (!canvasRef.current || !nodes || nodes.length === 0) return
    const ctx = canvasRef.current.getContext('2d')
    ctx.clearRect(0, 0, MAP_W, MAP_H)

    // Figure out the bounding box of all nodes in simulation space
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      minY = Math.min(minY, n.y)
      maxY = Math.max(maxY, n.y)
    }

    if (!isFinite(minX)) return

    const padding = 40
    const dataW = Math.max(maxX - minX, 1)
    const dataH = Math.max(maxY - minY, 1)
    const scaleX = (MAP_W - padding * 2) / dataW
    const scaleY = (MAP_H - padding * 2) / dataH
    const scale = Math.min(scaleX, scaleY)

    const cx = MAP_W / 2
    const cy = MAP_H / 2
    const dataCx = (minX + maxX) / 2
    const dataCy = (minY + maxY) / 2

    function toMapX(x) { return cx + (x - dataCx) * scale }
    function toMapY(y) { return cy + (y - dataCy) * scale }

    // Draw nodes
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue
      const color = colors[n.cluster] || '#8a7d6e'
      const r = Math.max(1.5, Math.min(4, (n.radius || 20) * 0.15))
      ctx.beginPath()
      ctx.arc(toMapX(n.x), toMapY(n.y), r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.globalAlpha = 0.8
      ctx.fill()
    }
    ctx.globalAlpha = 1

    // Draw viewport indicator if transform is available
    if (transform && svgWidth && svgHeight) {
      const { x: tx, y: ty, k } = transform

      // For lineage: simulation coordinates are centered at origin (0,0)
      // transform maps simulation → screen: screen = sim*k + tx + svgWidth/2
      // so sim = (screen - tx - svgWidth/2) / k
      if (isLineage) {
        const vx0 = (0 - tx - svgWidth / 2) / k
        const vy0 = (0 - ty - svgHeight / 2) / k
        const vx1 = (svgWidth - tx - svgWidth / 2) / k
        const vy1 = (svgHeight - ty - svgHeight / 2) / k

        const mx0 = toMapX(vx0)
        const my0 = toMapY(vy0)
        const mx1 = toMapX(vx1)
        const my1 = toMapY(vy1)

        ctx.beginPath()
        ctx.setLineDash([3, 2])
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
        ctx.strokeRect(mx0, my0, mx1 - mx0, my1 - my0)
        ctx.setLineDash([])
      } else {
        // v2/v3: SVG canvas centered at (svgWidth/2, svgHeight/2)
        const vx0 = (-svgWidth / 2 - tx) / k
        const vy0 = (-svgHeight / 2 - ty) / k
        const vx1 = (svgWidth / 2 - tx) / k
        const vy1 = (svgHeight / 2 - ty) / k

        const mx0 = toMapX(vx0)
        const my0 = toMapY(vy0)
        const mx1 = toMapX(vx1)
        const my1 = toMapY(vy1)

        ctx.beginPath()
        ctx.setLineDash([3, 2])
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 1
        ctx.strokeRect(mx0, my0, mx1 - mx0, my1 - my0)
        ctx.setLineDash([])
      }
    }

    // MINIMAP label
    ctx.fillStyle = '#8a7d6e'
    ctx.font = `8px ${FONT_MONO}`
    ctx.fillText('MINIMAP', 6, 12)
  }, [nodes, transform, svgWidth, svgHeight, colors, isLineage])

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 150,
      borderRadius: 4,
      overflow: 'hidden',
      border: '1px solid #ddd5c4',
      background: 'rgba(244, 240, 230, 0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      width: MAP_W,
      height: MAP_H,
    }}>
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        style={{ display: 'block' }}
      />
    </div>
  )
}
