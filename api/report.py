"""Word report generator (Vercel Python serverless).

POST /api/report with an assessment JSON body (same shape as a saved project
file in projects/). Returns a .docx download.

Report order: cover -> executive summary -> threats table -> treatments ->
residual risk.
"""
from http.server import BaseHTTPRequestHandler
import io
import json
import os
import re
from datetime import datetime

os.environ.setdefault("MPLCONFIGDIR", "/tmp/mpl")
os.makedirs(os.environ["MPLCONFIGDIR"], exist_ok=True)

# Lazy-imported inside chart helpers so an install/runtime issue surfaces as a
# clear 500 error rather than a cold-start crash that yields an opaque 500.
def _mpl():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as _plt
    from matplotlib.patches import Rectangle as _Rect
    return _plt, _Rect

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Mm, Pt, RGBColor


NAVY = RGBColor(0x1B, 0x2A, 0x4A)
GREY_DARK = RGBColor(0x47, 0x55, 0x69)
GREY_MID = RGBColor(0x64, 0x74, 0x8B)
GREY_LIGHT = RGBColor(0xD6, 0xDC, 0xE4)

LEVEL_HEX = {
    "Very Low": "4472C4",
    "Low": "70AD47",
    "Medium": "FFC000",
    "High": "ED7D31",
    "Very High": "C00000",
}
LEVEL_FG = {
    "Very Low": RGBColor(0xFF, 0xFF, 0xFF),
    "Low": RGBColor(0xFF, 0xFF, 0xFF),
    "Medium": RGBColor(0x1A, 0x1A, 0x1A),
    "High": RGBColor(0xFF, 0xFF, 0xFF),
    "Very High": RGBColor(0xFF, 0xFF, 0xFF),
}
SCORE_LEVEL = {1: "Very Low", 2: "Low", 3: "Medium", 4: "High", 5: "Very High"}
IL = {1: "Negligible", 2: "Minor", 3: "Moderate", 4: "Severe", 5: "Catastrophic"}
LL = {1: "Very Unlikely", 2: "Unlikely", 3: "Possible", 4: "Likely", 5: "Very Likely"}
RM = [
    ["Medium", "High", "High", "Very High", "Very High"],
    ["Low", "Medium", "High", "High", "Very High"],
    ["Low", "Medium", "Medium", "High", "High"],
    ["Very Low", "Low", "Medium", "Medium", "High"],
    ["Very Low", "Very Low", "Low", "Low", "Medium"],
]
TAC = ["visibility", "status", "access", "collateral", "crime", "history"]
IC = ["disruption", "fatalities", "reputation", "financial", "property"]
AC = ["opImpact", "dependencies", "impactPeople", "impactEnv"]


# --- Computation helpers (mirror of index.html logic) ---

def _avg(values):
    vals = [v for v in values if v is not None and v != 0 and v != ""]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 1)


def _get_rr(lik, imp):
    if not lik or not imp:
        return None
    lik_i = int(round(lik))
    imp_i = int(round(imp))
    if not (1 <= lik_i <= 5 and 1 <= imp_i <= 5):
        return None
    return RM[5 - lik_i][imp_i - 1]


def compute_risks(state):
    threats = state.get("threats", []) or []
    vs = state.get("vs", {}) or {}
    is_ = state.get("is_", {}) or {}
    tx = state.get("tx", {}) or {}
    rs = state.get("rs", {}) or {}
    acc = state.get("acc", {}) or {}

    risks = []
    for t in threats:
        tid = str(t.get("id"))
        cap, intent = t.get("cap"), t.get("int")
        sc = round((cap + intent) / 2) if cap and intent else None
        lv = SCORE_LEVEL.get(sc) if sc else None
        dbt = bool(sc and sc >= 3)

        v = vs.get(tid, {}) or {}
        im = is_.get(tid, {}) or {}
        ta = _avg([v.get(c) for c in TAC])
        vu = v.get("vuln")
        tot = sc + ta + vu if (sc and ta and vu) else None
        lik = round(tot / 3) if tot else None
        raw_imp = _avg([im.get(c) for c in IC])
        fat = im.get("fatalities")
        life_safety = bool(fat and fat >= 4 and raw_imp and raw_imp < 4)
        imp = 4 if life_safety else raw_imp
        rat = _get_rr(lik, imp)

        r = rs.get(tid, {}) or {}
        res_l, res_i = r.get("l"), r.get("i")
        res_rat = _get_rr(res_l, res_i)

        risks.append({
            "id": t.get("id"),
            "n": t.get("n", ""),
            "d": t.get("d", ""),
            "cat": t.get("cat", ""),
            "cap": cap, "int": intent, "sc": sc, "lv": lv, "dbt": dbt,
            "ta": ta, "vu": vu, "lik": lik, "imp": imp,
            "rawImp": raw_imp, "lifeSafetyOverride": life_safety,
            "rat": rat,
            "treat": tx.get(tid),
            "resL": res_l, "resI": res_i, "resRat": res_rat,
            "acc": acc.get(tid),
            "targets": t.get("targets", []) or [],
        })
    return risks


# --- Low-level docx helpers ---

def _shade(cell, hex_fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_fill)
    tc_pr.append(shd)


def _borders(table, size="4", color="D6DCE4"):
    tbl = table._tbl
    tbl_pr = tbl.find(qn("w:tblPr"))
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        b = OxmlElement(f"w:{edge}")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), size)
        b.set(qn("w:color"), color)
        borders.append(b)
    tbl_pr.append(borders)


def _set_cell_text(cell, text, *, bold=False, size=9, color=None, align="left",
                   fill=None, font="Calibri"):
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT,
                   "center": WD_ALIGN_PARAGRAPH.CENTER,
                   "right": WD_ALIGN_PARAGRAPH.RIGHT}[align]
    run = p.add_run(str(text) if text is not None else "")
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    if color is not None:
        run.font.color.rgb = color
    if fill:
        _shade(cell, fill)
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER


