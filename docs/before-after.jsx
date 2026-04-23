// Before/after annotated callout + original recreation

function BeforeAfter() {
  const C = {
    bg:'#f5f3ee', surface:'#fff', line:'#e4e2db',
    text:'#111824', muted:'#6b7280', accent:'#b8381f',
  };

  const issues = [
    { n:1, top: '2%', left:'22%', label:'Toolbar clutter', detail:'9 unlabeled buttons with similar weight; no grouping.' },
    { n:2, top: '6%', left:'5%',  label:'Tab overload',    detail:'14 equal-weight tabs, hard to scan and track progress.' },
    { n:3, top: '33%', left:'25%', label:'Colored chip soup', detail:'Treatment categories as random bright blobs with no legend.' },
    { n:4, top: '55%', left:'20%', label:'Flat hierarchy',  detail:'Every section looks the same; tables blend with forms.' },
    { n:5, top: '14%', left:'30%', label:'Weak headline',   detail:'Section title fights with tabs; no stage, no status.' },
    { n:6, top: '75%', left:'8%',  label:'Dead table',      detail:'Empty state with tiny CTA; low visual affordance.' },
  ];

  return (
    <div style={{
      width:'100%', height:'100%', background: C.bg, padding: 28,
      fontFamily:"'Inter Tight', system-ui, sans-serif",
      display:'grid', gridTemplateRows:'auto 1fr', gap: 20,
    }}>
      <div>
        <div style={{fontSize: 10, letterSpacing:'.16em', color: C.accent, fontWeight: 600}}>BEFORE · ANNOTATED</div>
        <h1 style={{margin:'4px 0 0', fontSize: 24, fontWeight: 600, letterSpacing:'-.015em'}}>What's not working in the current design</h1>
        <p style={{margin:'4px 0 0', fontSize: 12.5, color: C.muted, maxWidth: 680}}>
          Six issues flagged on the Context & Criteria screen. Numbers correspond to items in the fix list on the right.
        </p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 20, minHeight: 0}}>
        {/* Screenshot-like recreation */}
        <div style={{position:'relative', background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6, overflow:'hidden'}}>
          <OriginalRecreation/>
          {issues.map(i => (
            <div key={i.n} style={{
              position:'absolute', top: i.top, left: i.left,
              width: 22, height: 22, borderRadius:'50%',
              background: C.accent, color:'#fff',
              display:'grid', placeItems:'center',
              fontSize: 11, fontWeight: 700,
              boxShadow:'0 0 0 3px rgba(184,56,31,.25), 0 2px 6px rgba(0,0,0,.2)',
              cursor:'pointer',
              fontFamily:"'JetBrains Mono', monospace",
            }}>{i.n}</div>
          ))}
        </div>

        {/* Fix list */}
        <div style={{display:'flex', flexDirection:'column', gap: 10, overflow:'auto'}}>
          {issues.map(i => (
            <div key={i.n} style={{
              display:'flex', gap: 12, padding: 14,
              background: C.surface, border:`1px solid ${C.line}`, borderRadius: 6,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius:'50%',
                background: C.accent, color:'#fff',
                display:'grid', placeItems:'center', flexShrink: 0,
                fontSize: 12, fontWeight: 700, fontFamily:"'JetBrains Mono', monospace",
              }}>{i.n}</div>
              <div>
                <div style={{fontSize: 13, fontWeight: 600, marginBottom: 2}}>{i.label}</div>
                <div style={{fontSize: 11.5, color: C.muted, lineHeight: 1.45}}>{i.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Faithful but stylized recreation of the user's screenshot
function OriginalRecreation() {
  const chip = (bg, label) => (
    <div style={{padding:'3px 8px', borderRadius: 3, background: bg, color:'#fff', fontSize: 9}}>{label}</div>
  );
  return (
    <div style={{width:'100%', height:'100%', background:'#fff', fontSize: 8.5, color:'#333', overflow:'hidden', position:'relative'}}>
      {/* top bar */}
      <div style={{background:'#1e3a5f', color:'#fff', padding:'7px 14px', display:'flex', alignItems:'center', gap: 6}}>
        <div style={{fontSize: 10, fontWeight: 700}}>Security Risk & Threat Assessment Tool</div>
        <div style={{marginLeft:'auto', display:'flex', gap: 3}}>
          {['Save','Load','Word','Word Prop','Excel','Print','Setup','Next'].map(b => (
            <div key={b} style={{background:'#fff', color:'#1e3a5f', padding:'2px 6px', fontSize: 8, borderRadius: 2}}>{b}</div>
          ))}
        </div>
      </div>
      {/* tabs */}
      <div style={{background:'#f8f8f8', borderBottom:'1px solid #ddd', padding:'4px 14px', display:'flex', gap: 8, fontSize: 8}}>
        {['Context','Criteria & Tolerances','Assets','Threats','Points of Interest','Attractiveness, Vuln. & Likelihood','Impact','Existing Controls','Risk Register','Residual Risk & Treatments','Summary','Dashboard','SMS Requirements','Methodology','Database','Settings'].map((t,i) => (
          <div key={t} style={{color: i===0 ? '#1e3a5f' : '#888', fontWeight: i===0 ? 700 : 400, borderBottom: i===0 ? '2px solid #1e3a5f' : 'none', paddingBottom: 3}}>{t}</div>
        ))}
      </div>
      {/* body */}
      <div style={{padding:'14px 60px'}}>
        <div style={{fontSize: 16, fontWeight: 700, color:'#222'}}>Context & Criteria</div>
        <div style={{fontSize: 8, color:'#888', marginBottom: 12}}>ISO 31000 Clause 5.3 · Define scope, objectives and risk appetite.</div>

        <div style={{fontSize: 10, fontWeight: 600, marginBottom: 8}}>Project Details</div>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginBottom: 12}}>
          {['Project Name','Project Number','Support Reference','Date','RMS Stage','Revision','Client','Site Address','Province','Country','Consignment Type'].map((f, i) => (
            <div key={f} style={{gridColumn: f === 'Consignment Type' ? 'span 2' : 'auto'}}>
              <div style={{fontSize: 8, color:'#666', marginBottom: 2}}>{f}</div>
              <div style={{height: 20, border:'1px solid #ccc', borderRadius: 2, background:'#fff'}}/>
            </div>
          ))}
        </div>

        <div style={{marginBottom: 10}}>
          <div style={{fontSize: 8, color:'#666', marginBottom: 4}}>Treatment Categories in Scope</div>
          <div style={{display:'flex', gap: 5}}>
            {chip('#1f4d8c','Procedures')}
            {chip('#8a2d8f','Electronic Sys')}
            {chip('#6b3d9c','Electronic Sys')}
            {chip('#8a5a8f','Response')}
            {chip('#c47a0b','Training')}
          </div>
        </div>

        {['Scope Boundaries','Key Assumptions','Notes'].map(l => (
          <div key={l} style={{marginBottom: 10}}>
            <div style={{fontSize: 8, color:'#666', marginBottom: 2}}>{l}</div>
            <div style={{height: 38, border:'1px solid #ccc', borderRadius: 2, background:'#fff'}}/>
          </div>
        ))}

        <div style={{fontSize: 9, fontWeight: 600, marginTop: 14, marginBottom: 6}}>Stakeholder Meetings & Consultations</div>
        <div style={{background:'#1e3a5f', color:'#fff', padding:'5px 10px', fontSize: 8, display:'flex', gap: 8}}>
          <span>DATE</span><span>MEETING DESCRIPTION</span><span style={{marginLeft:'auto'}}>ATTENDEES</span>
        </div>
        <div style={{padding:'10px', textAlign:'center', fontSize: 8, color:'#999', border:'1px solid #e0e0e0', borderTop:'none'}}>
          No meetings recorded. Click "+ Add Meeting" to get started.
        </div>
        <div style={{marginTop: 6, color:'#1e3a5f', fontSize: 8}}>+ Add Meeting</div>

        <div style={{fontSize: 9, fontWeight: 600, marginTop: 14, marginBottom: 4}}>Area Analysis</div>
        <div style={{fontSize: 8, color:'#666'}}>Use intelligence from Security Assessment Tool. Paste into Copy AI Prompt...</div>
      </div>
    </div>
  );
}

window.BeforeAfter = BeforeAfter;
