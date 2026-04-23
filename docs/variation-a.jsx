// Variation A — "Operations" — dark sidebar, serious, dense, signal-red accent.
// Inspired by government/defense tooling: clear hierarchy, muted surfaces,
// semantic treatment categories, collapsible grouped toolbar.

function VariationA({ density = 'comfortable', theme = 'light' }) {
  const [activeNav, setActiveNav] = React.useState('context');
  const [openSaveMenu, setOpenSaveMenu] = React.useState(false);
  const [openExport, setOpenExport] = React.useState(false);

  const pad = density === 'compact' ? 10 : density === 'spacious' ? 18 : 14;
  const fieldH = density === 'compact' ? 34 : density === 'spacious' ? 42 : 38;
  const dark = theme === 'dark';

  const C = dark ? {
    bg: '#0a0e14', surface: '#111824', surface2: '#1a2332', line:'#253044',
    text:'#e8ecf2', muted:'#8a95a8', sidebar:'#070a10', sidebarText:'#c9d1de',
    accent:'#e85a3e', accentSoft:'rgba(232,90,62,.15)',
  } : {
    bg: '#f5f3ee', surface: '#ffffff', surface2: '#fafaf6', line:'#e4e2db',
    text:'#111824', muted:'#6b7280', sidebar:'#0a0e14', sidebarText:'#c9d1de',
    accent:'#b8381f', accentSoft:'rgba(184,56,31,.08)',
  };

  return (
    <div style={{
      width:'100%', height:'100%', background: C.bg, color: C.text,
      fontFamily: "'Inter Tight', system-ui, sans-serif",
      fontFeatureSettings: "'ss01','cv11'",
      display:'grid', gridTemplateColumns: '232px 1fr', gridTemplateRows:'auto 1fr',
      fontSize: 13,
    }}>
      {/* ───── TOP BAR ───── */}
      <header style={{
        gridColumn:'1 / -1', height: 52, background: C.sidebar, color:'#fff',
        display:'flex', alignItems:'center', padding:'0 16px', gap: 16,
        borderBottom:`1px solid ${dark ? '#1a2332' : '#000'}`,
      }}>
        {/* Brand */}
        <div style={{display:'flex', alignItems:'center', gap: 10, minWidth: 216}}>
          <div style={{
            width: 26, height: 26, borderRadius: 4,
            background: C.accent,
            display:'grid', placeItems:'center',
            color:'#fff', fontWeight:700, fontSize: 11, letterSpacing: '.04em',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.15)',
          }}>S·T</div>
          <div>
            <div style={{fontSize: 12.5, fontWeight: 600, letterSpacing:'.01em'}}>Sentinel</div>
            <div style={{fontSize: 10, color:'#8591a6', letterSpacing:'.12em', textTransform:'uppercase', marginTop:-1}}>Risk & Threat Assessment</div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div style={{display:'flex', alignItems:'center', gap: 8, flex:1, color:'#c9d1de', fontSize: 12}}>
          <span style={{color:'#6b7688'}}>Workspace</span>
          <span style={{color:'#3a4558'}}>/</span>
          <span style={{color:'#8591a6'}}>Northsea Maritime</span>
          <span style={{color:'#3a4558'}}>/</span>
          <span style={{color:'#fff', fontWeight: 500}}>{SAMPLE.projectName}</span>
          <span style={{
            marginLeft: 8, fontSize: 10, letterSpacing:'.1em',
            padding:'2px 6px', borderRadius: 3,
            background:'rgba(255,255,255,.06)', color:'#a8b3c8',
            border:'1px solid rgba(255,255,255,.08)',
          }}>DRAFT · REV C</span>
        </div>

        {/* Grouped toolbar */}
        <div style={{display:'flex', alignItems:'center', gap: 6}}>
          <ToolbarGroup C={C}>
            <TBIconBtn C={C} icon="save" label="Save" onClick={() => setOpenSaveMenu(v=>!v)} primary/>
            <TBDivider C={C}/>
            <TBIconBtn C={C} icon="upload" label="Load" small/>
          </ToolbarGroup>

          <ToolbarGroup C={C}>
            <TBIconBtn C={C} icon="download" label="Export" small onClick={()=>setOpenExport(v=>!v)} chev/>
          </ToolbarGroup>

          <ToolbarGroup C={C}>
            <TBIconBtn C={C} icon="print" label="Print" small/>
            <TBDivider C={C}/>
            <TBIconBtn C={C} icon="cog" label="Setup" small/>
          </ToolbarGroup>

          <div style={{width: 1, height: 24, background:'rgba(255,255,255,.08)', margin:'0 4px'}}/>

          <button style={{
            height: 32, padding:'0 14px', borderRadius: 4,
            background: C.accent, color:'#fff', border: 'none',
            fontSize: 12, fontWeight: 600, letterSpacing:'.02em',
            display:'flex', alignItems:'center', gap: 6, cursor:'pointer',
            boxShadow: '0 0 0 1px rgba(0,0,0,.2), inset 0 1px 0 rgba(255,255,255,.15)',
          }}>
            Next: Criteria <Icons.arrowR/>
          </button>

          <div style={{marginLeft: 8, display:'flex', alignItems:'center', gap:8, paddingLeft: 8, borderLeft:'1px solid rgba(255,255,255,.1)'}}>
            <div style={{
              width: 28, height: 28, borderRadius:'50%',
              background:'linear-gradient(135deg,#c47a0b,#b8381f)',
              display:'grid', placeItems:'center', fontSize: 10, fontWeight: 700, color:'#fff',
            }}>KM</div>
          </div>
        </div>
      </header>

      {/* ───── SIDEBAR ───── */}
      <aside style={{
        background: C.sidebar, color: C.sidebarText,
        borderRight:'1px solid rgba(255,255,255,.05)',
        padding:'12px 10px', overflow:'auto',
      }}>
        {/* Project card */}
        <div style={{
          padding: 12, borderRadius: 6,
          background:'rgba(255,255,255,.03)',
          border:'1px solid rgba(255,255,255,.06)',
          marginBottom: 14,
        }}>
          <div style={{fontSize: 10, color:'#6b7688', letterSpacing:'.1em', textTransform:'uppercase', marginBottom: 4}}>Project</div>
          <div style={{fontSize: 12, color:'#fff', fontWeight: 600, lineHeight: 1.3, marginBottom: 6}}>SRA-2026-0148</div>
          <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 10.5, color:'#8591a6'}}>
            <span style={{
              width: 6, height: 6, borderRadius:'50%', background:'#c47a0b',
              boxShadow:'0 0 0 3px rgba(196,122,11,.2)',
            }}/>
            Stage 2 · Risk Treatment
          </div>
          {/* Progress bar */}
          <div style={{marginTop: 10, height: 3, background:'rgba(255,255,255,.06)', borderRadius: 2, overflow:'hidden'}}>
            <div style={{width:'42%', height:'100%', background:'#c47a0b'}}/>
          </div>
          <div style={{marginTop: 4, fontSize: 10, color:'#6b7688', display:'flex', justifyContent:'space-between'}}>
            <span>6 of 14 complete</span>
            <span>42%</span>
          </div>
        </div>

        {NAV_SECTIONS.map(section => (
          <div key={section.group} style={{marginBottom: 10}}>
            <div style={{
              fontSize: 9.5, color:'#556479', letterSpacing:'.14em', textTransform:'uppercase',
              padding:'6px 8px 4px', fontWeight: 600,
            }}>{section.group}</div>
            {section.items.map(item => {
              const isActive = activeNav === item.id;
              return (
                <button key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  style={{
                    display:'flex', alignItems:'center', gap: 9,
                    width:'100%', padding:'6px 8px',
                    background: isActive ? 'rgba(184,56,31,.14)' : 'transparent',
                    color: isActive ? '#fff' : '#a8b3c8',
                    border: 'none', borderRadius: 4,
                    fontSize: 12, fontFamily:'inherit', textAlign:'left',
                    cursor:'pointer', position:'relative',
                    borderLeft: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                    paddingLeft: isActive ? 6 : 8,
                  }}>
                  <span style={{color: isActive ? C.accent : '#6b7688', display:'flex'}}>{Icons[item.icon]()}</span>
                  <span style={{flex:1, fontWeight: isActive ? 500 : 400}}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      fontSize: 10, padding:'1px 5px', borderRadius: 3,
                      background: item.pulse ? 'rgba(184,56,31,.2)' : 'rgba(255,255,255,.06)',
                      color: item.pulse ? '#e85a3e' : '#8591a6',
                      fontFeatureSettings:"'tnum'",
                      fontWeight: 500,
                    }}>{item.badge}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}

        <div style={{marginTop: 16, padding: 10, borderRadius: 6, background:'rgba(255,255,255,.02)', border:'1px dashed rgba(255,255,255,.08)'}}>
          <div style={{fontSize: 10, color:'#8591a6', lineHeight: 1.4}}>
            Auto-saved <span style={{color:'#fff'}}>2 min ago</span>
            <br/>
            <span style={{color:'#6b7688'}}>by K. Morrison (local)</span>
          </div>
        </div>
      </aside>

      {/* ───── MAIN ───── */}
      <main style={{overflow:'auto', background: C.bg}}>
        {/* Section header strip */}
        <div style={{
          padding:'20px 28px 16px', background: C.surface, borderBottom:`1px solid ${C.line}`,
          display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 24,
        }}>
          <div>
            <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 6}}>
              <span style={{fontSize: 10, letterSpacing:'.16em', color: C.accent, fontWeight: 600}}>01 · CONTEXT</span>
              <span style={{
                fontSize: 10, padding:'2px 7px', borderRadius: 3,
                background: C.accentSoft, color: C.accent,
                border:`1px solid ${dark ? 'rgba(232,90,62,.3)' : 'rgba(184,56,31,.2)'}`,
                letterSpacing:'.08em', fontWeight: 600,
              }}>ISO 31000 · 5.3</span>
            </div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 600, letterSpacing:'-.015em',
              color: C.text, fontFamily:"'Inter Tight', sans-serif",
            }}>Context & Criteria</h1>
            <p style={{margin:'4px 0 0', fontSize: 12.5, color: C.muted, maxWidth: 580}}>
              Define scope, objectives and risk appetite. This section anchors every downstream assessment.
            </p>
          </div>
          <div style={{display:'flex', alignItems:'center', gap: 8, fontSize: 11, color: C.muted}}>
            <div style={{display:'flex', alignItems:'center', gap: 4}}>
              <Icons.clock/> Last edited 4 min ago
            </div>
            <span style={{color: C.line}}>·</span>
            <div style={{display:'flex', alignItems:'center', gap: 4, color: C.muted}}>
              <Icons.user/> K. Morrison
            </div>
          </div>
        </div>

        {/* Stepper */}
        <Stepper C={C} />

        <div style={{padding:'20px 28px 40px', display:'grid', gridTemplateColumns:'1fr 320px', gap: 20}}>
          {/* Left column — forms */}
          <div style={{display:'flex', flexDirection:'column', gap: 16}}>
            {/* PROJECT DETAILS */}
            <Panel C={C} title="Project Details" num="1.1" actions={<PanelAction C={C} icon="copy" label="From template"/>}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: pad}}>
                <Field C={C} label="Project name" value={SAMPLE.projectName} h={fieldH}/>
                <Field C={C} label="Project number" value={SAMPLE.projectNumber} h={fieldH} mono/>
                <Field C={C} label="Support reference" value={SAMPLE.supportRef} h={fieldH} mono/>
                <Field C={C} label="Assessment date" value={SAMPLE.date} h={fieldH} icon="calendar"/>
                <Field C={C} label="RMS stage" value={SAMPLE.rmsStage} h={fieldH} pill/>
                <Field C={C} label="Revision" value={SAMPLE.revision} h={fieldH}/>
                <Field C={C} label="Client" value={SAMPLE.client} h={fieldH}/>
                <Field C={C} label="Site address" value={SAMPLE.siteAddress} h={fieldH}/>
                <Field C={C} label="Province / region" value={SAMPLE.province} h={fieldH}/>
                <Field C={C} label="Country" value={SAMPLE.country} h={fieldH} select/>
                <Field C={C} label="Consignment type" value={SAMPLE.consignment} h={fieldH} select wide/>
              </div>

              {/* Treatment categories — properly designed */}
              <div style={{marginTop: pad + 4}}>
                <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 8}}>
                  <label style={{fontSize: 11, color: C.muted, letterSpacing:'.04em', textTransform:'uppercase', fontWeight: 600}}>Treatment categories in scope</label>
                  <span style={{fontSize: 10.5, color: C.muted}}>— all apply by default</span>
                </div>
                <div style={{display:'flex', gap: 6, flexWrap:'wrap'}}>
                  {TREATMENT_CATEGORIES.map(t => {
                    const on = SAMPLE.treatments.includes(t.key);
                    return (
                      <button key={t.key} style={{
                        display:'flex', alignItems:'center', gap: 8,
                        padding:'6px 10px 6px 6px', borderRadius: 4,
                        background: on ? (dark ? '#1a2332' : '#0a0e14') : 'transparent',
                        color: on ? '#fff' : C.muted,
                        border: `1px solid ${on ? (dark ? '#253044' : '#0a0e14') : C.line}`,
                        fontSize: 11.5, fontFamily:'inherit', cursor:'pointer',
                        fontWeight: on ? 500 : 400,
                      }}>
                        <span style={{
                          width: 20, height: 20, borderRadius: 3,
                          background: on ? C.accent : (dark ? '#253044' : '#e4e2db'),
                          color: on ? '#fff' : C.muted,
                          display:'grid', placeItems:'center',
                          fontSize: 10, fontWeight: 700, fontFamily:"'JetBrains Mono', monospace",
                        }}>{t.glyph}</span>
                        {t.label}
                        {on && <span style={{color: C.accent, marginLeft: 2, display:'flex'}}><Icons.check/></span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Panel>

            {/* SCOPE */}
            <Panel C={C} title="Scope & Assumptions" num="1.2">
              <TextArea C={C} label="Scope boundaries" value={SAMPLE.scope} rows={3}/>
              <TextArea C={C} label="Key assumptions" value={SAMPLE.assumptions} rows={3}/>
            </Panel>

            {/* NOTES */}
            <Panel C={C} title="Analyst Notes" num="1.3" actions={
              <div style={{display:'flex', gap: 4}}>
                <PanelAction C={C} icon="sparkle" label="Summarize"/>
                <PanelAction C={C} icon="copy" label="AI Prompt"/>
              </div>
            }>
              <TextArea C={C} label="" value={SAMPLE.notes} rows={3} placeholder="General notes, alternative keys, observations not captured elsewhere…"/>
            </Panel>

            {/* MEETINGS */}
            <Panel C={C} title="Stakeholder Meetings & Consultations" num="1.4"
              meta={<span style={{fontSize: 10.5, color: C.muted}}>{SAMPLE.meetings.length} recorded</span>}>
              <div style={{
                border:`1px solid ${C.line}`, borderRadius: 4, overflow:'hidden',
                fontSize: 12,
              }}>
                <div style={{
                  display:'grid', gridTemplateColumns:'120px 1fr 220px 28px',
                  padding:'8px 12px', background: C.surface2,
                  fontSize: 10, letterSpacing:'.1em', textTransform:'uppercase', fontWeight: 600,
                  color: C.muted, borderBottom:`1px solid ${C.line}`,
                }}>
                  <div>Date</div><div>Meeting / purpose</div><div>Attendees</div><div/>
                </div>
                {SAMPLE.meetings.map((m,i) => (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'120px 1fr 220px 28px',
                    padding:'9px 12px', alignItems:'center',
                    borderBottom: i < SAMPLE.meetings.length-1 ? `1px solid ${C.line}` : 'none',
                    fontSize: 12, background: C.surface,
                  }}>
                    <div style={{color: C.muted, fontFamily:"'JetBrains Mono', monospace", fontSize: 11}}>{m.date}</div>
                    <div style={{color: C.text, fontWeight: 500}}>{m.desc}</div>
                    <div style={{color: C.muted, fontSize: 11.5}}>{m.attendees}</div>
                    <button style={{background:'transparent', border:'none', color: C.muted, cursor:'pointer', display:'flex', padding: 4}}><Icons.more/></button>
                  </div>
                ))}
              </div>
              <button style={{
                marginTop: 10, padding:'7px 11px', borderRadius: 4,
                background:'transparent', color: C.text,
                border:`1px dashed ${C.line}`, fontSize: 11.5, cursor:'pointer',
                display:'flex', alignItems:'center', gap: 6, fontFamily:'inherit',
              }}>
                <Icons.plus/> Add meeting
              </button>
            </Panel>

            {/* AREA ANALYSIS */}
            <Panel C={C} title="Area Analysis" num="1.5"
              subtitle="Regional intelligence & threat posture"
              actions={
                <div style={{display:'flex', gap: 4}}>
                  <PanelAction C={C} icon="copy" label="Copy prompt"/>
                  <PanelAction C={C} icon="paste" label="Paste response"/>
                </div>
              }>
              <div style={{
                padding: 14, borderRadius: 4, background: C.surface2,
                border:`1px solid ${C.line}`,
                display:'flex', gap: 12, alignItems:'flex-start',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 4,
                  background: C.accentSoft,
                  color: C.accent,
                  display:'grid', placeItems:'center', flexShrink: 0,
                }}>
                  <Icons.sparkle/>
                </div>
                <div style={{flex: 1}}>
                  <div style={{fontSize: 12.5, fontWeight: 600, marginBottom: 3}}>AI area-intelligence briefing</div>
                  <div style={{fontSize: 11.5, color: C.muted, lineHeight: 1.5}}>
                    Copy the structured prompt for your preferred LLM (GPT-5, Claude, Gemini), then paste the response below to auto-populate regional threat context.
                  </div>
                  <div style={{marginTop: 10, display:'flex', gap: 6}}>
                    <button style={{
                      padding:'6px 10px', borderRadius: 3, fontSize: 11.5,
                      background: C.text, color: C.surface, border:'none',
                      display:'flex', alignItems:'center', gap: 6, cursor:'pointer', fontFamily:'inherit', fontWeight: 500,
                    }}><Icons.copy/> Copy prompt</button>
                    <button style={{
                      padding:'6px 10px', borderRadius: 3, fontSize: 11.5,
                      background: C.surface, color: C.text, border:`1px solid ${C.line}`,
                      display:'flex', alignItems:'center', gap: 6, cursor:'pointer', fontFamily:'inherit',
                    }}><Icons.paste/> Paste response</button>
                    <button style={{
                      marginLeft:'auto',
                      padding:'6px 10px', borderRadius: 3, fontSize: 11.5,
                      background:'transparent', color: C.muted, border:`1px solid ${C.line}`,
                      display:'flex', alignItems:'center', gap: 6, cursor:'pointer', fontFamily:'inherit',
                    }}><Icons.ext/> Open ChatGPT</button>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Right column — sidecar */}
          <SideCar C={C} />
        </div>
      </main>
    </div>
  );
}