def _add_heading(doc, text, level=1):
    p = doc.add_paragraph()
    if level == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(16)
        run.font.bold = True
        run.font.color.rgb = NAVY
        _set_para_border(p, bottom=("12", "1B2A4A"))
        _set_para_spacing(p, before=180, after=120)
    elif level == 2:
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.bold = True
        run.font.color.rgb = NAVY
        _set_para_spacing(p, before=120, after=80)
    else:
        run = p.add_run(text)
        run.font.name = "Calibri"
        run.font.size = Pt(10)
        run.font.bold = True
        run.font.color.rgb = GREY_DARK
        _set_para_spacing(p, before=80, after=40)
    return p


def _set_para_spacing(p, before=0, after=0):
    pf = p.paragraph_format
    if before:
        pf.space_before = Pt(before / 20)
    if after:
        pf.space_after = Pt(after / 20)


def _set_para_border(p, bottom=None):
    p_pr = p._p.get_or_add_pPr()
    pbdr = OxmlElement("w:pBdr")
    if bottom:
        b = OxmlElement("w:bottom")
        b.set(qn("w:val"), "single")
        b.set(qn("w:sz"), bottom[0])
        b.set(qn("w:color"), bottom[1])
        b.set(qn("w:space"), "1")
        pbdr.append(b)
    p_pr.append(pbdr)


def _add_para(doc, text, *, size=10, bold=False, italic=False, color=None,
              align="left", space_after=60):
    p = doc.add_paragraph()
    p.alignment = {"left": WD_ALIGN_PARAGRAPH.LEFT,
                   "center": WD_ALIGN_PARAGRAPH.CENTER,
                   "right": WD_ALIGN_PARAGRAPH.RIGHT,
                   "justify": WD_ALIGN_PARAGRAPH.JUSTIFY}[align]
    run = p.add_run(text or "")
    run.font.name = "Calibri"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    if color:
        run.font.color.rgb = color
    _set_para_spacing(p, after=space_after)
    return p


def _page_break(doc):
    p = doc.add_paragraph()
    p.add_run().add_break(WD_BREAK.PAGE)


# --- Chart helpers ---

def _try_picture(doc, builder, width):
    """Embed a chart; on failure insert a small italic note and continue.

    Lets the report render even if matplotlib fails to import on the runtime.
    """
    try:
        buf = builder()
        doc.add_picture(buf, width=width)
    except Exception as e:
        p = doc.add_paragraph()
        run = p.add_run(f"[Chart unavailable: {type(e).__name__}]")
        run.font.name = "Calibri"
        run.font.size = Pt(8)
        run.italic = True
        run.font.color.rgb = GREY_MID



