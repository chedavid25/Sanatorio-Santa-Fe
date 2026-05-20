import PyPDF2
import os

pdf_path = r"D:\Sistemas David\Sanatorio Santa Fe\EstadisticasApi_Documentacion_v1 (1).pdf"

def extract_text():
    if not os.path.exists(pdf_path):
        print("PDF not found")
        return
    
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages):
            print(f"--- Page {i+1} ---")
            print(page.extract_text())

if __name__ == "__main__":
    extract_text()