// ─── Subcomponents ─────────────────────────────────────────────────

function ToolbarGroup({ children, C }) {
  return (
    <div style={{
      display:'flex', alignItems:'center',
      background:'rgba(255,255,255,.04)',
      borderRadius: 4, padding: 2,
      border:'1px solid rgba(255,255,255,.06)',
    }}>{children}</div>
  );
}

function TBIconBtn({ C, icon, label, small, primary, chev, onClick }) {
  return (
    <button onClick={onClick} style={{
      height: 26, padding: small ? '0 8px' : '0 10px',
      background: primary ? 'rgba(184,56,31,.18)' : 'transparent',
      color: primary ? '#ffb8a8' : '#d0d6e0',
      border: 'none', borderRadius: 3, cursor:'pointer',
      fontSize: 11.5, fontWeight: 500, fontFamily:'inherit',
      display:'flex', alignItems:'center', gap: 5,
    }}>
      <span style={{display:'flex', opacity: primary ? 1 : .75}}>{Icons[icon] && Icons[icon]()}</span>
      <span>{label}</span>
      {chev && <span style={{opacity:.5, display:'flex'}}><Icons.chevD/></span>}
    </button>
  );
}

function TBDivider({ C }) {
  return <div style={{width: 1, height: 14, background:'rgba(255,255,255,.1)'}}/>;
}