def _hex_to_rgb(h):
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def chart_risk_matrix(risks, *, residual=False, title=""):
    """5x5 matrix heatmap. Cells coloured by risk level; threat IDs listed in cell."""
    plt, Rectangle = _mpl()
    fig, ax = plt.subplots(figsize=(6.5, 4.8), dpi=150)
    for i in range(5):
        for j in range(5):
            level = RM[i][j]
            ax.add_patch(Rectangle(
                (j, 4 - i), 1, 1,
                facecolor=_hex_to_rgb(LEVEL_HEX[level]),
                edgecolor="white", linewidth=2,
            ))
    for idx, r in enumerate(risks):
        lik = r.get("resL") if residual else r.get("lik")
        imp = r.get("resI") if residual else r.get("imp")
        if not lik or not imp:
            continue
        lik_i = int(round(lik)); imp_i = int(round(imp))
        if not (1 <= lik_i <= 5 and 1 <= imp_i <= 5):
            continue
        ax.text(imp_i - 0.5, lik_i - 0.5, f"R{idx + 1}",
                ha="center", va="center", fontsize=8, fontweight="bold",
                color="white" if RM[5 - lik_i][imp_i - 1] in ("Very Low", "Low", "High", "Very High") else "black")
    ax.set_xlim(0, 5); ax.set_ylim(0, 5)
    ax.set_xticks([i + 0.5 for i in range(5)])
    ax.set_yticks([i + 0.5 for i in range(5)])
    ax.set_xticklabels([f"{i}\n{IL[i]}" for i in range(1, 6)], fontsize=7)
    ax.set_yticklabels([f"{i}\n{LL[i]}" for i in range(1, 6)], fontsize=7)
    ax.set_xlabel("Impact", fontsize=9, fontweight="bold")
    ax.set_ylabel("Likelihood", fontsize=9, fontweight="bold")
    if title:
        ax.set_title(title, fontsize=11, fontweight="bold", color="#1B2A4A", pad=10)
    ax.tick_params(left=False, bottom=False)
    for spine in ax.spines.values():
        spine.set_visible(False)
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def chart_profile(risks, *, residual=False, title=""):
    """Bar chart of counts per level."""
    plt, _ = _mpl()
    order = ["Very Low", "Low", "Medium", "High", "Very High"]
    key = "resRat" if residual else "rat"
    counts = [sum(1 for r in risks if r.get(key) == lv) for lv in order]
    fig, ax = plt.subplots(figsize=(6.5, 3.0), dpi=150)
    bars = ax.bar(order, counts,
                  color=[_hex_to_rgb(LEVEL_HEX[lv]) for lv in order],
                  edgecolor="white", linewidth=1.2)
    for bar, c in zip(bars, counts):
        if c:
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.1,
                    str(c), ha="center", va="bottom", fontsize=10, fontweight="bold")
    ax.set_ylabel("Number of risks", fontsize=9)
    ax.set_ylim(0, max(counts + [1]) * 1.25)
    ax.tick_params(axis="x", labelsize=9)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    if title:
        ax.set_title(title, fontsize=11, fontweight="bold", color="#1B2A4A", pad=8)
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def chart_pre_post(risks):
    """Grouped bar: pre vs post residual counts side-by-side."""
    plt, _ = _mpl()
    order = ["Very Low", "Low", "Medium", "High", "Very High"]
    pre = [sum(1 for r in risks if r.get("rat") == lv) for lv in order]
    post = [sum(1 for r in risks if r.get("resRat") == lv) for lv in order]
    x = list(range(len(order)))
    w = 0.38
    fig, ax = plt.subplots(figsize=(6.5, 3.2), dpi=150)
    b1 = ax.bar([i - w / 2 for i in x], pre, w, label="Pre-treatment",
                color=[_hex_to_rgb(LEVEL_HEX[lv]) for lv in order],
                edgecolor="#333", linewidth=0.8)
    b2 = ax.bar([i + w / 2 for i in x], post, w, label="Residual",
                color=[_hex_to_rgb(LEVEL_HEX[lv]) for lv in order],
                edgecolor="#333", linewidth=0.8, hatch="///", alpha=0.75)
    for bars in (b1, b2):
        for bar in bars:
            h = bar.get_height()
            if h:
                ax.text(bar.get_x() + bar.get_width() / 2, h + 0.1, str(int(h)),
                        ha="center", va="bottom", fontsize=8, fontweight="bold")
    ax.set_xticks(x); ax.set_xticklabels(order, fontsize=9)
    ax.set_ylabel("Number of risks", fontsize=9)
    ax.set_ylim(0, max(pre + post + [1]) * 1.3)
    ax.legend(loc="upper right", fontsize=9, frameon=False)
    ax.set_title("Pre-Treatment vs Residual Risk Profile",
                 fontsize=11, fontweight="bold", color="#1B2A4A", pad=8)
    for spine in ("top", "right"):
        ax.spines[spine].set_visible(False)
    buf = io.BytesIO()
    plt.tight_layout()
    plt.savefig(buf, format="png", dpi=150, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


# --- Page sections ---

def _build_cover(doc, ctx, risks):
    section = doc.sections[0]
    section.top_margin = Cm(2.5)
    section.bottom_margin = Cm(2.0)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)

    # Spacer
    for _ in range(3):
        doc.add_paragraph()

    # Eyebrow
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run("SECURITY RISK & THREAT ASSESSMENT")
    run.font.name = "Calibri"; run.font.size = Pt(10); run.font.bold = True
    run.font.color.rgb = GREY_MID
    _set_para_spacing(p, after=120)

    # Project title
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(ctx.get("project") or "Assessment")
    run.font.name = "Calibri"; run.font.size = Pt(28); run.font.bold = True
    run.font.color.rgb = NAVY
    _set_para_spacing(p, after=80)

    # Address
    addr = " ".join([x for x in (ctx.get("address"), ctx.get("postcode")) if x])
    if addr:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(addr)
        run.font.name = "Calibri"; run.font.size = Pt(12); run.font.color.rgb = GREY_DARK
        _set_para_spacing(p, after=200)

    # Details table
    dbts = [r for r in risks if r.get("dbt")]
    scored = [r for r in risks if r.get("sc") is not None]

    tbl = doc.add_table(rows=2, cols=2)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    _borders(tbl, color="D6DCE4")
    tbl.columns[0].width = Cm(8); tbl.columns[1].width = Cm(8)

    left_lines = [
        ("Project No", ctx.get("projectNum") or "—"),
        ("Reference", ctx.get("ref") or "—"),
        ("Date", ctx.get("date") or "—"),
        ("Stage", ctx.get("stage") or "—"),
        ("Development", ctx.get("devType") or "—"),
    ]
    right_lines = [
        ("Assessor", ctx.get("assessor") or "—"),
        ("Client", ctx.get("client") or "—"),
        ("Threats Assessed", str(len(scored))),
        ("Design Basis Threats", str(len(dbts))),
    ]
    _set_cell_text(tbl.rows[0].cells[0], "Project Details", bold=True, size=10,
                   color=NAVY, fill="F1F5F9")
    _set_cell_text(tbl.rows[0].cells[1], "Assessment Details", bold=True, size=10,
                   color=NAVY, fill="F1F5F9")
    _set_cell_text(tbl.rows[1].cells[0], "", fill="FAFBFC")
    _set_cell_text(tbl.rows[1].cells[1], "", fill="FAFBFC")

    def _fill_block(cell, lines):
        cell.text = ""
        for label, val in lines:
            p = cell.add_paragraph()
            r = p.add_run(f"{label}: "); r.font.bold = True; r.font.size = Pt(9); r.font.color.rgb = NAVY
            r2 = p.add_run(str(val)); r2.font.size = Pt(9); r2.font.color.rgb = GREY_DARK
            _set_para_spacing(p, after=40)

    _fill_block(tbl.rows[1].cells[0], left_lines)
    _fill_block(tbl.rows[1].cells[1], right_lines)

    # Footer line
    for _ in range(4):
        doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"Generated {datetime.utcnow().strftime('%d %B %Y')}  |  v{ctx.get('_v') or ''}")
    run.font.name = "Calibri"; run.font.size = Pt(8); run.font.color.rgb = GREY_MID

    _page_break(doc)


def _style_headings(doc):
    """Customise native Heading 1/2/3 styles to brand. TOC field uses these."""
    for lvl, size, bold in ((1, 18, True), (2, 13, True), (3, 11, True)):
        style = doc.styles[f"Heading {lvl}"]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.bold = bold
        style.font.color.rgb = NAVY


def _h(doc, text, level=1):
    """Add a heading using native Heading N style so TOC field picks it up."""
    p = doc.add_heading(level=level)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.bold = True
    run.font.color.rgb = NAVY
    if level == 1:
        run.font.size = Pt(18)
        _set_para_border(p, bottom=("12", "1B2A4A"))
        _set_para_spacing(p, before=240, after=160)
    elif level == 2:
        run.font.size = Pt(13)
        _set_para_spacing(p, before=180, after=100)
    else:
        run.font.size = Pt(11)
        _set_para_spacing(p, before=120, after=60)
    return p


def _add_toc_field(doc):
    """Insert a Word TOC field; user updates with right-click → Update Field."""
    p = doc.add_paragraph()
    run = p.add_run()
    begin = OxmlElement("w:fldChar"); begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText"); instr.set(qn("xml:space"), "preserve")
    instr.text = 'TOC \\o "1-3" \\h \\z \\u'
    sep = OxmlElement("w:fldChar"); sep.set(qn("w:fldCharType"), "separate")
    placeholder = OxmlElement("w:t")
    placeholder.text = "Right-click and choose ‘Update Field’ to populate the Table of Contents."
    end = OxmlElement("w:fldChar"); end.set(qn("w:fldCharType"), "end")
    for el in (begin, instr, sep, placeholder, end):
        run._r.append(el)


def _build_toc(doc):
    _h(doc, "Contents", 1)
    _add_toc_field(doc)
    _page_break(doc)


# --- Section 6.1 ---

