import React, { useMemo } from 'react'
import { COLORS } from './data.js'

const FONT_MONO = "'Courier New', 'JetBrains Mono', 'Fira Code', monospace"

function LogoMark() {
  const dotPositions = [0, 1, 2, 3, 4, 5].map(i => {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
    return {
      x: 14 + Math.cos(angle) * 9,
      y: 14 + Math.sin(angle) * 9,
      color: Object.values(COLORS).filter(c => c !== '#1a1510')[i % 6],
    }
  })

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="14" cy="14" r="12" stroke="#c8baa8" strokeWidth="0.7" fill="none" />
      <circle cx="14" cy="14" r="7" stroke="#c8baa8" strokeWidth="0.5" fill="none" strokeDasharray="3,2" />
      <circle cx="14" cy="14" r="2" fill="#1a1510" opacity="0.7" />
      {dotPositions.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r="2.2" fill={d.color} opacity="0.85" />
      ))}
    </svg>
  )
}

export default function FilterBar({
  activeVision,
  setActiveVision,
  activeFilters,
  setActiveFilters,
  nodes,
}) {
  const clusters = useMemo(() => {
    const seen = new Set()
    const result = []
    for (const n of nodes) {
      if (!seen.has(n.cluster)) {
        seen.add(n.cluster)
        result.push(n.cluster)
      }
    }
    return result.filter(c => c !== 'core')
  }, [nodes])

  function toggleCluster(cluster) {
    const next = new Set(activeFilters)
    if (next.has(cluster)) {
      if (next.size > 1) next.delete(cluster)
    } else {
      next.add(cluster)
    }
    setActiveFilters(next)
  }

  function toggleAllClusters() {
    if (activeFilters.size === clusters.length) {
      setActiveFilters(new Set([clusters[0]]))
    } else {
      setActiveFilters(new Set(clusters))
    }
  }

  const allActive = activeFilters.size === clusters.length

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 44,
      zIndex: 100,
      background: 'rgba(244, 240, 230, 0.94)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid #c8baa8',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '0 16px',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <LogoMark />
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 8,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#8a7d6e',
          whiteSpace: 'nowrap',
        }}>
          Open Machine
        </span>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#c8baa8', flexShrink: 0 }} />

      {/* Vision Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => setActiveVision('v2')}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 3,
            border: activeVision === 'v2' ? '1px solid #1a1510' : '1px solid #c8baa8',
            background: activeVision === 'v2' ? '#1a1510' : 'transparent',
            color: activeVision === 'v2' ? '#f4f0e6' : '#8a7d6e',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          Three Movements
        </button>
        <button
          onClick={() => setActiveVision('v3')}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 3,
            border: activeVision === 'v3' ? '1px solid #1a1510' : '1px solid #c8baa8',
            background: activeVision === 'v3' ? '#1a1510' : 'transparent',
            color: activeVision === 'v3' ? '#f4f0e6' : '#8a7d6e',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
        >
          The Protocol Stack
        </button>
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 20, background: '#c8baa8', flexShrink: 0 }} />

      {/* Filter pills container */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        overflowX: 'auto',
        flex: 1,
        scrollbarWidth: 'none',
      }}>
        {/* All toggle */}
        <button
          onClick={toggleAllClusters}
          style={{
            fontFamily: FONT_MONO,
            fontSize: 9,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 9999,
            border: allActive ? '1px solid #8a7d6e' : '1px solid #c8baa8',
            background: allActive ? 'rgba(26,21,16,0.07)' : 'transparent',
            color: allActive ? '#4a4035' : '#8a7d6e',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          All
        </button>

        {clusters.map(cluster => {
          const color = COLORS[cluster] || '#8a7d6e'
          const active = activeFilters.has(cluster)
          return (
            <button
              key={cluster}
              onClick={() => toggleCluster(cluster)}
              style={{
                fontFamily: FONT_MONO,
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 9999,
                border: active ? `1px solid ${color}` : '1px solid #c8baa8',
                background: active ? `${color}2e` : 'transparent',
                color: active ? color : '#8a7d6e',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              {cluster}
            </button>
          )
        })}
      </div>
    </div>
  )
}