function Stepper({ C }) {
  const steps = [
    { n:1, label:'Context',    done:true },
    { n:2, label:'Criteria',   done:true },
    { n:3, label:'Assets',     done:true },
    { n:4, label:'Threats',    done:true },
    { n:5, label:'Analysis',   done:false, current:true },
    { n:6, label:'Treatments', done:false },
    { n:7, label:'Report',     done:false },
  ];
  return (
    <div style={{
      padding:'0 28px', background: C.surface,
      borderBottom: `1px solid ${C.line}`,
      display:'flex', alignItems:'center', gap: 0, height: 40,
    }}>
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          <div style={{display:'flex', alignItems:'center', gap: 8, padding:'0 10px', height:'100%'}}>
            <div style={{
              width: 20, height: 20, borderRadius: 3,
              background: s.done ? '#1f7a4d' : s.current ? C.accent : 'transparent',
              border: s.current || s.done ? 'none' : `1px solid ${C.line}`,
              color: s.done || s.current ? '#fff' : C.muted,
              display:'grid', placeItems:'center',
              fontSize: 10, fontWeight: 700,
            }}>{s.done ? '✓' : s.n}</div>
            <div style={{
              fontSize: 11.5, fontWeight: s.current ? 600 : 400,
              color: s.done ? C.text : s.current ? C.text : C.muted,
            }}>{s.label}</div>
          </div>
          {i < steps.length - 1 && (
            <div style={{
              flex: s.done ? '0 0 24px' : '0 0 24px',
              height: 1,
              background: s.done ? '#1f7a4d' : C.line,
            }}/>
          )}
        </React.Fragment>
      ))}
      <div style={{flex:1}}/>
      <div style={{fontSize: 10.5, color: C.muted, letterSpacing:'.08em', textTransform:'uppercase'}}>Workflow — ISO 31000</div>
    </div>
  );
}

