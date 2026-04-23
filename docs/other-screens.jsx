// Extra screens — Dashboard + Risk Register + Threats — in Variation A style
// to demonstrate the design system extends across the full app.

function ScreenDashboard() {
  const C = {
    bg:'#f5f3ee', surface:'#fff', surface2:'#fafaf6', line:'#e4e2db',
    text:'#111824', muted:'#6b7280', sidebar:'#0a0e14',
    accent:'#b8381f', accentSoft:'rgba(184,56,31,.08)',
  };
  return (
    <div style={{
      width:'100%', height:'100%', background: C.bg, color: C.text,
      fontFamily:"'Inter Tight', system-ui, sans-serif", fontSize: 12.5,
      display:'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows:'auto 1fr',
    }}>
      <MiniHeader C={C} title="Dashboard"/>
      <MiniSidebar C={C} active="dashboard"/>
      <main style={{overflow:'auto', padding:'24px 28px'}}>
        {/* Masthead */}
        <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 20}}>
          <div>
            <div style={{fontSize: 10, letterSpacing:'.16em', color: C.accent, fontWeight: 600, marginBottom: 6}}>12 · DASHBOARD</div>
            <h1 style={{margin: 0, fontSize: 24, fontWeight: 600, letterSpacing:'-.015em'}}>Risk Posture Overview</h1>
            <p style={{margin:'4px 0 0', fontSize: 12, color: C.muted}}>{SAMPLE.projectName} · updated 4 min ago</p>
          </div>
          <div style={{display:'flex', gap: 6}}>
            <button style={btnGhost2(C)}><Icons.filter/> Filter</button>
            <button style={btnGhost2(C)}><Icons.download/> Export</button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12, marginBottom: 16}}>
          {[
            { label:'Total risks', n:28, delta:'+3', trend:'up' },
            { label:'Critical',    n:1,  delta:'0',  trend:'flat' },
            { label:'Open actions', n:14, delta:'-2', trend:'down', good:true },
            { label:'Avg. residual', n:'7.4', delta:'-0.6', trend:'down', good:true, unit:'/25' },
          ].map((k,i) => (
            <div key={i} style={{background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, padding: 14}}>
              <div style={{fontSize: 10.5, color: C.muted, letterSpacing:'.08em', textTransform:'uppercase', fontWeight: 600}}>{k.label}</div>
              <div style={{display:'flex', alignItems:'baseline', gap: 6, marginTop: 6}}>
                <span style={{fontSize: 28, fontWeight: 600, letterSpacing:'-.02em'}}>{k.n}</span>
                {k.unit && <span style={{fontSize: 13, color: C.muted}}>{k.unit}</span>}
                <span style={{
                  marginLeft:'auto', fontSize: 11, fontWeight: 500,
                  padding:'2px 6px', borderRadius: 3,
                  color: k.good ? '#1f7a4d' : k.trend === 'up' ? '#b8381f' : C.muted,
                  background: k.good ? 'rgba(31,122,77,.08)' : k.trend === 'up' ? 'rgba(184,56,31,.08)' : 'transparent',
                }}>{k.delta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Heat map + list */}
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 14}}>
          <div style={{background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, padding: 16}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 14}}>
              <div>
                <div style={{fontSize: 13.5, fontWeight: 600}}>Risk matrix</div>
                <div style={{fontSize: 11, color: C.muted}}>Likelihood × consequence · inherent</div>
              </div>
              <div style={{display:'flex', gap: 4}}>
                <span style={{fontSize: 10.5, color: C.muted, padding:'3px 8px', background: C.surface2, borderRadius: 3}}>Inherent</span>
                <span style={{fontSize: 10.5, color: C.accent, padding:'3px 8px', background: C.accentSoft, borderRadius: 3, fontWeight: 500}}>Residual</span>
              </div>
            </div>
            <HeatMap C={C}/>
          </div>

          <div style={{background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, padding: 16}}>
            <div style={{fontSize: 13.5, fontWeight: 600, marginBottom: 12}}>Top risks requiring attention</div>
            {[
              { id:'R-014', title:'Unauthorized UAS over berthing area', sev:'crit', score:'22' },
              { id:'R-003', title:'Insider cyber-physical sabotage',   sev:'high', score:'18' },
              { id:'R-021', title:'Perimeter intrusion — north fence', sev:'high', score:'16' },
              { id:'R-009', title:'Credential cloning — gatehouse',    sev:'med',  score:'12' },
              { id:'R-027', title:'Phishing — operations staff',        sev:'med',  score:'10' },
            ].map((r, i) => (
              <div key={r.id} style={{
                display:'flex', alignItems:'center', gap: 10,
                padding:'10px 0', borderTop: i > 0 ? `1px solid ${C.line}` : 'none',
              }}>
                <SevDot sev={r.sev}/>
                <div style={{flex:1}}>
                  <div style={{fontSize: 12.5, fontWeight: 500}}>{r.title}</div>
                  <div style={{fontSize: 10.5, color: C.muted, fontFamily:"'JetBrains Mono', monospace", marginTop: 1}}>{r.id}</div>
                </div>
                <div style={{
                  fontFamily:"'JetBrains Mono', monospace",
                  fontSize: 13, fontWeight: 600,
                  color: sevColor(r.sev),
                }}>{r.score}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trend */}
        <div style={{
          marginTop: 14, background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, padding: 16,
        }}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom: 12}}>
            <div>
              <div style={{fontSize: 13.5, fontWeight: 600}}>Risk profile over time</div>
              <div style={{fontSize: 11, color: C.muted}}>Past 12 weeks · weekly snapshots</div>
            </div>
            <div style={{display:'flex', gap: 8, fontSize: 11}}>
              <LegendDot c="#c0392b" l="High+"/>
              <LegendDot c="#f1c40f" l="Medium"/>
              <LegendDot c="#2ecc71" l="Low"/>
            </div>
          </div>
          <TrendChart C={C}/>
        </div>
      </main>
    </div>
  );
}

