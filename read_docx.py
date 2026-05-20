import docx
import os
import glob

def extract_text():
    files = glob.glob("EstadisticasApi*.docx")
    if not files:
        print("DOCX not found")
        return
    
    docx_path = files[0]
    print(f"Reading: {docx_path}")
    doc = docx.Document(docx_path)
    for para in doc.paragraphs:
        print(para.text)

if __name__ == "__main__":
    extract_text()
