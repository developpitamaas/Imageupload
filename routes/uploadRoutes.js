// const express = require('express');
// const path = require('path');
// const router = express.Router();
// const { upload, uploadFile, handleMulterErrors,streamVideo } = require('../controllers/uploadController');

// // Upload endpoints
// router.post('/', upload.single('file'), uploadFile, handleMulterErrors);
// router.post('/:folderName', upload.single('file'), uploadFile, handleMulterErrors);
// router.get('/stream/:folderName?/:video_id', streamVideo);


// // Serve static files - NEW IMPLEMENTATION
// router.use('/:folderName/:filename', (req, res) => {
//   const folderName = req.params.folderName;
//   const filename = req.params.filename;
//   const filePath = path.join(__dirname, '../', folderName, filename);
  
//   res.sendFile(filePath, (err) => {
//     if (err) {
//       res.status(404).json({
//         success: false,
//         error: 'File not found'
//       });
//     }
//   });
// });

// // Serve files from default uploads folder
// router.use('/:filename', (req, res) => {
//   const filename = req.params.filename;
//   const filePath = path.join(__dirname, '../uploads', filename);
  
//   res.sendFile(filePath, (err) => {
//     if (err) {
//       res.status(404).json({
//         success: false,
//         error: 'File not found'
//       });
//     }
//   });
// });

// module.exports = router;

const express = require('express');
const path = require('path');
const router = express.Router();
const { upload, uploadFile, handleMulterErrors, streamVideo } = require('../controllers/uploadController');

// Upload endpoints
router.post('/', upload.single('file'), uploadFile, handleMulterErrors);
router.post('/:folderName', upload.single('file'), uploadFile, handleMulterErrors);

// Video streaming endpoints (two separate routes)
router.get('/stream/:video_id', (req, res) => {
    // Set default folder if not provided
    req.params.folderName = 'videos';
    streamVideo(req, res);
});

router.get('/stream/:folderName/:video_id', streamVideo);

// Serve static files
const serveStaticFile = (req, res) => {
    try {
        const folderName = req.params.folderName || 'uploads';
        const filename = req.params.filename;
        const filePath = path.join(__dirname, '../', folderName, filename);

        // Security check
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(path.resolve(__dirname, '../'))) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.sendFile(filePath, (err) => {
            if (err) {
                console.error('File serve error:', err);
                res.status(404).json({
                    success: false,
                    error: 'File not found'
                });
            }
        });
    } catch (error) {
        console.error('Static file error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

router.get('/stream/:folderName/:filename', streamVideo);
router.get('/stream/:filename', (req, res) => {
    req.params.folderName = 'videos'; // Set default folder
    streamVideo(req, res);
});

module.exports = router;