function Panel({ C, title, num, subtitle, actions, meta, children }) {
  return (
    <section style={{
      background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6,
      overflow:'hidden',
    }}>
      <header style={{
        display:'flex', alignItems:'center', gap: 10,
        padding:'12px 16px', borderBottom:`1px solid ${C.line}`,
        background: C.surface,
      }}>
        {num && (
          <div style={{
            fontSize: 10, letterSpacing:'.1em', color: C.muted,
            fontFamily:"'JetBrains Mono', monospace", fontWeight: 500,
          }}>{num}</div>
        )}
        <div style={{flex:1, display:'flex', alignItems:'baseline', gap: 8}}>
          <h3 style={{margin: 0, fontSize: 13.5, fontWeight: 600, letterSpacing:'-.005em'}}>{title}</h3>
          {subtitle && <span style={{fontSize: 11, color: C.muted}}>{subtitle}</span>}
          {meta}
        </div>
        {actions}
      </header>
      <div style={{padding: 16}}>{children}</div>
    </section>
  );
}

function PanelAction({ C, icon, label }) {
  return (
    <button style={{
      padding:'4px 8px', fontSize: 11, borderRadius: 3,
      background:'transparent', color: C.muted,
      border:`1px solid ${C.line}`, cursor:'pointer', fontFamily:'inherit',
      display:'flex', alignItems:'center', gap: 5,
    }}>
      <span style={{display:'flex'}}>{Icons[icon]()}</span>{label}
    </button>
  );
}

