const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folderName = 'uploads';
    if (req.params.folderName) {
      folderName = req.params.folderName;
    }
    const uploadPath = path.join(__dirname, '../', folderName);
    
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

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo',
    'video/x-matroska', 'video/webm'
  ];
  
  cb(null, allowedTypes.includes(file.mimetype));
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { 
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 1
  }
});

const uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      error: 'No file uploaded or invalid file type' 
    });
  }

  const folderName = req.params.folderName || 'uploads';
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const downloadUrl = `${baseUrl}/api/upload/${folderName}/${req.file.filename}`;
  const isVideo = req.file.mimetype.startsWith('video/');
  
  res.status(201).json({
    success: true,
    message: 'File uploaded successfully',
    url: {
      download: downloadUrl,
      stream: isVideo 
        ? `${baseUrl}/api/upload/stream/${folderName}/${req.file.filename}`
        : null
    },
    file: {
      originalname: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      isVideo
    }
  });
};

const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ 
      success: false,
      error: err.code === 'LIMIT_FILE_SIZE' 
        ? 'File too large. Maximum size is 500MB'
        : 'File upload error: ' + err.message
    });
  } else if (err) {
    return res.status(500).json({ 
      success: false,
      error: err.message || 'File upload failed' 
    });
  }
  next();
};

const streamVideo = (req, res) => {
  const folderName = req.params.folderName || 'videos';
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, '../', folderName, filename);

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const videoSize = fs.statSync(videoPath).size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] 
      ? parseInt(parts[1], 10)
      : videoSize - 1;
    const chunkSize = end - start + 1;
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    });

    fs.createReadStream(videoPath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': videoSize,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(videoPath).pipe(res);
  }
};

module.exports = {
  upload,
  uploadFile,
  handleMulterErrors,
  streamVideo
};