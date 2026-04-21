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


def _build_exec_summary(doc, ctx, risks, pois):
    _add_heading(doc, "Executive Summary", 1)

    scored = [r for r in risks if r.get("sc") is not None]
    dbts = [r for r in risks if r.get("dbt")]
    terror = [r for r in risks if r.get("cat") == "Terrorism"]
    crime = [r for r in risks if r.get("cat") and r.get("cat") != "Terrorism"]
    headline = [r for r in risks if r.get("rat") in ("Very High", "High")]
    counts_pre = {lv: sum(1 for r in risks if r.get("rat") == lv)
                  for lv in ["Very Low", "Low", "Medium", "High", "Very High"]}
    counts_post = {lv: sum(1 for r in risks if r.get("resRat") == lv)
                   for lv in ["Very Low", "Low", "Medium", "High", "Very High"]}

    intro = (
        f"This Security Risk Assessment evaluates {len(scored)} threats "
        f"({len(terror)} terrorism, {len(crime)} crime) identified for "
        f"{ctx.get('project') or 'the project'}. "
        f"{len(dbts)} threats meet the Design Basis Threat (DBT) criterion "
        f"(score ≥ 3), and {len(headline)} carry a pre-treatment rating of High or Very High. "
        f"{len(pois)} Points of Interest have been mapped against applicable threats."
    )
    _add_para(doc, intro, size=10, align="justify", space_after=120)

    _add_heading(doc, "Risk Profile Overview", 2)
    _try_picture(doc, lambda: chart_profile(risks, residual=False,
                                            title="Pre-Treatment Risk Profile"), Cm(16))

    # Pre/post comparison narrative
    reduced = sum(1 for r in risks
                  if r.get("rat") and r.get("resRat") and
                  ["Very Low", "Low", "Medium", "High", "Very High"].index(r["resRat"]) <
                  ["Very Low", "Low", "Medium", "High", "Very High"].index(r["rat"]))
    _add_para(doc,
              f"Following the proposed treatment strategy, {reduced} of "
              f"{len([r for r in risks if r.get('resRat')])} assessed threats show a "
              f"reduction in risk rating. Residual risk distribution is shown below.",
              size=10, align="justify", space_after=120)
    _try_picture(doc, lambda: chart_pre_post(risks), Cm(16))

    _page_break(doc)


def _build_threats_table(doc, risks):
    _add_heading(doc, "Threat Register", 1)
    _add_para(doc,
              "Threats identified and assessed using the capability + intent methodology. "
              "Design Basis Threats (DBT) are those with a combined score of 3 or higher.",
              size=9, italic=True, color=GREY_MID, space_after=100)

    filtered = [r for r in risks if r.get("n")]
    if not filtered:
        _add_para(doc, "No threats recorded.", italic=True, color=GREY_MID)
        return

    headers = ["#", "Type", "Threat", "Cap", "Int", "Score", "Level", "DBT"]
    tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
    _borders(tbl)

    widths_cm = [1.0, 2.0, 6.0, 1.0, 1.0, 1.2, 1.8, 1.2]
    for col, w in zip(tbl.columns, widths_cm):
        col.width = Cm(w)

    for i, h in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], h, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A",
                       align="center")

    for idx, r in enumerate(filtered, 1):
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"T{idx}", size=8, align="center")
        _set_cell_text(row[1], r.get("cat") or "", size=8, align="center")
        _set_cell_text(row[2], r.get("n") or "", size=8, align="left")
        _set_cell_text(row[3], r.get("cap") or "", size=8, align="center")
        _set_cell_text(row[4], r.get("int") or "", size=8, align="center")
        _set_cell_text(row[5], r.get("sc") or "", size=8, align="center", bold=True)
        lv = r.get("lv") or ""
        if lv:
            _set_cell_text(row[6], lv, size=8, align="center", bold=True,
                           color=LEVEL_FG[lv], fill=LEVEL_HEX[lv])
        else:
            _set_cell_text(row[6], "", size=8, align="center")
        dbt = "YES" if r.get("dbt") else ("No" if r.get("sc") is not None else "")
        _set_cell_text(row[7], dbt, size=8, align="center", bold=r.get("dbt"),
                       color=RGBColor(0xDC, 0x26, 0x26) if r.get("dbt") else None,
                       fill="FFC7CE" if r.get("dbt") else None)

    doc.add_paragraph()
    _add_heading(doc, "Pre-Mitigation Risk Matrix", 2)
    _try_picture(doc, lambda: chart_risk_matrix(risks, residual=False,
                                                title="Likelihood × Impact (Pre-Mitigation)"),
                 Cm(15))
    _page_break(doc)


