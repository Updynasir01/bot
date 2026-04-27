const pool = require('../models/db');
const fileService = require('../services/fileService');
const path = require('path');
const fs = require('fs');

// Upload and process a file for a business
const uploadFile = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { fileType } = req.body; // 'faq_pdf', 'price_excel', 'product_catalog'

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const biz = await pool.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
    if (biz.rows.length === 0) return res.status(404).json({ error: 'Business not found' });

    // Extract text from file
    let extractedText = '';
    const ext = path.extname(req.file.originalname).toLowerCase();

    if (ext === '.pdf') {
      extractedText = await fileService.extractPdfText(req.file.path);
    } else if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      extractedText = await fileService.extractExcelText(req.file.path);
    }

    // Save file record
    const fileResult = await pool.query(`
      INSERT INTO business_files (business_id, file_type, original_name, stored_name, file_path, extracted_text, processed)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [businessId, fileType || ext.replace('.',''), req.file.originalname, req.file.filename, req.file.path, extractedText]);

    // Update knowledge base by combining all extracted texts
    const allFiles = await pool.query(
      'SELECT extracted_text FROM business_files WHERE business_id = $1 AND extracted_text IS NOT NULL',
      [businessId]
    );
    const knowledgeBase = allFiles.rows.map(r => r.extracted_text).join('\n\n---\n\n');
    await pool.query('UPDATE businesses SET knowledge_base = $1, updated_at = NOW() WHERE id = $2', [knowledgeBase, businessId]);

    res.json({
      file: fileResult.rows[0],
      message: 'File uploaded and processed successfully',
      textLength: extractedText.length
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
};

// Get all files for a business
const getFiles = async (req, res) => {
  try {
    const { businessId } = req.params;
    const result = await pool.query(
      'SELECT id, file_type, original_name, processed, created_at, LENGTH(extracted_text) as text_chars FROM business_files WHERE business_id = $1 ORDER BY created_at DESC',
      [businessId]
    );
    res.json({ files: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete a file
const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM business_files WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });

    // Delete from disk
    try { fs.unlinkSync(result.rows[0].file_path); } catch(e) {}

    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { uploadFile, getFiles, deleteFile };