def _build_61_methodology(doc):
    _h(doc, "6.1  Assessment Methodology", 2)
    _add_para(doc,
              "This Security Risk Assessment (SRA) is conducted using a structured, "
              "evidence-based methodology developed in alignment with internationally "
              "recognised risk management standards. It follows a logical sequence: "
              "establishing context and stakeholder consultation; asset identification "
              "and criticality ranking; threat identification (terrorism and crime); "
              "Points of Interest mapping; threat analysis based on capability and "
              "intent; target attractiveness and vulnerability assessment; likelihood "
              "and impact scoring; risk rating via the 5×5 matrix; control evaluation; "
              "risk treatment; and residual risk assessment.",
              align="justify", space_after=100)

    _h(doc, "Standards Alignment", 3)
    _add_para(doc,
              "ISO 31000:2018 — Risk Management Guidelines: scope, context and criteria "
              "(Cl. 6.3); risk identification, analysis and evaluation (Cl. 6.4); risk "
              "treatment via the TAAR framework (Cl. 6.5); communication and consultation "
              "(Cl. 6.2); monitoring and review (Cl. 6.6).",
              align="justify", space_after=60)
    _add_para(doc,
              "AS/NZS HB 167:2006 — Security Risk Management: critical asset ranking; "
              "capability/intent threat assessment with DBT filtering; six-axis target "
              "attractiveness; vulnerability and consequence analysis; control "
              "evaluation; residual risk post-treatment.",
              align="justify", space_after=60)
    _add_para(doc,
              "ISO/IEC 31010:2019 — Risk Assessment Techniques: primary technique is the "
              "semi-quantitative consequence/likelihood matrix (B.29), supplemented by "
              "structured scenario analysis (B.2) and expert judgement (B.1).",
              align="justify", space_after=100)

    _h(doc, "Calculation Methodology", 3)
    _add_para(doc, "Threat Score = round((Capability + Intent) / 2). DBT identified at Score ≥ 3.", space_after=40)
    _add_para(doc, "Target Attractiveness = average of: Visibility, Status, Threat Access, Collateral Exposure, Crime Profile, Historical Precedence.", space_after=40)
    _add_para(doc, "Likelihood = round((Threat Score + Target Attractiveness + Vulnerability) / 3).", space_after=40)
    _add_para(doc, "Impact = average of: Disruption, Fatalities, Reputational Damage, Financial Loss, Property Damage. Life-Safety Override: Fatalities ≥ 4 floors overall Impact at 4.", space_after=40)
    _add_para(doc, "Risk Rating = 5×5 Likelihood × Impact matrix lookup. Control Gap: Adequate (≥4), Partial (≥3), Insufficient (<3).", space_after=100)


# --- Section 6.2 ---

def _build_62_asset_identification(doc, state):
    _h(doc, "6.2  Asset Identification", 2)
    assets = [a for a in (state.get("assets") or []) if a.get("cat")]
    _add_para(doc,
              f"{len(assets)} assets have been identified as in scope for this "
              "assessment. Assets are grouped by category to facilitate threat "
              "linking and criticality scoring.",
              align="justify", space_after=100)
    if not assets:
        _add_para(doc, "No assets recorded.", italic=True, color=GREY_MID)
        return
    headers = ["#", "Category", "Description"]
    tbl = doc.add_table(rows=1 + len(assets), cols=3)
    _borders(tbl)
    for col, w in zip(tbl.columns, (Cm(1.0), Cm(4.5), Cm(11.0))):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=9,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, a in enumerate(assets, 1):
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"A{idx}", size=9, align="center")
        _set_cell_text(row[1], a.get("cat") or "", size=9, bold=True, color=NAVY)
        _set_cell_text(row[2], a.get("desc") or "", size=9)
    doc.add_paragraph()


# --- Section 6.3 ---

def _criticality_rank(score):
    if score is None:
        return ""
    if score >= 4.5: return "Critical"
    if score >= 3.5: return "High"
    if score >= 2.5: return "Medium"
    if score >= 1.5: return "Low"
    return "Negligible"


_RANK_FILL = {
    "Critical": ("C00000", RGBColor(0xFF, 0xFF, 0xFF)),
    "High":     ("ED7D31", RGBColor(0xFF, 0xFF, 0xFF)),
    "Medium":   ("FFC000", RGBColor(0x1A, 0x1A, 0x1A)),
    "Low":      ("70AD47", RGBColor(0xFF, 0xFF, 0xFF)),
    "Negligible":("4472C4", RGBColor(0xFF, 0xFF, 0xFF)),
}


def _build_63_asset_criticality(doc, state):
    _h(doc, "6.3  Asset Criticality", 2)
    assets = [a for a in (state.get("assets") or []) if a.get("cat")]
    _add_para(doc,
              "Each asset is scored across four criticality criteria (Operational "
              "Impact, Dependencies, People, Environment), averaged to produce an "
              "overall criticality ranking.",
              align="justify", space_after=100)
    if not assets:
        _add_para(doc, "No assets to score.", italic=True, color=GREY_MID); return
    headers = ["#", "Asset", "Op", "Dep", "People", "Env", "Score", "Ranking"]
    tbl = doc.add_table(rows=1 + len(assets), cols=len(headers))
    _borders(tbl)
    for col, w in zip(tbl.columns, (Cm(1.0), Cm(5.5), Cm(1.3), Cm(1.3), Cm(1.3), Cm(1.3), Cm(1.3), Cm(2.5))):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, a in enumerate(assets, 1):
        sc_dict = a.get("sc") or {}
        vals = [sc_dict.get(c) for c in AC]
        score = _avg(vals)
        rank = _criticality_rank(score)
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"A{idx}", size=8, align="center")
        _set_cell_text(row[1], a.get("cat") or "", size=8, bold=True, color=NAVY)
        for col_i, c in enumerate(AC):
            v = sc_dict.get(c)
            if v:
                _set_cell_text(row[2 + col_i], v, size=8, align="center", bold=True,
                               color=LEVEL_FG[SCORE_LEVEL.get(v, "Low")],
                               fill=LEVEL_HEX[SCORE_LEVEL.get(v, "Low")])
            else:
                _set_cell_text(row[2 + col_i], "", size=8, align="center")
        _set_cell_text(row[6], score if score is not None else "", size=8, align="center", bold=True)
        if rank:
            fill, fg = _RANK_FILL[rank]
            _set_cell_text(row[7], rank, size=8, align="center", bold=True, color=fg, fill=fill)
        else:
            _set_cell_text(row[7], "", size=8, align="center")
    doc.add_paragraph()


