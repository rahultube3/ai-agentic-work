---
name: pdf-extractor
description: Extract text, tables, and metadata from PDF documents. Supports OCR for scanned PDFs and preserves layout structure.
tags: [pdf, extraction, ocr, documents]
---

# PDF Extractor

This skill extracts structured content from PDF files.

## Capabilities
- Plain text extraction with page boundaries preserved
- Table detection and conversion to CSV/JSON
- OCR fallback for image-based PDFs
- Metadata extraction (author, title, creation date)

## Usage
Provide a path to a PDF file. The skill returns structured JSON with sections, tables, and metadata.
