import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { COLORS } from './data.js'
import { CONCEPTS } from './concepts.js'

const FONT_MONO = "'Courier New', 'JetBrains Mono', 'Fira Code', monospace"
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const TYPE_LABELS = {
  open_machine: 'Collective',
  core: 'Core Concept',
  concept: 'Concept',
  tradition: 'Tradition',
  thinker: 'Thinker',
  downstream: 'Downstream',
  'project-expression': 'Project',
}

const CLUSTER_DISPLAY = {
  critique: 'Movement I: Critique',
  archive: 'Movement II: Archive',
  construction: 'Movement III: Construction',
  aesthetics: 'Layer 5: Aesthetics',
  coordination: 'Layer 4: Coordination',
  infrastructure: 'Layer 3: Infrastructure',
  epistemology: 'Layer 2: Epistemology',
  ontology: 'Layer 1: Ontology',
  core: 'Open Machine',
  cybernetics: 'Cybernetics',
  process: 'Process Philosophy',
  media: 'Media Theory',
  posthuman: 'Posthumanism',
  governance: 'Governance',
  art: 'Art & Performance',
}

function NodeLink({ nodeId, allNodes, clusterColors, onNodeSelect }) {
  const n = allNodes && allNodes.find(x => x.id === nodeId)
  if (!n) return null
  const color = (clusterColors && clusterColors[n.cluster]) || '#8a7d6e'
  return (
    <button
      onClick={() => onNodeSelect(n)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: FONT_MONO,
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        background: hexToRgba(color, 0.08),
        border: `1px solid ${hexToRgba(color, 0.3)}`,
        borderRadius: 4,
        padding: '2px 6px',
        cursor: 'pointer',
        margin: '2px',
      }}
    >
      {n.label || n.name || n.id}
    </button>
  )
}

function ConceptCard({ concept, clusterColor }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      style={{
        borderRadius: 5,
        border: `1px solid ${hexToRgba(clusterColor, open ? 0.4 : 0.18)}`,
        background: open ? hexToRgba(clusterColor, 0.06) : 'transparent',
        marginBottom: 5,
        overflow: 'hidden',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '7px 10px',
          gap: 8,
        }}
      >
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 9.5,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: open ? clusterColor : '#4a4035',
          fontWeight: open ? '600' : '400',
          textAlign: 'left',
          flex: 1,
        }}>
          {concept.title}
        </span>
        <span style={{
          fontFamily: FONT_MONO,
          fontSize: 11,
          color: open ? clusterColor : '#8a7d6e',
          flexShrink: 0,
          lineHeight: 1,
        }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <p style={{
          fontFamily: FONT_SANS,
          fontSize: 12,
          color: '#4a4038',
          lineHeight: 1.65,
          margin: 0,
          padding: '0 10px 10px 10px',
        }}>
          {concept.body}
        </p>
      )}
    </div>
  )
}

function ConceptList({ conceptIds, clusterColor }) {
  const concepts = conceptIds.map(id => CONCEPTS[id]).filter(Boolean)
  if (concepts.length === 0) return null
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ height: 1, background: '#e0d8cc', margin: '4px 0 14px 0' }} />
      <div style={{
        fontFamily: FONT_MONO,
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: '#8a7d6e',
        marginBottom: 10,
      }}>
        Related Concepts
      </div>
      {concepts.map(concept => (
        <ConceptCard key={concept.id} concept={concept} clusterColor={clusterColor} />
      ))}
    </div>
  )
}

