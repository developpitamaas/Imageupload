const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderName = 'uploads'; // default folder
    if (req.params.folderName) {
      folderName = req.params.folderName;
    }
    const uploadPath = path.join(__dirname, '../', folderName);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 
    'image/png', 
    'image/gif', 
    'image/webp', 
    'video/mp4', 
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and videos are allowed.'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 200 * 1024 * 1024, // 100MB limit
    files: 1 // Limit to single file upload
  }
});

// Handle file upload
const uploadFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded or invalid file type' 
      });
    }

    const folderName = req.params.folderName || 'uploads';
const fileUrl = `${req.protocol}://${req.get('host')}/api/upload/${folderName}/${req.file.filename}`;

    res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      url: fileUrl,
      file: {
        originalname: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'File upload failed' 
    });
  }
};

// Multer error handler
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        success: false,
        error: 'File too large. Maximum size is 100MB' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        success: false,
        error: 'Too many files. Only single file uploads are allowed' 
      });
    }
    return res.status(400).json({ 
      success: false,
      error: err.message 
    });
  } else if (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message || 'Internal server error' 
    });
  }
  next();
};

module.exports = {
  upload,
  uploadFile,
  handleMulterErrors
};