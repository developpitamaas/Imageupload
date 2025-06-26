const express = require('express');
const path = require('path');
const router = express.Router();
const { upload, uploadFile, handleMulterErrors } = require('../controllers/uploadController');

// Upload endpoints
router.post('/', upload.single('file'), uploadFile, handleMulterErrors);
router.post('/:folderName', upload.single('file'), uploadFile, handleMulterErrors);

// Serve static files - NEW IMPLEMENTATION
router.use('/:folderName/:filename', (req, res) => {
  const folderName = req.params.folderName;
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../', folderName, filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  });
});

// Serve files from default uploads folder
router.use('/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  });
});

module.exports = router;