export default function DetailPanel({
  node,
  onClose,
  isLineage = false,
  allNodes = null,
  allEdges = null,
  clusterColors = null,
  onNodeSelect = null,
}) {
  const colors = clusterColors || COLORS
  const clusterColor = node ? (colors[node.cluster] || '#8a7d6e') : '#8a7d6e'

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Compute related nodes for lineage view
  const relatedNodes = React.useMemo(() => {
    if (!isLineage || !node || !allEdges) return null
    const influencedBy = []
    const influences = []
    for (const e of allEdges) {
      const src = typeof e.source === 'object' ? e.source.id : e.source
      const tgt = typeof e.target === 'object' ? e.target.id : e.target
      if (src === node.id) influences.push(tgt)
      if (tgt === node.id) influencedBy.push(src)
    }
    return { influencedBy, influences }
  }, [isLineage, node, allEdges])

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          key={node.id}
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          style={{
            position: 'fixed',
            right: 0,
            top: 44,
            height: 'calc(100vh - 44px)',
            width: 360,
            background: 'rgba(247, 243, 234, 0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderLeft: '1px solid #c8baa8',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Top accent bar */}
          <div style={{
            height: 4,
            background: `linear-gradient(90deg, ${clusterColor}, ${clusterColor}40)`,
            flexShrink: 0,
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              position: 'absolute',
              top: 12,
              right: 14,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: FONT_MONO,
              fontSize: 18,
              color: '#8a7d6e',
              lineHeight: 1,
              padding: '2px 4px',
              borderRadius: 3,
              zIndex: 10,
            }}
          >
            ×
          </button>

          {/* Scrollable content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 24px 20px',
          }}>
            {/* Portrait image for lineage thinkers */}
            {isLineage && node.image && (
              <div style={{
                marginTop: 20,
                marginBottom: 12,
                display: 'flex',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: `2px solid ${clusterColor}`,
                  flexShrink: 0,
                }}>
                  <img
                    src={node.image}
                    alt={node.label || node.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                </div>
              </div>
            )}

            {/* Type badge */}
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: clusterColor,
              marginTop: node.image ? 0 : 16,
            }}>
              {TYPE_LABELS[node.type] || node.type}
            </div>

            {/* Node name */}
            <h2 style={{
              fontFamily: FONT_SANS,
              fontSize: 21,
              fontWeight: 700,
              color: '#1a1510',
              margin: '8px 0',
              lineHeight: 1.25,
              paddingRight: 24,
            }}>
              {node.label || node.name}
            </h2>

            {/* Birth/death years for thinkers */}
            {isLineage && (node.birth_year || node.death_year) && (
              <div style={{
                fontFamily: FONT_MONO,
                fontSize: 10,
                letterSpacing: '0.08em',
                color: '#8a7d6e',
                marginBottom: 4,
              }}>
                {node.birth_year || '?'} – {node.death_year || 'present'}
              </div>
            )}

            {/* Cluster label */}
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#8a7d6e',
              marginBottom: 12,
            }}>
              {CLUSTER_DISPLAY[node.cluster] || node.cluster}
            </div>

            {/* Tags */}
            {node.tags && node.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 16 }}>
                {node.tags.map(tag => (
                  <span key={tag} style={{
                    fontFamily: FONT_MONO,
                    fontSize: 9,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#4a4035',
                    background: hexToRgba(clusterColor, 0.1),
                    borderRadius: 4,
                    padding: '2px 6px',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: '#e0d8cc', margin: '4px 0 16px 0' }} />

            {/* Summary section */}
            <div style={{
              fontFamily: FONT_MONO,
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#8a7d6e',
              marginBottom: 8,
            }}>
              Summary
            </div>
            <p style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              color: '#4a4038',
              lineHeight: 1.6,
              margin: '0 0 20px 0',
            }}>
              {node.summary}
            </p>

            {/* Why It Matters callout */}
            {(node.whyItMatters || node.why_it_matters) && (
              <div style={{
                background: `linear-gradient(135deg, ${hexToRgba(clusterColor, 0.10)}, ${hexToRgba(clusterColor, 0.05)})`,
                borderLeft: `3px solid ${clusterColor}`,
                borderRadius: '0 6px 6px 0',
                padding: '12px 16px',
                marginBottom: 20,
              }}>
                <div style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: clusterColor,
                  marginBottom: 8,
                }}>
                  Why It Matters
                </div>
                <p style={{
                  fontFamily: FONT_SANS,
                  fontSize: 13,
                  color: '#3a3028',
                  lineHeight: 1.65,
                  margin: 0,
                }}>
                  {node.whyItMatters || node.why_it_matters}
                </p>
              </div>
            )}

            {/* Key Works (lineage) */}
            {isLineage && node.works && node.works.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#8a7d6e',
                  marginBottom: 8,
                }}>
                  Key Works
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
                  {node.works.map((work, i) => (
                    <li key={i} style={{
                      fontFamily: FONT_SANS,
                      fontSize: 12,
                      fontStyle: 'italic',
                      color: '#4a4038',
                      lineHeight: 1.5,
                      marginBottom: 4,
                    }}>
                      {work}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Research Paths (Three Movements — Movement I) */}
            {!isLineage && node.researchPaths && node.researchPaths.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ height: 1, background: '#e0d8cc', margin: '4px 0 14px 0' }} />
                <div style={{
                  fontFamily: FONT_MONO,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#8a7d6e',
                  marginBottom: 10,
                }}>
                  Proposed Research Paths
                </div>
                {node.researchPaths.map((path, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: clusterColor,
                      marginBottom: 3,
                    }}>
                      {path.title}
                    </div>
                    <p style={{
                      fontFamily: FONT_MONO,
                      fontSize: 10,
                      color: '#3a3028',
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {path.body}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Related nodes (lineage) */}
            {isLineage && relatedNodes && onNodeSelect && (
              <>
                {relatedNodes.influencedBy.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#8a7d6e',
                      marginBottom: 6,
                    }}>
                      Influenced By
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {relatedNodes.influencedBy.map(id => (
                        <NodeLink
                          key={id}
                          nodeId={id}
                          allNodes={allNodes}
                          clusterColors={clusterColors}
                          onNodeSelect={onNodeSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {relatedNodes.influences.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{
                      fontFamily: FONT_MONO,
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#8a7d6e',
                      marginBottom: 6,
                    }}>
                      Influences
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                      {relatedNodes.influences.map(id => (
                        <NodeLink
                          key={id}
                          nodeId={id}
                          allNodes={allNodes}
                          clusterColors={clusterColors}
                          onNodeSelect={onNodeSelect}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