# --- Section 6.4 ---

def _build_64_threats(doc, state, risks):
    _h(doc, "6.4  Threats", 2)
    _add_para(doc,
              "Threats are assessed across two categories — Terrorism and Crime — "
              "using a capability × intent model. The output is a combined Threat "
              "Score on a 1–5 scale, with scores of 3 or more flagged as Design "
              "Basis Threats (DBT).",
              align="justify", space_after=100)

    # 6.4.1 — Common Threat Actors in the UK
    _h(doc, "6.4.1  Common Threat Actors in the UK", 3)
    _add_para(doc,
              "The UK threat landscape spans terrorism and serious organised crime. "
              "Terrorism actors include ideologically motivated groups and lone "
              "actors targeting crowded places, infrastructure and high-profile "
              "venues; current methods of attack include vehicle-borne improvised "
              "explosive devices (VBIED), person-borne IEDs (PBIED), marauding "
              "terrorist firearms attacks (MTFA), vehicle as a weapon (VAAW), and "
              "knife-enabled assaults.",
              align="justify", space_after=80)
    _add_para(doc,
              "Crime actors range from opportunistic offenders to organised crime "
              "groups. Relevant criminal threats include break-in and theft, "
              "robbery, fraud, cybercrime, vandalism, anti-social behaviour, "
              "trespass and protest activity. Threat profiles are tailored to the "
              "specific development type and surrounding context.",
              align="justify", space_after=120)

    # 6.4.2 — Threat Register
    _h(doc, "6.4.2  Threat Register", 3)
    filtered = [r for r in risks if r.get("n")]
    if not filtered:
        _add_para(doc, "No threats recorded.", italic=True, color=GREY_MID)
    else:
        headers = ["#", "Type", "Threat", "Description", "Cap", "Int", "Score", "Level", "DBT"]
        tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
        _borders(tbl)
        widths = (Cm(1.0), Cm(1.7), Cm(3.6), Cm(5.0), Cm(0.9), Cm(0.9), Cm(1.0), Cm(1.6), Cm(1.0))
        for col, w in zip(tbl.columns, widths):
            col.width = w
        for i, hdr in enumerate(headers):
            _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                           color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
        for idx, r in enumerate(filtered, 1):
            row = tbl.rows[idx].cells
            _set_cell_text(row[0], f"T{idx}", size=8, align="center")
            _set_cell_text(row[1], r.get("cat") or "", size=8, align="center")
            _set_cell_text(row[2], r.get("n") or "", size=8, bold=True, color=NAVY)
            _set_cell_text(row[3], r.get("d") or "", size=7)
            _set_cell_text(row[4], r.get("cap") or "", size=8, align="center")
            _set_cell_text(row[5], r.get("int") or "", size=8, align="center")
            _set_cell_text(row[6], r.get("sc") or "", size=8, align="center", bold=True)
            lv = r.get("lv") or ""
            if lv:
                _set_cell_text(row[7], lv, size=8, align="center", bold=True,
                               color=LEVEL_FG[lv], fill=LEVEL_HEX[lv])
            else:
                _set_cell_text(row[7], "", size=8, align="center")
            dbt = "YES" if r.get("dbt") else ("No" if r.get("sc") is not None else "")
            _set_cell_text(row[8], dbt, size=8, align="center", bold=r.get("dbt"),
                           color=RGBColor(0xDC, 0x26, 0x26) if r.get("dbt") else None,
                           fill="FFC7CE" if r.get("dbt") else None)
        doc.add_paragraph()

    # 6.4.3 — Threat-Asset Mapping
    _h(doc, "6.4.3  Threat-Asset Mapping", 3)
    assets = [a for a in (state.get("assets") or []) if a.get("cat")]
    if not assets or not filtered:
        _add_para(doc, "Threat-asset mapping unavailable.", italic=True, color=GREY_MID)
    else:
        asset_index = {a.get("id"): i + 1 for i, a in enumerate(assets)}
        headers = ["T#", "Threat", "Applicable Assets"]
        tbl = doc.add_table(rows=1 + len(filtered), cols=3)
        _borders(tbl)
        for col, w in zip(tbl.columns, (Cm(1.0), Cm(5.0), Cm(10.5))):
            col.width = w
        for i, hdr in enumerate(headers):
            _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                           color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
        for idx, r in enumerate(filtered, 1):
            tgt_ids = r.get("targets") or []
            labels = []
            for tid in tgt_ids:
                aix = asset_index.get(tid)
                a = next((a for a in assets if a.get("id") == tid), None)
                if aix and a:
                    labels.append(f"A{aix} {a.get('cat')}")
            row = tbl.rows[idx].cells
            _set_cell_text(row[0], f"T{idx}", size=8, align="center")
            _set_cell_text(row[1], r.get("n") or "", size=8, bold=True, color=NAVY)
            _set_cell_text(row[2], ", ".join(labels) if labels else "—", size=7)
        doc.add_paragraph()


# --- Section 6.5 ---