def _build_treatments(doc, risks, state):
    _add_heading(doc, "Risk Treatment", 1)
    _add_para(doc,
              "Treatment strategies follow the TAAR framework: Treat, Avoid, Accept, "
              "Refer. Planned measures for headline risks (High or Very High) are listed "
              "per affected asset.",
              size=9, italic=True, color=GREY_MID, space_after=120)

    treatment_measures = state.get("treatmentMeasures", {}) or {}
    assets = state.get("assets", []) or []
    assets_by_id = {str(a.get("id")): a for a in assets}

    treat_counts = {k: 0 for k in ("Reduce", "Transfer", "Avoid", "Accept")}
    for r in risks:
        t = r.get("treat")
        if t in treat_counts:
            treat_counts[t] += 1
    _add_para(doc,
              "Treatment strategy split: "
              + ", ".join(f"{v} {k}" for k, v in treat_counts.items() if v),
              size=10, space_after=120)

    headline = [r for r in risks if r.get("rat") in ("Very High", "High")]
    if not headline:
        _add_para(doc, "No headline (High / Very High) risks requiring a detailed treatment plan.",
                  italic=True, color=GREY_MID)
        _page_break(doc); return

    for r in headline:
        tid = str(r.get("id"))
        m = treatment_measures.get(tid, {}) or {}
        any_measure = any(any(v for v in (arr or []) if v) for arr in m.values())
        if not any_measure:
            continue

        _add_heading(doc, f"{r.get('n')}  —  {r.get('rat')} ({r.get('treat') or 'Reduce'})", 2)

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
            rn = p.add_run(a.get("cat") or ""); rn.font.bold = True; rn.font.size = Pt(9); rn.font.color.rgb = NAVY
            if a.get("desc"):
                p2 = c0.add_paragraph(); r2 = p2.add_run(a.get("desc")); r2.font.size = Pt(8); r2.font.color.rgb = GREY_DARK
            c1.text = ""
            for j, measure in enumerate(arr, 1):
                p = c1.paragraphs[0] if j == 1 else c1.add_paragraph()
                run = p.add_run(f"{j}. {measure}")
                run.font.size = Pt(8); run.font.color.rgb = GREY_DARK
                _set_para_spacing(p, after=30)
        doc.add_paragraph()

    _page_break(doc)


def _build_residual(doc, risks):
    _add_heading(doc, "Residual Risk", 1)
    _add_para(doc,
              "Risk rating following application of proposed treatment measures. The "
              "table compares pre-treatment and residual positions per threat.",
              size=9, italic=True, color=GREY_MID, space_after=120)

    filtered = [r for r in risks if r.get("n") and (r.get("rat") or r.get("resRat"))]
    if not filtered:
        _add_para(doc, "Residual risk scoring not yet captured.",
                  italic=True, color=GREY_MID)
        return

    headers = ["#", "Threat", "Pre L", "Pre I", "Pre-Rating",
               "Treatment", "Post L", "Post I", "Residual", "Accept?"]
    tbl = doc.add_table(rows=1 + len(filtered), cols=len(headers))
    _borders(tbl)
    widths = [1.0, 4.4, 1.0, 1.0, 1.8, 1.8, 1.0, 1.0, 1.8, 1.2]
    for col, w in zip(tbl.columns, widths):
        col.width = Cm(w)

    for i, h in enumerate(headers):
        _set_cell_text(tbl.rows[0].cells[i], h, bold=True, size=8,
                       color=RGBColor(0xFF, 0xFF, 0xFF), fill="1B2A4A", align="center")

    for idx, r in enumerate(filtered, 1):
        row = tbl.rows[idx].cells
        _set_cell_text(row[0], f"R{idx}", size=8, align="center")
        _set_cell_text(row[1], r.get("n") or "", size=8, align="left")
        _set_cell_text(row[2], r.get("lik") or "", size=8, align="center")
        _set_cell_text(row[3], r.get("imp") or "", size=8, align="center")
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
    _add_heading(doc, "Post-Mitigation Risk Matrix", 2)
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

    risks = compute_risks(state)
    ctx = state.get("ctx", {}) or {}
    ctx["_v"] = state.get("_v") or ctx.get("_v") or ""
    pois = state.get("pois", []) or []

    _build_cover(doc, ctx, risks)
    _build_exec_summary(doc, ctx, risks, pois)
    _build_threats_table(doc, risks)
    _build_treatments(doc, risks, state)
    _build_residual(doc, risks)

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.getvalue()


def _safe_filename(name):
    s = re.sub(r"[^A-Za-z0-9_-]+", "_", name or "Assessment")
    return s.strip("_") or "Assessment"


# --- Vercel handler ---

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
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
