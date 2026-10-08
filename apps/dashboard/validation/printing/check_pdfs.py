"""Check actual browser exports, not a substitute PDF renderer.

Requires PyMuPDF in the validation Python environment only.
Usage: python check_pdfs.py /path/to/generated/fixtures /path/to/browser/pdfs
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

fixtures = Path(sys.argv[1])
exports = Path(sys.argv[2])
results = []
normalize = lambda value: re.sub(r"\s+", "", value).replace("\u2212", "-").upper()
for entry in json.loads((fixtures / "manifest.json").read_text()):
    source = exports / f"medcore-print-final-{entry['name']}.pdf"
    if not source.exists():
        raise AssertionError(f"Missing browser PDF: {source}")
    doc = pymupdf.open(source)
    combined = normalize("".join(page.get_text() for page in doc))
    expected = entry["expected"] + entry["cells"] + entry["headers"]
    missing = [text for text in expected if normalize(text) not in combined]
    assert not missing, f"{entry['name']}: Missing printed content {missing}"
    for page in doc:
        dimensions = sorted([page.rect.width, page.rect.height])
        assert abs(dimensions[0] - 595) < 2 and abs(dimensions[1] - 842) < 2, "Not A4"
        for word in page.get_text("words"):
            assert word[0] >= 30 and word[2] <= page.rect.width - 30, f"{entry['name']}: text outside page margins {word}"
        # Browser PDF drawing coordinates reveal borders that text extraction
        # cannot catch. Include filled rectangles and strokes near page edges.
        for drawing in page.get_drawings():
            rect = drawing["rect"]
            assert rect.x0 >= 30 and rect.x1 <= page.rect.width - 30, f"{entry['name']}: border outside page margins {rect}"
    if entry["name"].startswith("coverage_"):
        for page in doc:
            if re.search(r"ENC-|ROW-", page.get_text()):
                for heading in entry["headers"]:
                    assert normalize(heading) in normalize(page.get_text()), f"Missing repeated header: {heading}"
    if entry["name"] == "ledger_100_long_items":
        for page in doc:
            if "ITEM-" in page.get_text():
                assert "COVERAGESTATUS" in normalize(page.get_text()), "Missing repeated charge header"
    if entry["name"] in ("coverage_250_rows", "ledger_100_long_items"):
        pages = [normalize(page.get_text()) for page in doc]
        for marker in entry["expected"]:
            matching = [text for text in pages if normalize(marker) in text]
            assert len(matching) == 1, f"Missing or duplicate row marker: {marker}"
            row = next(row for row in entry["rows"] if normalize(marker) in normalize(row[0]))
            assert all(normalize(cell) in matching[0] for cell in row), f"Row split between pages: {marker}"
    sampled = sorted({0, len(doc) // 2, len(doc) - 1})
    for index in sampled:
        doc[index].get_pixmap(matrix=pymupdf.Matrix(1.3, 1.3)).save(fixtures / f"{entry['name']}-page-{index + 1}.png")
    result = {"document": entry["name"], "pages": len(doc), "orientation": "landscape" if doc[0].rect.width > doc[0].rect.height else "portrait", "content_checks": len(expected), "complete_rows_checked": len(entry["expected"]) if entry["name"] in ("coverage_250_rows", "ledger_100_long_items") else 0, "sampled_pages": [index + 1 for index in sampled]}
    results.append(result)
    print(f"PASS {result}")
(fixtures / "pdf-results.json").write_text(json.dumps(results, indent=2))
print(f"Verified {len(results)} actual browser PDFs: A4, text, borders, full table cells and repeated headers.")