function ScreenRiskRegister() {
  const C = {
    bg:'#f5f3ee', surface:'#fff', surface2:'#fafaf6', line:'#e4e2db',
    text:'#111824', muted:'#6b7280', sidebar:'#0a0e14',
    accent:'#b8381f', accentSoft:'rgba(184,56,31,.08)',
  };
  const rows = [
    { id:'R-014', title:'Unauthorized UAS over berthing area', cat:'Physical', asset:'Berth 15', like:4, cons:5, sev:'crit', owner:'J. Patel', status:'Treat', controls:3 },
    { id:'R-003', title:'Insider cyber-physical sabotage', cat:'Insider', asset:'SCADA-B', like:3, cons:5, sev:'high', owner:'K. Morrison', status:'Treat', controls:5 },
    { id:'R-021', title:'Perimeter intrusion — north fence', cat:'Physical', asset:'Fence N', like:4, cons:4, sev:'high', owner:'R. Okafor', status:'Monitor', controls:2 },
    { id:'R-009', title:'Credential cloning at gatehouse', cat:'Access', asset:'Gatehouse A', like:3, cons:4, sev:'med', owner:'FSO', status:'Treat', controls:4 },
    { id:'R-027', title:'Phishing — operations staff', cat:'Cyber', asset:'Ops LAN', like:3, cons:3, sev:'med', owner:'K. Morrison', status:'Accept', controls:3 },
    { id:'R-018', title:'Vessel boarding outside gates', cat:'Maritime', asset:'Quayside', like:2, cons:4, sev:'med', owner:'FSO', status:'Monitor', controls:2 },
    { id:'R-006', title:'Delivery vehicle screening lapse', cat:'Physical', asset:'Goods-in', like:2, cons:3, sev:'low', owner:'Ops', status:'Accept', controls:1 },
    { id:'R-031', title:'Lost key / badge unreported', cat:'Access', asset:'Master set', like:2, cons:3, sev:'low', owner:'Admin', status:'Monitor', controls:2 },
  ];
  return (
    <div style={{
      width:'100%', height:'100%', background: C.bg, color: C.text,
      fontFamily:"'Inter Tight', system-ui, sans-serif", fontSize: 12.5,
      display:'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows:'auto 1fr',
    }}>
      <MiniHeader C={C} title="Risk Register"/>
      <MiniSidebar C={C} active="risk"/>
      <main style={{overflow:'auto', padding:'24px 28px'}}>
        <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom: 16}}>
          <div>
            <div style={{fontSize: 10, letterSpacing:'.16em', color: C.accent, fontWeight: 600, marginBottom: 6}}>09 · RISK REGISTER</div>
            <h1 style={{margin: 0, fontSize: 24, fontWeight: 600, letterSpacing:'-.015em'}}>Consolidated risk log</h1>
            <p style={{margin:'4px 0 0', fontSize: 12, color: C.muted}}>28 risks · filtered by current scope</p>
          </div>
          <div style={{display:'flex', gap: 6}}>
            <div style={{
              display:'flex', alignItems:'center', gap: 6, padding:'6px 10px',
              background: C.surface, border:`1px solid ${C.line}`, borderRadius: 4, fontSize: 11.5,
            }}>
              <Icons.search/>
              <span style={{color: C.muted}}>Search risks…</span>
            </div>
            <button style={btnGhost2(C)}><Icons.filter/> Filters <span style={{background: C.accent, color:'#fff', padding:'0 5px', borderRadius: 2, fontSize: 10, marginLeft: 4}}>3</span></button>
            <button style={{...btnGhost2(C), background: C.text, color:'#fff', borderColor: C.text}}><Icons.plus/> New risk</button>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{display:'flex', gap: 6, marginBottom: 12, fontSize: 11}}>
          {['Stage 2', 'All categories', 'Owner: any', 'Severity: any', 'Status: open'].map((f,i) => (
            <div key={i} style={{
              padding:'4px 9px', background: C.surface,
              border:`1px solid ${C.line}`, borderRadius: 12,
              display:'flex', alignItems:'center', gap: 5, color: C.text,
            }}>{f} <span style={{color: C.muted, cursor:'pointer'}}>×</span></div>
          ))}
        </div>

        {/* Table */}
        <div style={{background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, overflow:'hidden'}}>
          <div style={{
            display:'grid', gridTemplateColumns:'70px 1fr 90px 100px 70px 110px 80px 90px 40px',
            padding:'9px 14px', background: C.surface2,
            fontSize: 10, letterSpacing:'.1em', textTransform:'uppercase',
            color: C.muted, fontWeight: 600, borderBottom:`1px solid ${C.line}`,
          }}>
            <div>ID</div><div>Risk</div><div>Category</div><div>Asset</div><div>L × C</div><div>Severity</div><div>Controls</div><div>Status</div><div></div>
          </div>
          {rows.map((r, i) => (
            <div key={r.id} style={{
              display:'grid', gridTemplateColumns:'70px 1fr 90px 100px 70px 110px 80px 90px 40px',
              padding:'10px 14px', alignItems:'center',
              borderBottom: i < rows.length-1 ? `1px solid ${C.line}` : 'none',
              fontSize: 12,
            }}>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 11, color: C.muted}}>{r.id}</div>
              <div style={{fontWeight: 500}}>{r.title}</div>
              <div style={{color: C.muted}}>{r.cat}</div>
              <div style={{color: C.muted, fontSize: 11.5}}>{r.asset}</div>
              <div style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 11, color: C.muted}}>{r.like}×{r.cons}</div>
              <div>
                <span style={{
                  display:'inline-flex', alignItems:'center', gap: 5,
                  padding:'2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 500,
                  background: sevBg(r.sev), color: sevColor(r.sev),
                  border:`1px solid ${sevColor(r.sev)}33`,
                }}>
                  <span style={{width: 6, height: 6, borderRadius:'50%', background: sevColor(r.sev)}}/>
                  {r.sev.toUpperCase()}
                </span>
              </div>
              <div style={{color: C.muted, fontSize: 11.5}}>{r.controls} linked</div>
              <div style={{fontSize: 11}}>
                <span style={{
                  padding:'2px 7px', borderRadius: 3, fontSize: 10.5,
                  background: r.status === 'Treat' ? 'rgba(196,122,11,.1)' : r.status === 'Accept' ? 'rgba(31,122,77,.08)' : 'rgba(45,91,140,.08)',
                  color: r.status === 'Treat' ? '#a85f08' : r.status === 'Accept' ? '#1f7a4d' : '#2d5b8c',
                  fontWeight: 500,
                }}>{r.status}</span>
              </div>
              <div style={{color: C.muted, display:'flex', justifyContent:'flex-end'}}><Icons.more/></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ScreenThreats() {
  const C = {
    bg:'#f5f3ee', surface:'#fff', surface2:'#fafaf6', line:'#e4e2db',
    text:'#111824', muted:'#6b7280', sidebar:'#0a0e14',
    accent:'#b8381f', accentSoft:'rgba(184,56,31,.08)',
  };
  const threats = [
    { id:'T-01', name:'Hostile reconnaissance (UAS)', actor:'State-aligned', likelihood:4, trend:'up', linked:3 },
    { id:'T-02', name:'Insider — coerced',           actor:'Insider',       likelihood:3, trend:'flat', linked:5 },
    { id:'T-03', name:'Ram-raid vehicle attack',     actor:'Extremist',     likelihood:2, trend:'flat', linked:2 },
    { id:'T-04', name:'Cyber — ransomware',          actor:'Criminal',      likelihood:4, trend:'up', linked:4 },
    { id:'T-05', name:'Protest incursion',           actor:'Activist',      likelihood:3, trend:'up', linked:1 },
    { id:'T-06', name:'Opportunistic theft',         actor:'Petty crime',   likelihood:3, trend:'down', linked:2 },
  ];
  return (
    <div style={{
      width:'100%', height:'100%', background: C.bg, color: C.text,
      fontFamily:"'Inter Tight', system-ui, sans-serif", fontSize: 12.5,
      display:'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows:'auto 1fr',
    }}>
      <MiniHeader C={C} title="Threats"/>
      <MiniSidebar C={C} active="threats"/>
      <main style={{overflow:'auto', padding:'24px 28px'}}>
        <div style={{marginBottom: 16}}>
          <div style={{fontSize: 10, letterSpacing:'.16em', color: C.accent, fontWeight: 600, marginBottom: 6}}>04 · THREATS</div>
          <h1 style={{margin: 0, fontSize: 24, fontWeight: 600, letterSpacing:'-.015em'}}>Threat inventory</h1>
          <p style={{margin:'4px 0 0', fontSize: 12, color: C.muted}}>Credible threat vectors mapped to assets and controls</p>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12}}>
          {threats.map(t => (
            <div key={t.id} style={{
              background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, padding: 14,
              display:'flex', flexDirection:'column', gap: 10,
            }}>
              <div style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between'}}>
                <div>
                  <div style={{fontSize: 10.5, color: C.muted, fontFamily:"'JetBrains Mono', monospace"}}>{t.id}</div>
                  <div style={{fontSize: 14, fontWeight: 600, marginTop: 2}}>{t.name}</div>
                </div>
                <div style={{
                  padding:'2px 7px', fontSize: 10, fontWeight: 600,
                  background: C.accentSoft, color: C.accent, borderRadius: 2,
                  letterSpacing:'.04em',
                }}>{t.actor}</div>
              </div>

              <div>
                <div style={{display:'flex', justifyContent:'space-between', fontSize: 10.5, color: C.muted, marginBottom: 4, letterSpacing:'.06em', textTransform:'uppercase', fontWeight: 600}}>
                  <span>Likelihood</span>
                  <span style={{display:'flex', alignItems:'center', gap: 3, color: t.trend === 'up' ? '#b8381f' : t.trend === 'down' ? '#1f7a4d' : C.muted}}>
                    {t.trend === 'up' ? '↑' : t.trend === 'down' ? '↓' : '→'} {t.trend}
                  </span>
                </div>
                <div style={{display:'flex', gap: 3}}>
                  {[1,2,3,4,5].map(n => (
                    <div key={n} style={{
                      flex: 1, height: 6, borderRadius: 1,
                      background: n <= t.likelihood ? C.accent : C.line,
                    }}/>
                  ))}
                </div>
              </div>

              <div style={{display:'flex', justifyContent:'space-between', fontSize: 11, color: C.muted, paddingTop: 8, borderTop:`1px solid ${C.line}`}}>
                <span>{t.linked} linked assets</span>
                <span style={{color: C.accent, fontWeight: 500, cursor:'pointer'}}>View →</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// ─── shared sub-components for mini screens ───

function MiniHeader({ C, title }) {
  return (
    <header style={{
      gridColumn:'1/-1', height: 48, background: C.sidebar, color:'#fff',
      display:'flex', alignItems:'center', padding:'0 14px', gap: 14,
    }}>
      <div style={{display:'flex', alignItems:'center', gap: 8, minWidth: 204}}>
        <div style={{width: 22, height: 22, borderRadius: 4, background: C.accent, display:'grid', placeItems:'center', color:'#fff', fontWeight: 700, fontSize: 10}}>S·T</div>
        <div style={{fontSize: 12, fontWeight: 600}}>Sentinel</div>
      </div>
      <div style={{flex:1, fontSize: 11.5, color:'#a8b3c8'}}>
        <span style={{color:'#6b7688'}}>Northsea Maritime</span>
        <span style={{color:'#3a4558', margin:'0 6px'}}>/</span>
        <span style={{color:'#fff'}}>{SAMPLE.projectName}</span>
        <span style={{color:'#3a4558', margin:'0 6px'}}>/</span>
        <span style={{color:'#fff', fontWeight: 500}}>{title}</span>
      </div>
      <div style={{
        width: 26, height: 26, borderRadius:'50%',
        background:'linear-gradient(135deg,#c47a0b,#b8381f)',
        display:'grid', placeItems:'center', fontSize: 10, fontWeight: 700, color:'#fff',
      }}>KM</div>
    </header>
  );
}

function MiniSidebar({ C, active }) {
  return (
    <aside style={{
      background: C.sidebar, padding:'10px 8px', overflow:'auto',
    }}>
      {NAV_SECTIONS.map(section => (
        <div key={section.group} style={{marginBottom: 8}}>
          <div style={{fontSize: 9, color:'#556479', letterSpacing:'.14em', textTransform:'uppercase', padding:'5px 8px 3px', fontWeight: 600}}>{section.group}</div>
          {section.items.map(item => {
            const isActive = active === item.id;
            return (
              <div key={item.id} style={{
                display:'flex', alignItems:'center', gap: 8, width:'100%', padding:'5px 8px',
                background: isActive ? 'rgba(184,56,31,.14)' : 'transparent',
                color: isActive ? '#fff' : '#a8b3c8',
                borderRadius: 4, fontSize: 11.5,
                borderLeft: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                paddingLeft: isActive ? 6 : 8,
              }}>
                <span style={{color: isActive ? C.accent : '#6b7688', display:'flex'}}>{Icons[item.icon]()}</span>
                <span style={{flex: 1, fontWeight: isActive ? 500 : 400}}>{item.label}</span>
                {item.badge && <span style={{fontSize: 9.5, padding:'0 5px', borderRadius: 2, background:'rgba(255,255,255,.06)', color:'#8591a6', fontFeatureSettings:"'tnum'"}}>{item.badge}</span>}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

function HeatMap({ C }) {
  // 5x5 with counts. Diagonal heavier.
  const grid = [
    [1,0,0,0,0],
    [0,3,1,1,0],
    [2,4,5,2,1],
    [1,2,3,2,0],
    [0,0,0,1,0],
  ];
  // Classic risk matrix palette — unchanged from the original tool.
  // Green → Yellow → Orange → Red based on L+C score.
  const colorFor = (l, c) => {
    const sum = l + c;
    if (sum >= 9) return '#c0392b'; // extreme — red
    if (sum >= 7) return '#e67e22'; // high — orange
    if (sum >= 5) return '#f1c40f'; // medium — yellow
    if (sum >= 3) return '#8bc34a'; // low — light green
    return '#2ecc71';               // very low — green
  };
  return (
    <div style={{display:'grid', gridTemplateColumns:'30px repeat(5, 1fr)', gap: 3}}>
      {/* top row: col labels */}
      <div/>
      {[1,2,3,4,5].map(c => <div key={c} style={{fontSize: 10, color: C.muted, textAlign:'center'}}>{c}</div>)}
      {/* rows */}
      {[5,4,3,2,1].map((l, li) => (
        <React.Fragment key={l}>
          <div style={{fontSize: 10, color: C.muted, display:'flex', alignItems:'center', justifyContent:'flex-end', paddingRight: 4}}>{l}</div>
          {[1,2,3,4,5].map(c => {
            const n = grid[li][c-1];
            return (
              <div key={c} style={{
                aspectRatio:'1/1', borderRadius: 3,
                background: colorFor(l,c),
                color: n > 0 ? '#fff' : 'rgba(255,255,255,.55)',
                display:'grid', placeItems:'center',
                fontWeight: 600, fontSize: 13,
              }}>{n > 0 ? n : ''}</div>
            );
          })}
        </React.Fragment>
      ))}
      <div/>
      <div style={{gridColumn:'2 / -1', marginTop: 6, display:'flex', justifyContent:'space-between', fontSize: 10, color: C.muted}}>
        <span>Likelihood →</span>
        <span style={{transform:'none', position:'absolute', left:-20, top:'50%', writingMode:'vertical-rl'}}/>
      </div>
    </div>
  );
}

function TrendChart({ C }) {
  const weeks = 12;
  const series = {
    high:   [4,5,5,6,6,5,6,7,6,6,5,5],
    med:    [9,10,11,11,12,13,13,14,14,15,14,14],
    low:    [6,6,7,7,8,8,8,8,9,9,9,9],
  };
  const max = 35;
  const pts = (arr) => arr.map((v, i) => `${(i/(weeks-1))*100},${100 - (v/max)*100}`).join(' ');
  return (
    <div style={{position:'relative', height: 180}}>
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{overflow:'visible'}}>
        {[0, 25, 50, 75, 100].map(y => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke={C.line} strokeWidth="0.2"/>
        ))}
        <polygon points={`0,100 ${pts(series.low)} 100,100`} fill="rgba(46,204,113,.2)"/>
        <polyline points={pts(series.low)} fill="none" stroke="#2ecc71" strokeWidth="0.6"/>
        <polyline points={pts(series.med)} fill="none" stroke="#f1c40f" strokeWidth="0.7"/>
        <polyline points={pts(series.high)} fill="none" stroke="#c0392b" strokeWidth="0.8"/>
      </svg>
      <div style={{position:'absolute', left:0, right:0, bottom: -16, display:'flex', justifyContent:'space-between', fontSize: 10, color: C.muted}}>
        <span>W01</span><span>W04</span><span>W08</span><span>W12</span>
      </div>
    </div>
  );
}

function SevDot({ sev }) {
  return <div style={{
    width: 10, height: 10, borderRadius: 2,
    background: sevColor(sev),
    boxShadow: `0 0 0 3px ${sevColor(sev)}22`,
    flexShrink: 0,
  }}/>;
}
function LegendDot({ c, l }) {
  return <span style={{display:'flex', alignItems:'center', gap: 4, color:'#6b7280'}}><span style={{width: 8, height: 8, background: c, borderRadius: 2}}/>{l}</span>;
}

// Classic risk matrix palette — must match the original tool.
function sevColor(sev) {
  return { low:'#2ecc71', med:'#f1c40f', high:'#e67e22', crit:'#c0392b' }[sev];
}
function sevBg(sev) {
  return { low:'rgba(46,204,113,.1)', med:'rgba(241,196,15,.12)', high:'rgba(230,126,34,.1)', crit:'rgba(192,57,43,.1)' }[sev];
}
function btnGhost2(C) {
  return {
    padding:'6px 10px', borderRadius: 4, fontSize: 11.5,
    background: C.surface, color: C.text,
    border:`1px solid ${C.line}`, cursor:'pointer', fontFamily:'inherit',
    display:'flex', alignItems:'center', gap: 5,
  };
}

window.ScreenDashboard = ScreenDashboard;
window.ScreenRiskRegister = ScreenRiskRegister;
window.ScreenThreats = ScreenThreats;
