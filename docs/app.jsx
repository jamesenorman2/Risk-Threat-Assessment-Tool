// App shell — DesignCanvas with artboards for before/after + 2 variations + extras.
// Also wires up Tweaks panel for density / theme / nav / typography.

const TWEAKS_DEFAULT = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "theme": "light",
  "primary_variation": "A",
  "show_annotations": true
}/*EDITMODE-END*/;

function App() {
  const [tw, setTw] = React.useState(TWEAKS_DEFAULT);
  const [editOn, setEditOn] = React.useState(false);

  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === '__activate_edit_mode') setEditOn(true);
      if (e.data.type === '__deactivate_edit_mode') setEditOn(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({type:'__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const update = (k, v) => {
    setTw(t => {
      const next = { ...t, [k]: v };
      window.parent.postMessage({type:'__edit_mode_set_keys', edits:{[k]:v}}, '*');
      return next;
    });
  };

  return (
    <>
      <DesignCanvas>
        <DCSection id="overview" title="Security Risk & Threat Assessment — Redesign"
          subtitle="Before · 2 directions · extended screens. Drag to reorder. Click ⤢ on any card to focus.">
          <DCArtboard id="before" label="Before · Annotated" width={1200} height={820}>
            <BeforeAfter/>
          </DCArtboard>
        </DCSection>

        <DCSection id="directions" title="Two directions for Context & Criteria"
          subtitle="Both follow the same ask: sidebar + breadcrumb, grouped toolbar, semantic treatment categories, clear hierarchy.">
          <DCArtboard id="var-a" label="A · Sentinel — Dark-accent ops" width={1440} height={980}>
            <VariationA density={tw.density} theme={tw.theme}/>
          </DCArtboard>
          <DCArtboard id="var-b" label="B · Atlas — Cartographic" width={1440} height={980}>
            <VariationB density={tw.density}/>
          </DCArtboard>
        </DCSection>

        <DCSection id="extended" title="How the system extends"
          subtitle={`${tw.primary_variation === 'A' ? 'Variation A' : 'Variation A'} applied to other tabs. Consistent header, sidebar, type scale, and semantic color.`}>
          <DCArtboard id="dashboard" label="Dashboard" width={1280} height={860}>
            <ScreenDashboard/>
          </DCArtboard>
          <DCArtboard id="risk" label="Risk Register" width={1280} height={860}>
            <ScreenRiskRegister/>
          </DCArtboard>
          <DCArtboard id="threats" label="Threats" width={1280} height={860}>
            <ScreenThreats/>
          </DCArtboard>
        </DCSection>

        <DCSection id="spec" title="Handoff spec" subtitle="What to instruct Claude Code to change.">
          <DCArtboard id="spec-doc" label="Change spec" width={900} height={1100}>
            <SpecDoc/>
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      {editOn && <TweaksPanel tw={tw} update={update}/>}
    </>
  );
}

function TweaksPanel({ tw, update }) {
  return (
    <div style={{
      position:'fixed', bottom: 16, right: 16, zIndex: 10000,
      width: 280, background:'#0a0e14', color:'#e8ecf2',
      border:'1px solid #253044', borderRadius: 8,
      fontFamily:"'Inter Tight', system-ui, sans-serif",
      fontSize: 12, boxShadow:'0 20px 60px rgba(0,0,0,.4)',
      overflow:'hidden',
    }}>
      <div style={{padding:'10px 12px', borderBottom:'1px solid #253044', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontWeight: 600}}>Tweaks</div>
        <div style={{fontSize: 10, color:'#8591a6', letterSpacing:'.1em', textTransform:'uppercase'}}>Live</div>
      </div>
      <div style={{padding: 12, display:'flex', flexDirection:'column', gap: 14}}>
        <TweakRow label="Density">
          <Segment value={tw.density} onChange={v=>update('density', v)}
            options={[{v:'compact',l:'Compact'},{v:'comfortable',l:'Comfort'},{v:'spacious',l:'Spacious'}]}/>
        </TweakRow>
        <TweakRow label="Theme (Variation A)">
          <Segment value={tw.theme} onChange={v=>update('theme', v)}
            options={[{v:'light',l:'Light'},{v:'dark',l:'Dark'}]}/>
        </TweakRow>
        <TweakRow label="Annotations">
          <Segment value={tw.show_annotations ? 'on' : 'off'} onChange={v=>update('show_annotations', v === 'on')}
            options={[{v:'on',l:'Shown'},{v:'off',l:'Hidden'}]}/>
        </TweakRow>
      </div>
    </div>
  );
}
function TweakRow({ label, children }) {
  return (
    <div>
      <div style={{fontSize: 10, letterSpacing:'.1em', textTransform:'uppercase', color:'#8591a6', fontWeight: 600, marginBottom: 6}}>{label}</div>
      {children}
    </div>
  );
}
function Segment({ value, onChange, options }) {
  return (
    <div style={{display:'flex', background:'#111824', border:'1px solid #253044', borderRadius: 4, padding: 2}}>
      {options.map(o => (
        <button key={o.v} onClick={()=>onChange(o.v)} style={{
          flex: 1, padding:'5px 8px', borderRadius: 3, border:'none',
          background: value === o.v ? '#b8381f' : 'transparent',
          color: value === o.v ? '#fff' : '#a8b3c8',
          fontSize: 11, fontWeight: 500, cursor:'pointer', fontFamily:'inherit',
        }}>{o.l}</button>
      ))}
    </div>
  );
}

function SpecDoc() {
  const C = { bg:'#fdfcf7', ink:'#1a1814', sub:'#6b6660', line:'#e4dfd2', accent:'#8a2a14' };
  const changes = [
    { area:'Information architecture', items:[
      'Replace 16-tab horizontal bar with left sidebar grouped by phase (Project · Analysis · Outputs · System).',
      'Add breadcrumb: Workspace › Client › Project. Show project number and revision as metadata badge.',
      'Add a 7-step workflow stepper (Context→Criteria→Assets→Threats→Analysis→Treatments→Report) under the header.',
    ]},
    { area:'Toolbar', items:[
      'Group actions: Save cluster (Save+Load), Export cluster (Word/Excel/Print), Setup cluster.',
      'Primary "Next: Criteria" button as the only filled accent action; everything else ghost.',
      'Use icons + labels, not icons alone. Reduce from 9 buttons to 3 grouped tiles + 1 primary.',
    ]},
    { area:'Treatment categories', items:[
      'Replace random colored chips with a semantic legend: mono glyph + name, consistent neutral treatment.',
      'Use a single accent color for selection state; selected = dark fill, unselected = outlined.',
      'Introduce glyphs P·E·S·R·T so categories are recognisable in downstream tables.',
    ]},
    { area:'Forms', items:[
      'Uppercase micro-labels (10.5px, letter-spacing .04em) above every field. Not title case.',
      'Monospace for identifiers (project number, support ref, dates in tables).',
      'Group into numbered sub-sections (1.1 Project Details, 1.2 Scope & Assumptions…).',
    ]},
    { area:'Right rail', items:[
      'Persistent sidecar with: section completion %, required-fields checklist, preliminary risk posture, related references.',
      'Lets the analyst see gating blockers without scrolling or navigating away.',
    ]},
    { area:'Color & type', items:[
      'Neutral palette: ink #0a0e14, surface #fff, paper #fafaf6, line #e4e2db.',
      'Single accent: signal-red #b8381f (or burgundy #8a2a14 for Atlas direction).',
      'Severity scale: green #4b6b4b · amber #c47a0b · red #b8381f · deep #5a0f0a (used semantically, never decoratively).',
      'Type: Inter Tight (UI) + JetBrains Mono (IDs, dates, counts). Optional Instrument Serif for display (Atlas only).',
    ]},
    { area:'Component tokens', items:[
      'Radii: 3px (chips, buttons), 4px (inputs), 6px (panels). Never round.',
      'Field height: 34 / 38 / 42 (compact · comfortable · spacious).',
      'Spacing: 4/8/12/16/20/28 grid. Panel internal padding = 16.',
    ]},
  ];
  return (
    <div style={{
      width:'100%', height:'100%', overflow:'auto',
      background: C.bg, padding:'40px 48px',
      fontFamily:"'Inter Tight', system-ui, sans-serif", color: C.ink,
    }}>
      <div style={{fontSize: 10, letterSpacing:'.16em', color: C.accent, fontWeight: 600}}>HANDOFF · FOR CLAUDE CODE</div>
      <h1 style={{margin:'6px 0 4px', fontSize: 28, fontWeight: 600, letterSpacing:'-.015em'}}>Change spec</h1>
      <p style={{margin:'0 0 24px', fontSize: 13, color: C.sub, maxWidth: 640, lineHeight: 1.5}}>
        Paste this into Claude Code alongside the two variation screenshots. Each item is self-contained and touch one concern only.
      </p>
      {changes.map((sec, i) => (
        <section key={sec.area} style={{marginBottom: 20, paddingBottom: 20, borderBottom: i < changes.length-1 ? `1px solid ${C.line}` : 'none'}}>
          <div style={{display:'flex', alignItems:'baseline', gap: 10, marginBottom: 10}}>
            <span style={{fontFamily:"'JetBrains Mono', monospace", fontSize: 11, color: C.accent, fontWeight: 600}}>{String(i+1).padStart(2,'0')}</span>
            <h2 style={{margin: 0, fontSize: 15, fontWeight: 600}}>{sec.area}</h2>
          </div>
          <ul style={{margin: 0, paddingLeft: 28}}>
            {sec.items.map((it, j) => (
              <li key={j} style={{fontSize: 12.5, color: C.ink, lineHeight: 1.55, marginBottom: 5}}>{it}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