def _build_65_avl(doc, risks, state):
    _h(doc, "6.5  Attractiveness, Vulnerability & Likelihood", 2)
    _add_para(doc,
              "Target Attractiveness aggregates six axes: Visibility, Status, "
              "Threat Access, Collateral Exposure, Crime Profile and Historical "
              "Precedence. Combined with the threat capability/intent score and "
              "asset vulnerability, this produces the Likelihood score used in "
              "the risk matrix.",
              align="justify", space_after=100)
    vs = state.get("vs", {}) or {}
    filtered = [r for r in risks if r.get("n")]
    if not filtered:
        _add_para(doc, "No data.", italic=True, color=GREY_MID); return
    headers = ["#", "Threat", "Vis", "Sta", "Acc", "Col", "Cri", "Hist", "TA", "Vuln", "Likelihood"]
    tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
    _borders(tbl)
    widths = (Cm(1.0), Cm(4.0), Cm(1.0), Cm(1.0), Cm(1.0), Cm(1.0), Cm(1.0), Cm(1.1), Cm(1.0), Cm(1.0), Cm(2.0))
    for col, w in zip(tbl.columns, widths):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, r in enumerate(filtered, 1):
        v = vs.get(str(r.get("id")), {}) or {}
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"T{idx}", size=8, align="center")
        _set_cell_text(row[1], r.get("n") or "", size=8, bold=True, color=NAVY)
        for col_i, key in enumerate(TAC):
            val = v.get(key)
            if val:
                _set_cell_text(row[2 + col_i], val, size=8, align="center", bold=True,
                               color=LEVEL_FG[SCORE_LEVEL.get(val, "Low")],
                               fill=LEVEL_HEX[SCORE_LEVEL.get(val, "Low")])
            else:
                _set_cell_text(row[2 + col_i], "", size=8, align="center")
        _set_cell_text(row[8], r.get("ta") if r.get("ta") is not None else "", size=8, align="center", bold=True)
        _set_cell_text(row[9], r.get("vu") if r.get("vu") is not None else "", size=8, align="center", bold=True)
        lik = r.get("lik")
        if lik:
            lvl = SCORE_LEVEL.get(int(round(lik)), "")
            _set_cell_text(row[10], f"{lik} {lvl}".strip(), size=8, align="center", bold=True,
                           color=LEVEL_FG.get(lvl, GREY_DARK),
                           fill=LEVEL_HEX.get(lvl, "FFFFFF"))
        else:
            _set_cell_text(row[10], "", size=8, align="center")
    doc.add_paragraph()


# --- Section 6.6 ---

def _build_66_poi(doc, state, risks):
    _h(doc, "6.6  Points of Interest", 2)
    pois = state.get("pois") or []
    _add_para(doc,
              f"{len(pois)} Points of Interest have been identified and mapped "
              "against applicable threats. POIs represent specific locations or "
              "features that materially shape the threat picture.",
              align="justify", space_after=100)
    if not pois:
        _add_para(doc, "No Points of Interest recorded.", italic=True, color=GREY_MID)
        return
    risk_by_id = {r.get("id"): r for r in risks}
    headers = ["#", "POI", "Location / Description", "Applicable Threats"]
    tbl = doc.add_table(rows=1 + len(pois), cols=4)
    _borders(tbl)
    for col, w in zip(tbl.columns, (Cm(1.2), Cm(3.8), Cm(5.5), Cm(6.0))):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=9,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, poi in enumerate(pois, 1):
        names = []
        for tid in (poi.get("threats") or []):
            t = risk_by_id.get(tid)
            if t and t.get("n"):
                names.append(t["n"])
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"POI-{idx}", size=8, align="center")
        _set_cell_text(row[1], poi.get("name") or "", size=8, bold=True, color=NAVY)
        _set_cell_text(row[2], poi.get("desc") or "", size=8)
        _set_cell_text(row[3], ", ".join(names) if names else "—", size=7)
    doc.add_paragraph()


# --- Section 6.7 ---

def _build_67_impact(doc, risks, state):
    _h(doc, "6.7  Impact Assessment", 2)
    _add_para(doc,
              "Impact is scored across five consequence axes: Disruption, "
              "Fatalities, Reputation, Financial, and Property. A Life-Safety "
              "Override applies where Fatalities scores 4 or higher, raising "
              "the overall Impact to at least 4 regardless of average.",
              align="justify", space_after=100)
    is_ = state.get("is_", {}) or {}
    filtered = [r for r in risks if r.get("n")]
    if not filtered:
        _add_para(doc, "No data.", italic=True, color=GREY_MID); return
    headers = ["#", "Threat", "Disr", "Fat", "Rep", "Fin", "Prop", "Avg", "Impact", "LS Override"]
    tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
    _borders(tbl)
    widths = (Cm(1.0), Cm(4.5), Cm(1.0), Cm(1.0), Cm(1.0), Cm(1.0), Cm(1.1), Cm(1.0), Cm(1.4), Cm(2.0))
    for col, w in zip(tbl.columns, widths):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, r in enumerate(filtered, 1):
        im = is_.get(str(r.get("id")), {}) or {}
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"T{idx}", size=8, align="center")
        _set_cell_text(row[1], r.get("n") or "", size=8, bold=True, color=NAVY)
        for col_i, key in enumerate(IC):
            val = im.get(key)
            if val:
                _set_cell_text(row[2 + col_i], val, size=8, align="center", bold=True,
                               color=LEVEL_FG[SCORE_LEVEL.get(val, "Low")],
                               fill=LEVEL_HEX[SCORE_LEVEL.get(val, "Low")])
            else:
                _set_cell_text(row[2 + col_i], "", size=8, align="center")
        _set_cell_text(row[7], r.get("rawImp") if r.get("rawImp") is not None else "", size=8, align="center")
        imp = r.get("imp")
        if imp:
            lvl = SCORE_LEVEL.get(int(round(imp)), "")
            _set_cell_text(row[8], f"{imp} {lvl}".strip(), size=8, align="center", bold=True,
                           color=LEVEL_FG.get(lvl, GREY_DARK),
                           fill=LEVEL_HEX.get(lvl, "FFFFFF"))
        else:
            _set_cell_text(row[8], "", size=8, align="center")
        ls = "YES" if r.get("lifeSafetyOverride") else ""
        _set_cell_text(row[9], ls, size=8, align="center", bold=True,
                       color=RGBColor(0xDC, 0x26, 0x26) if ls else None,
                       fill="FFC7CE" if ls else None)
    doc.add_paragraph()


# --- Section 6.8 ---

_GAP_FILL = {
    "Adequate":     ("E2EFDA", RGBColor(0x16, 0xA3, 0x4A)),
    "Partial":      ("FFF2CC", RGBColor(0xD9, 0x77, 0x06)),
    "Insufficient": ("FFC7CE", RGBColor(0xDC, 0x26, 0x26)),
}


