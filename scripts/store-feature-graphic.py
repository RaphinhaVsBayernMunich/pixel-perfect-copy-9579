"""Render the specified QuestOS branding as a vector PDF, then opaque RGB PNG.

Requires ReportLab and pdftoppm (bundled in the Codex workspace runtime).
No screenshot or application UI is constructed by this branding renderer.
"""
from pathlib import Path
import argparse
import subprocess
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument("--pdftoppm", default="pdftoppm")
args = parser.parse_args()
out = root / "docs/store/questos-feature-graphic"
pdfmetrics.registerFont(TTFont("QuestOSDisplay", str(root / "public/fonts/space-grotesk-700.ttf")))
pdfmetrics.registerFont(TTFont("QuestOSBody", str(root / "public/fonts/inter-500.ttf")))
c = canvas.Canvas(str(out.with_suffix(".pdf")), pagesize=(1024, 500), invariant=True)
c.setTitle("QuestOS Google Play feature graphic")
c.setFillColor(HexColor("#161821"))
c.rect(0, 0, 1024, 500, fill=1, stroke=0)
# Exact existing geometric mark: gold diamond, vertices (112,256),(256,112),
# (400,256),(256,400) in the 512px icon. Its navy background matches this canvas.
scale = 176 / 512
p = c.beginPath()
for i, (x, y) in enumerate([(112, 256), (256, 112), (400, 256), (256, 400)]):
    point = (72 + x * scale, 500 - (120 + y * scale))
    (p.moveTo if i == 0 else p.lineTo)(*point)
p.close()
c.setFillColor(HexColor("#EAC66A"))
c.drawPath(p, fill=1, stroke=0)
c.setFillColor(HexColor("#FFFFFF"))
c.setFont("QuestOSDisplay", 72)
c.drawString(290, 500 - 202, "QuestOS")
c.setFillColor(HexColor("#DCDDE5"))
c.setFont("QuestOSBody", 32)
c.drawString(294, 500 - 273, "Turn goals into quests.")
c.showPage()
c.save()
subprocess.run([args.pdftoppm, "-singlefile", "-r", "72", "-png", str(out.with_suffix(".pdf")), str(out)], check=True)
print("Created 1024x500 vector feature graphic and opaque RGB PNG.")
