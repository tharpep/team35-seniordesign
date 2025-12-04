# Dataset Folder

This folder is for testing img2study with your own images.

## How to use:

1. **Upload your image** to this folder (e.g., `textbook_page.jpg`)

2. **Run the test script**:
   ```bash
   cd img2study
   python test_image.py dataset/your_image.jpg
   ```

3. **View results** in `dataset/output/` folder:
   - `markdown/` - Extracted text as Markdown
   - `json/` - Detailed OCR data with confidence scores
   - `tables/` - Any detected tables as CSV files
   - `run_report.json` - Processing summary

## Supported image formats:
- `.png`
- `.jpg`
- `.jpeg` 
- `.webp`

## Example usage:
```bash
# Test with a textbook page
python test_image.py dataset/textbook_page.jpg

# Test with a document
python test_image.py dataset/document.png
```

The script will show you:
- Text extraction results
- Confidence scores for each detected text
- Any tables found
- Processing time and quality metrics
