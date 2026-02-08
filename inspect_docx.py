import docx

doc = docx.Document("4. EL report.docx")

print("--- Paragraphs ---")
for i, p in enumerate(doc.paragraphs):
    if p.text.strip():
        print(f"{i}: {p.text.strip()}")