def _build_68_controls(doc, state, risks):
    _h(doc, "6.8  Existing Controls", 2)
    _add_para(doc,
              "Existing controls are evaluated per threat for Effectiveness and "
              "Confidence. The combined score determines whether the control "
              "posture is Adequate, Partial or Insufficient.",
              align="justify", space_after=100)
    cd = state.get("cd", {}) or {}
    filtered = [r for r in risks if r.get("n")]
    if not filtered:
        _add_para(doc, "No data.", italic=True, color=GREY_MID); return
    headers = ["T#", "Threat", "Controls Description", "Eff", "Conf", "Score", "Gap"]
    tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
    _borders(tbl)
    widths = (Cm(1.0), Cm(3.5), Cm(7.0), Cm(1.0), Cm(1.0), Cm(1.2), Cm(2.0))
    for col, w in zip(tbl.columns, widths):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, r in enumerate(filtered, 1):
        c = cd.get(str(r.get("id")), {}) or {}
        eff = c.get("eff"); conf = c.get("conf")
        sc2 = round((eff + conf) / 2 * 10) / 10 if eff and conf else None
        gap = ""
        if sc2 is not None:
            gap = "Adequate" if sc2 >= 4 else "Partial" if sc2 >= 3 else "Insufficient" if sc2 >= 1 else ""
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"T{idx}", size=8, align="center")
        _set_cell_text(row[1], r.get("n") or "", size=8, bold=True, color=NAVY)
        _set_cell_text(row[2], c.get("desc") or "", size=7)
        _set_cell_text(row[3], eff or "", size=8, align="center")
        _set_cell_text(row[4], conf or "", size=8, align="center")
        _set_cell_text(row[5], sc2 if sc2 is not None else "", size=8, align="center", bold=True)
        if gap:
            fill, fg = _GAP_FILL[gap]
            _set_cell_text(row[6], gap, size=8, align="center", bold=True, color=fg, fill=fill)
        else:
            _set_cell_text(row[6], "", size=8, align="center")
    doc.add_paragraph()


# --- Section 6.9 ---

def _build_69_risk_register(doc, risks):
    _h(doc, "6.9  Risk Register (Pre Mitigation)", 2)
    _add_para(doc,
              "Pre-mitigation risk register combining threat score, target "
              "attractiveness, vulnerability, likelihood and impact, evaluated "
              "via the 5×5 risk matrix.",
              align="justify", space_after=100)
    filtered = [r for r in risks if r.get("n")]
    if not filtered:
        _add_para(doc, "No data.", italic=True, color=GREY_MID); return
    headers = ["R#", "Type", "Threat", "T", "TA", "V", "L", "I", "Rating", "Treatment"]
    tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
    _borders(tbl)
    widths = (Cm(1.0), Cm(1.7), Cm(4.6), Cm(0.9), Cm(0.9), Cm(0.9), Cm(0.9), Cm(0.9), Cm(2.0), Cm(2.2))
    for col, w in zip(tbl.columns, widths):
        col.width = w
    for i, hdr in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
    for idx, r in enumerate(filtered, 1):
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"R{idx}", size=8, align="center")
        _set_cell_text(row[1], r.get("cat") or "", size=8, align="center")
        _set_cell_text(row[2], r.get("n") or "", size=8, bold=True, color=NAVY)
        _set_cell_text(row[3], r.get("sc") or "", size=8, align="center")
        _set_cell_text(row[4], r.get("ta") if r.get("ta") is not None else "", size=8, align="center")
        _set_cell_text(row[5], r.get("vu") if r.get("vu") is not None else "", size=8, align="center")
        _set_cell_text(row[6], r.get("lik") or "", size=8, align="center")
        _set_cell_text(row[7], r.get("imp") if r.get("imp") is not None else "", size=8, align="center")
        rat = r.get("rat") or ""
        if rat:
            _set_cell_text(row[8], rat, size=8, align="center", bold=True,
                           color=LEVEL_FG[rat], fill=LEVEL_HEX[rat])
        else:
            _set_cell_text(row[8], "", size=8, align="center")
        _set_cell_text(row[9], r.get("treat") or "", size=8, align="center")
    doc.add_paragraph()
    _h(doc, "Pre-Mitigation Risk Matrix", 3)
    _try_picture(doc, lambda: chart_risk_matrix(risks, residual=False,
                                                title="Likelihood × Impact (Pre-Mitigation)"),
                 Cm(15))


# --- Section 6.10 ---