function Field({ C, label, value, h, mono, select, icon, pill, wide }) {
  return (
    <div style={{gridColumn: wide ? 'span 2' : 'auto'}}>
      <label style={{
        fontSize: 10.5, color: C.muted,
        letterSpacing:'.04em', textTransform:'uppercase', fontWeight: 600,
        display:'block', marginBottom: 5,
      }}>{label}</label>
      <div style={{position:'relative'}}>
        <div style={{
          height: h, padding:`0 ${icon || select ? 32 : 10}px 0 10px`,
          background: C.surface, color: C.text,
          border:`1px solid ${C.line}`, borderRadius: 4,
          fontSize: 12.5, display:'flex', alignItems:'center',
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          fontWeight: mono ? 500 : 400,
        }}>
          {pill ? (
            <span style={{
              padding:'2px 7px', fontSize: 11, borderRadius: 3,
              background:'rgba(196,122,11,.1)', color:'#a85f08',
              border:'1px solid rgba(196,122,11,.2)', fontWeight: 500,
            }}>{value}</span>
          ) : value}
        </div>
        {icon && <span style={{position:'absolute', right: 10, top:'50%', transform:'translateY(-50%)', color: C.muted, display:'flex'}}>{Icons[icon]()}</span>}
        {select && <span style={{position:'absolute', right: 10, top:'50%', transform:'translateY(-50%)', color: C.muted, display:'flex'}}><Icons.chevD/></span>}
      </div>
    </div>
  );
}