def _build_610_treatments(doc, risks, state):
    _h(doc, "6.10  Security Treatments", 2)
    _add_para(doc,
              "Treatment strategies follow the TAAR framework — Treat (Reduce), "
              "Avoid, Accept, Refer (Transfer). Planned measures are listed per "
              "headline risk (High or Very High), grouped by affected asset.",
              align="justify", space_after=100)

    treat_counts = {k: 0 for k in ("Reduce", "Transfer", "Avoid", "Accept")}
    for r in risks:
        if r.get("treat") in treat_counts:
            treat_counts[r["treat"]] += 1
    _add_para(doc,
              "Treatment strategy split: "
              + (", ".join(f"{v} {k}" for k, v in treat_counts.items() if v) or "none recorded"),
              space_after=120)

    treatment_measures = state.get("treatmentMeasures", {}) or {}
    assets = state.get("assets", []) or []
    assets_by_id = {str(a.get("id")): a for a in assets}
    headline = [r for r in risks if r.get("rat") in ("Very High", "High")]
    if headline:
        _h(doc, "Planned Treatment Measures", 3)
        for r in headline:
            tid = str(r.get("id"))
            m = treatment_measures.get(tid, {}) or {}
            any_measure = any(any(v for v in (arr or []) if v) for arr in m.values())
            if not any_measure:
                continue
            _add_para(doc, f"{r.get('n')}  —  {r.get('rat')} ({r.get('treat') or 'Reduce'})",
                      size=10, bold=True, color=NAVY, space_after=40)
            rows_data = []
            for target_id in (r.get("targets") or []):
                a = assets_by_id.get(str(target_id))
                arr = [v for v in (m.get(str(target_id)) or []) if v]
                if a and a.get("cat") and arr:
                    rows_data.append((a, arr))
            if not rows_data:
                continue
            tbl = doc.add_table(rows=1 + len(rows_data), cols=2)
            _borders(tbl)
            tbl.columns[0].width = Cm(5.5); tbl.columns[1].width = Cm(11)
            _set_cell_text(tbl.rows[0].cells[0], "Asset / Location", bold=True, size=9,
                           color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A")
            _set_cell_text(tbl.rows[0].cells[1], "Treatment Measures", bold=True, size=9,
                           color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A")
            for i, (a, arr) in enumerate(rows_data, 1):
                c0 = tbl.rows[i].cells[0]; c1 = tbl.rows[i].cells[1]
                c0.text = ""
                p = c0.paragraphs[0]
                rn = p.add_run(a.get("cat") or "")
                rn.font.bold = True; rn.font.size = Pt(9); rn.font.color.rgb = NAVY
                if a.get("desc"):
                    p2 = c0.add_paragraph(); r2 = p2.add_run(a.get("desc"))
                    r2.font.size = Pt(8); r2.font.color.rgb = GREY_DARK
                c1.text = ""
                for j, measure in enumerate(arr, 1):
                    p = c1.paragraphs[0] if j == 1 else c1.add_paragraph()
                    run = p.add_run(f"{j}. {measure}")
                    run.font.size = Pt(8); run.font.color.rgb = GREY_DARK
                    _set_para_spacing(p, after=30)
            doc.add_paragraph()
    else:
        _add_para(doc, "No High or Very High pre-mitigation risks recorded.",
                  italic=True, color=GREY_MID)

    # Residual risk table
    residual_rows = [r for r in risks if r.get("n") and (r.get("rat") or r.get("resRat"))]
    if residual_rows:
        _h(doc, "Residual Risk", 3)
        headers = ["R#", "Threat", "Pre L", "Pre I", "Pre-Rating",
                   "Treatment", "Post L", "Post I", "Residual", "Accept?"]
        tbl = doc.add_table(rows=1 + len(residual_rows), cols=len(headers))
        _borders(tbl)
        widths = (Cm(1.0), Cm(4.4), Cm(1.0), Cm(1.0), Cm(1.8), Cm(1.8), Cm(1.0), Cm(1.0), Cm(1.8), Cm(1.2))
        for col, w in zip(tbl.columns, widths):
            col.width = w
        for i, hdr in enumerate(headers):
            _set_cell_text(tbl.rows[0].cells[i], hdr, bold=True, size=8,
                           color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")
        for idx, r in enumerate(residual_rows, 1):
            row = tbl.rows[idx].cells
            _set_cell_text(row[0], f"R{idx}", size=8, align="center")
            _set_cell_text(row[1], r.get("n") or "", size=8, bold=True, color=NAVY)
            _set_cell_text(row[2], r.get("lik") or "", size=8, align="center")
            _set_cell_text(row[3], r.get("imp") if r.get("imp") is not None else "", size=8, align="center")
            rat = r.get("rat") or ""
            if rat:
                _set_cell_text(row[4], rat, size=8, align="center", bold=True,
                               color=LEVEL_FG[rat], fill=LEVEL_HEX[rat])
            else:
                _set_cell_text(row[4], "", size=8, align="center")
            _set_cell_text(row[5], r.get("treat") or "", size=8, align="center")
            _set_cell_text(row[6], r.get("resL") or "", size=8, align="center")
            _set_cell_text(row[7], r.get("resI") or "", size=8, align="center")
            res = r.get("resRat") or ""
            if res:
                _set_cell_text(row[8], res, size=8, align="center", bold=True,
                               color=LEVEL_FG[res], fill=LEVEL_HEX[res])
            else:
                _set_cell_text(row[8], "", size=8, align="center")
            _set_cell_text(row[9], r.get("acc") or "", size=8, align="center")
        doc.add_paragraph()
        _h(doc, "Post-Mitigation Risk Matrix", 3)
        _try_picture(doc, lambda: chart_risk_matrix(risks, residual=True,
                                                    title="Likelihood × Impact (Residual)"),
                     Cm(15))


# --- Top-level build ---

def build_docx(state):
    doc = Document()

    # Base style
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10)
    normal.font.color.rgb = GREY_DARK
    _style_headings(doc)

    risks = compute_risks(state)
    ctx = state.get("ctx", {}) or {}
    ctx["_v"] = state.get("_v") or ctx.get("_v") or ""

    _build_cover(doc, ctx, risks)
    _build_toc(doc)

    # Parent H1 — numbering picks up at 6 to integrate into a wider document
    _h(doc, "6  Security Risk Assessment", 1)

    _build_61_methodology(doc)
    _build_62_asset_identification(doc, state)
    _build_63_asset_criticality(doc, state)
    _build_64_threats(doc, state, risks)
    _build_65_avl(doc, risks, state)
    _build_66_poi(doc, state, risks)
    _build_67_impact(doc, risks, state)
    _build_68_controls(doc, state, risks)
    _build_69_risk_register(doc, risks)
    _build_610_treatments(doc, risks, state)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()


def _safe_filename(name):
    s = re.sub(r"[^A-Za-z0-9_-]+", "_", name or "Assessment")
    return s.strip("_") or "Assessment"


# --- Vercel handler ---

def _unauthorized(self):
    msg = json.dumps({"error": "unauthorized"}).encode("utf-8")
    self.send_response(401)
    self.send_header("Content-Type", "application/json")
    self.send_header("Content-Length", str(len(msg)))
    self.end_headers()
    self.wfile.write(msg)


class handler(BaseHTTPRequestHandler):
    def _authorized(self):
        expected = os.environ.get("APP_PASSWORD") or ""
        if not expected:
            # No password configured on the server — fail closed.
            return False
        provided = self.headers.get("x-api-key") or ""
        return provided == expected

    def do_POST(self):
        if not self._authorized():
            _unauthorized(self)
            return
        try:
            length = int(self.headers.get("content-length", 0))
            body = self.rfile.read(length) if length else b"{}"
            state = json.loads(body.decode("utf-8"))
            docx_bytes = build_docx(state)
            filename = _safe_filename((state.get("ctx") or {}).get("project")) + "_SRA.docx"
            self.send_response(200)
            self.send_header("Content-Type",
                             "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(docx_bytes)))
            self.end_headers()
            self.wfile.write(docx_bytes)
        except Exception as e:
            msg = json.dumps({"error": str(e)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg)

    def do_GET(self):
        msg = json.dumps({
            "ok": True,
            "endpoint": "/api/report",
            "method": "POST",
            "python": os.sys.version.split()[0],
        }).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(msg)))
        self.end_headers()
        self.wfile.write(msg)

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()