function TextArea({ C, label, value, rows, placeholder }) {
  return (
    <div style={{marginBottom: 10}}>
      {label && (
        <label style={{
          fontSize: 10.5, color: C.muted,
          letterSpacing:'.04em', textTransform:'uppercase', fontWeight: 600,
          display:'block', marginBottom: 5,
        }}>{label}</label>
      )}
      <div style={{
        minHeight: rows * 20 + 20, padding: 10,
        background: C.surface, color: C.text,
        border:`1px solid ${C.line}`, borderRadius: 4,
        fontSize: 12.5, lineHeight: 1.5,
      }}>{value || <span style={{color: C.muted}}>{placeholder}</span>}</div>
    </div>
  );
}

function SideCar({ C }) {
  return (
    <aside style={{display:'flex', flexDirection:'column', gap: 14}}>
      {/* Completion */}
      <div style={{
        padding: 14, borderRadius: 6,
        background: C.surface, border:`1px solid ${C.line}`,
      }}>
        <div style={{fontSize: 10.5, color: C.muted, letterSpacing:'.1em', textTransform:'uppercase', fontWeight: 600, marginBottom: 10}}>Section completion</div>
        <div style={{display:'flex', alignItems:'center', gap: 12}}>
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke={C.line} strokeWidth="5"/>
            <circle cx="28" cy="28" r="22" fill="none" stroke={C.accent} strokeWidth="5"
              strokeDasharray={`${2*Math.PI*22*0.78} ${2*Math.PI*22}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"/>
            <text x="28" y="32" textAnchor="middle" fontSize="14" fontWeight="600" fill={C.text} fontFamily="Inter Tight">78%</text>
          </svg>
          <div style={{flex:1, fontSize: 11.5, color: C.muted, lineHeight: 1.5}}>
            <div style={{color: C.text, fontWeight: 500, marginBottom: 3}}>Almost there</div>
            2 required fields remaining before you can advance to <strong style={{color: C.text, fontWeight: 500}}>Criteria</strong>.
          </div>
        </div>
      </div>

      {/* Required checklist */}
      <div style={{
        padding: 14, borderRadius: 6,
        background: C.surface, border:`1px solid ${C.line}`,
      }}>
        <div style={{fontSize: 10.5, color: C.muted, letterSpacing:'.1em', textTransform:'uppercase', fontWeight: 600, marginBottom: 10}}>Required for this section</div>
        {[
          { label:'Project identifiers', done:true },
          { label:'Client & site', done:true },
          { label:'Consignment type', done:true },
          { label:'Scope boundaries', done:true },
          { label:'Key assumptions', done:false },
          { label:'≥ 2 stakeholder meetings', done:true, note:'4 recorded' },
          { label:'Area analysis', done:false, note:'awaiting paste' },
        ].map((c, i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap: 8, padding:'5px 0',
            fontSize: 12, color: c.done ? C.text : C.muted,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: 3,
              border: `1px solid ${c.done ? '#1f7a4d' : C.line}`,
              background: c.done ? '#1f7a4d' : 'transparent',
              color:'#fff', display:'grid', placeItems:'center', fontSize: 9,
              flexShrink: 0,
            }}>{c.done && '✓'}</div>
            <span style={{flex: 1, textDecoration: c.done ? 'none' : 'none'}}>{c.label}</span>
            {c.note && <span style={{fontSize: 10.5, color: C.muted}}>{c.note}</span>}
          </div>
        ))}
      </div>

      {/* Risk posture preview */}
      <div style={{
        padding: 14, borderRadius: 6,
        background: C.surface, border:`1px solid ${C.line}`,
      }}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10}}>
          <div style={{fontSize: 10.5, color: C.muted, letterSpacing:'.1em', textTransform:'uppercase', fontWeight: 600}}>Preliminary posture</div>
          <div style={{fontSize: 10, color: C.muted}}>provisional</div>
        </div>
        <div style={{display:'flex', gap: 4, marginBottom: 10}}>
          {[
            { sev:'low',  n:8,  label:'Low' },
            { sev:'med',  n:14, label:'Medium' },
            { sev:'high', n:5,  label:'High' },
            { sev:'crit', n:1,  label:'Critical' },
          ].map(s => {
            const colors = { low:'#2ecc71', med:'#f1c40f', high:'#e67e22', crit:'#c0392b' };
            return (
              <div key={s.sev} style={{
                flex: s.n, padding: '8px 8px 6px',
                background: colors[s.sev], color:'#fff',
                borderRadius: 3, minWidth: 22,
              }}>
                <div style={{fontSize: 16, fontWeight: 600, fontFeatureSettings:"'tnum'"}}>{s.n}</div>
                <div style={{fontSize: 9.5, letterSpacing:'.06em', textTransform:'uppercase', opacity:.85}}>{s.label}</div>
              </div>
            );
          })}
        </div>
        <div style={{fontSize: 11, color: C.muted, lineHeight: 1.5}}>
          28 risks identified. Distribution shifts once Criteria weights are applied.
        </div>
      </div>

      {/* Related */}
      <div style={{
        padding: 14, borderRadius: 6,
        background: C.surface, border:`1px solid ${C.line}`,
      }}>
        <div style={{fontSize: 10.5, color: C.muted, letterSpacing:'.1em', textTransform:'uppercase', fontWeight: 600, marginBottom: 10}}>Related references</div>
        {[
          { t:'ISO 31000:2018 §5.3', s:'Establishing context' },
          { t:'NaCTSO Q1 2026 bulletin', s:'UK maritime threat' },
          { t:'Aberdeen Port SRA (2023)', s:'Previous assessment' },
        ].map((r,i) => (
          <div key={i} style={{
            display:'flex', alignItems:'center', gap: 8, padding:'7px 0',
            borderBottom: i < 2 ? `1px solid ${C.line}` : 'none',
            cursor:'pointer',
          }}>
            <span style={{color: C.muted, display:'flex'}}><Icons.link/></span>
            <div style={{flex:1, minWidth: 0}}>
              <div style={{fontSize: 12, color: C.text, fontWeight: 500}}>{r.t}</div>
              <div style={{fontSize: 10.5, color: C.muted}}>{r.s}</div>
            </div>
            <Icons.ext/>
          </div>
        ))}
      </div>
    </aside>
  );
}

window.VariationA = VariationA;
