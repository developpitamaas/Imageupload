
  // const AWS = require("aws-sdk");
  // const ffmpegPath = require("ffmpeg-static");
  // const ffmpeg = require("fluent-ffmpeg");
  // const sharp = require("sharp");
  // const { PassThrough } = require("stream");
  // const path = require("path");
  // const fs = require("fs");
  // const os = require("os");
  // const { promisify } = require('util');
  // const writeFileAsync = promisify(fs.writeFile);
  // const unlinkAsync = promisify(fs.unlink);
  // const fsExtra = require('fs-extra');

  // // Configure FFmpeg path
  // ffmpeg.setFfmpegPath(ffmpegPath);

  // // Initialize S3 client
  // const s3 = new AWS.S3({
  //   region: process.env.AWS_REGION,
  //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  // });

  // // Check if running on Windows
  // const isWindows = process.platform === 'win32';

  // /**
  //  * Uploads a stream to S3
  //  */
  // function uploadStreamToS3(bucket, key, contentType) {
  //   const pass = new PassThrough();
  //   const params = {
  //     Bucket: bucket,
  //     Key: key,
  //     Body: pass,
  //     ContentType: contentType,
  //   };
  //   const uploadPromise = s3.upload(params).promise();
  //   return { pass, uploadPromise };
  // }

  // /**
  //  * Helper function to delete files with retry logic
  //  */
  // async function deleteFileWithRetry(filePath, retries = 3, delay = 100) {
  //   try {
  //     if (isWindows) {
  //       try {
  //         // Try to close any open handles (Windows-specific)
  //         const fd = fs.openSync(filePath, 'r+');
  //         fs.closeSync(fd);
  //       } catch (e) {
  //         console.warn('Windows file handle closing attempt failed:', e.message);
  //       }
  //     }
  //     await unlinkAsync(filePath);
  //   } catch (err) {
  //     if (retries > 0) {
  //       await new Promise(resolve => setTimeout(resolve, delay));
  //       return deleteFileWithRetry(filePath, retries - 1, delay * 2);
  //     }
  //     console.warn(`⚠️ Could not delete temp file ${filePath}:`, err.message);
  //   }
  // }

  // /**
  //  * Generates a thumbnail from video and uploads to S3
  //  */
  // async function generateAndUploadThumbnail(videoPath, originalName, bucket) {
  //   const timestamp = Date.now();
  //   const baseName = path.basename(originalName, path.extname(originalName));
  //   const thumbnailKey = `thumbnails/thumbnail_${timestamp}_${baseName}.jpg`;
    
  //   // Use unique temp file name with process ID
  //   const tempThumbnailPath = path.join(os.tmpdir(), `thumbnail_${timestamp}_${process.pid}.jpg`);
    
  //   try {
  //     // Capture thumbnail at 3 seconds
  //     await new Promise((resolve, reject) => {
  //       ffmpeg(videoPath)
  //         .screenshots({
  //           timestamps: ['00:00:03.000'],
  //           filename: `thumbnail_${timestamp}_${process.pid}.jpg`,
  //           folder: os.tmpdir(),
  //           size: '640x360',
  //           fastSeek: true
  //         })
  //         .on('end', resolve)
  //         .on('error', reject);
  //     });

  //     // Optimize thumbnail with sharp
  //     const optimizedThumbnail = await sharp(tempThumbnailPath)
  //       .resize(640, 360, {
  //         fit: 'cover',
  //         withoutEnlargement: true
  //       })
  //       .jpeg({ 
  //         quality: 80,
  //         mozjpeg: true 
  //       })
  //       .toBuffer();

  //     // Upload thumbnail to S3
  //     const thumbnailData = await s3.upload({
  //       Bucket: bucket,
  //       Key: thumbnailKey,
  //       Body: optimizedThumbnail,
  //       ContentType: 'image/jpeg'
  //     }).promise();

  //     return thumbnailData.Location;
  //   } finally {
  //     await deleteFileWithRetry(tempThumbnailPath);
  //   }
  // }


  // async function validateAndCompressVideo(buffer, originalName, bucket) {
  //   const timestamp = Date.now();
  //   const fileExtension = path.extname(originalName).toLowerCase();
  //   const baseName = path.basename(originalName, fileExtension);
  //   const compressedKey = `compressed/compressed_${timestamp}_${baseName}.mp4`;

  //   const tempDir = os.tmpdir();
  //   const inputTempPath = path.join(tempDir, `input_${timestamp}_${process.pid}${fileExtension}`);
  //   const outputTempPath = path.join(tempDir, `output_${timestamp}_${process.pid}.mp4`);

  //   await fsExtra.ensureDir(tempDir);
  //   await writeFileAsync(inputTempPath, buffer);

  //   try {
  //     await new Promise((resolve, reject) => {
  //       ffmpeg(inputTempPath)
  //         .outputOptions([
  //           "-preset ultrafast",       
  //           "-movflags +faststart",
  //           "-b:v 1000k",
  //           "-maxrate 1000k",
  //           "-bufsize 2000k",
  //           "-vf scale=640:-2",
  //           "-c:a aac",
  //           "-b:a 128k"
  //         ])
  //         .on("start", cmd => console.log("FFmpeg:", cmd))
  //         .on("error", err => {
  //           console.error("FFmpeg error:", err.message);
  //           reject(err);
  //         })
  //         .on("end", resolve)
  //         .save(outputTempPath);
  //     });

  //     const uploadPromise = s3.upload({
  //       Bucket: bucket,
  //       Key: compressedKey,
  //       Body: fs.createReadStream(outputTempPath),
  //       ContentType: 'video/mp4'
  //     }).promise();

  //     const [compressedData, thumbnailUrl] = await Promise.all([
  //       uploadPromise,
  //       generateAndUploadThumbnail(outputTempPath, originalName, bucket)
  //     ]);

  //     return {
  //       compressedUrl: compressedData.Location,
  //       thumbnailUrl
  //     };
  //   } finally {
  //     await deleteFileWithRetry(inputTempPath);
  //     await deleteFileWithRetry(outputTempPath);
  //   }
  // }


  // /**
  //  * Compresses image file
  //  */
  // async function compressImage(buffer, originalName, bucket) {
  //   const timestamp = Date.now();
  //   const fileExtension = path.extname(originalName).toLowerCase();
  //   const baseName = path.basename(originalName, fileExtension);
  //   const compressedKey = `compressed/compressed_${timestamp}_${baseName}${fileExtension}`;
    
  //   try {
  //     // Compress image using Sharp
  //     const compressedBuffer = await sharp(buffer)
  //       .resize({
  //         width: 800,
  //         height: 800,
  //         fit: sharp.fit.inside,
  //         withoutEnlargement: true
  //       })
  //       .jpeg({ quality: 80, mozjpeg: true }) // For JPEG
  //       .png({ quality: 80 })   // For PNG
  //       .toBuffer();

  //     // Upload compressed image
  //     const compressedData = await s3.upload({
  //       Bucket: bucket,
  //       Key: compressedKey,
  //       Body: compressedBuffer,
  //       ContentType: `image/${fileExtension.replace('.', '') === 'jpg' ? 'jpeg' : fileExtension.replace('.', '')}`
  //     }).promise();

  //     return {
  //       compressedUrl: compressedData.Location,
  //       thumbnailUrl: compressedData.Location // For images, we can use the same as thumbnail
  //     };
  //   } catch (err) {
  //     console.error("❌ Image compression failed:", err);
  //     throw new Error(`Image compression failed: ${err.message}`);
  //   }
  // }

  // /**
  //  * Main upload handler
  //  */
  // exports.createPost = async (req, res) => {
  //   try {
  //     if (!req.file) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "No file uploaded.",
  //       });
  //     }

  //     const fileBuffer = req.file.buffer;
  //     const bucket = process.env.AWS_BUCKET;
  //     const timestamp = Date.now();
  //     const fileExtension = path.extname(req.file.originalname).toLowerCase();
  //     const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(fileExtension);
  //     const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension);

  //     if (!isVideo && !isImage) {
  //       return res.status(400).json({
  //         success: false,
  //         message: "Unsupported file type.",
  //       });
  //     }

  //     // Upload original file
  //     const originalKey = `original/${timestamp}_${req.file.originalname}`;
  //     const originalUpload = s3.upload({
  //       Bucket: bucket,
  //       Key: originalKey,
  //       Body: fileBuffer,
  //       ContentType: req.file.mimetype,
  //     }).promise();

  //     let compressedData = null;
  //     let compressionError = null;

  //     if (isVideo) {
  //       try {
  //         compressedData = await validateAndCompressVideo(
  //           fileBuffer,
  //           req.file.originalname,
  //           bucket
  //         );
  //       } catch (err) {
  //         console.error("❌ Video processing failed:", err);
  //         compressionError = err.message;
  //       }
  //     } else if (isImage) {
  //       try {
  //         compressedData = await compressImage(
  //           fileBuffer,
  //           req.file.originalname,
  //           bucket
  //         );
  //       } catch (err) {
  //         console.error("❌ Image processing failed:", err);
  //         compressionError = err.message;
  //       }
  //     }

  //     const originalData = await originalUpload;

  //     res.status(201).json({
  //       success: true,
  //       message: compressionError 
  //         ? "File uploaded but processing failed: " + compressionError 
  //         : "File uploaded successfully.",
  //       originalUrl: originalData.Location,
  //       compressedUrl: compressedData?.compressedUrl || originalData.Location,
  //       thumbnailUrl: compressedData?.thumbnailUrl || originalData.Location,
  //       fileType: isVideo ? 'video' : 'image',
  //       compressionSuccess: !!compressedData && compressedData.compressedUrl !== originalData.Location
  //     });
  //   } catch (err) {
  //     console.error("❌ Error uploading file:", err);
  //     if (!res.headersSent) {
  //       res.status(500).json({
  //         success: false,
  //         message: "Failed to upload file.",
  //         error: err.message,
  //       });
  //     }
  //   }
  // };

  
  const AWS = require("aws-sdk");
// const ffmpegPath = require("ffmpeg-static");
// const ffmpeg = require("fluent-ffmpeg");


const ffmpegPath = require("ffmpeg-static");
const ffprobePath = require("ffprobe-static").path;
const ffmpeg = require("fluent-ffmpeg");

const sharp = require("sharp");
const { PassThrough } = require("stream");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const fsExtra = require('fs-extra');

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// Initialize S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Check if running on Windows
const isWindows = process.platform === 'win32';


/**
 * Uploads a stream to S3
 */
function uploadStreamToS3(bucket, key, contentType) {
  const pass = new PassThrough();
  const params = {
    Bucket: bucket,
    Key: key,
    Body: pass,
    ContentType: contentType,
  };
  const uploadPromise = s3.upload(params).promise();
  return { pass, uploadPromise };
}

/**
 * Helper function to delete files with retry logic
 */
async function deleteFileWithRetry(filePath, retries = 3, delay = 100) {
  try {
    if (isWindows) {
      try {
        // Try to close any open handles (Windows-specific)
        const fd = fs.openSync(filePath, 'r+');
        fs.closeSync(fd);
      } catch (e) {
        console.warn('Windows file handle closing attempt failed:', e.message);
      }
    }
    await unlinkAsync(filePath);
  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return deleteFileWithRetry(filePath, retries - 1, delay * 2);
    }
    console.warn(`⚠️ Could not delete temp file ${filePath}:`, err.message);
  }
}

/**
 * Generates a thumbnail from video and uploads to S3
 */
async function generateAndUploadThumbnail(videoPath, originalName, bucket ,width ,height) {
  const timestamp = Date.now();
  const baseName = path.basename(originalName, path.extname(originalName));
  const thumbnailKey = `thumbnails/thumbnail_${timestamp}_${baseName}.jpg`;
  
  // Use unique temp file name with process ID
  const tempThumbnailPath = path.join(os.tmpdir(), `thumbnail_${timestamp}_${process.pid}.jpg`);
  
  try {
    // Use fixed dimensions that match the compressed video 
    const sizeOption = `${width}x${height}`;
    
    // Capture thumbnail at 3 seconds
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: ['00:00:03.000'],
          filename: `thumbnail_${timestamp}_${process.pid}.jpg`,
          folder: os.tmpdir(),
          size: sizeOption,
          fastSeek: true
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Optimize thumbnail with sharp (no resizing needed)
    const optimizedThumbnail = await sharp(tempThumbnailPath)
      .jpeg({ 
        quality: 80,
        mozjpeg: true 
      })
      .toBuffer();

    // Upload thumbnail to S3
    const thumbnailData = await s3.upload({
      Bucket: bucket,
      Key: thumbnailKey,
      Body: optimizedThumbnail,
      ContentType: 'image/jpeg'
    }).promise();

    return thumbnailData.Location;
  } catch (err) {
    console.error("❌ Thumbnail generation failed:", err);
    throw new Error(`Thumbnail generation failed: ${err.message}`);
  } finally {
    await deleteFileWithRetry(tempThumbnailPath);
  }
}

const getVideoDimensions = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const stream = metadata.streams.find(s => s.width && s.height);
      if (!stream) return reject(new Error("No video stream found."));
      resolve({ width: stream.width, height: stream.height });
    });
  });
};


async function validateAndCompressVideo(buffer, originalName, bucket) {
  const timestamp = Date.now();
  const fileExtension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, fileExtension);
  const compressedKey = `compressed/compressed_${timestamp}_${baseName}.mp4`;

  const tempDir = os.tmpdir();
  const inputTempPath = path.join(tempDir, `input_${timestamp}_${process.pid}${fileExtension}`);
  const outputTempPath = path.join(tempDir, `output_${timestamp}_${process.pid}.mp4`);

  await fsExtra.ensureDir(tempDir);
  await writeFileAsync(inputTempPath, buffer);

  try {
    await new Promise((resolve, reject) => {
      ffmpeg(inputTempPath)
        .outputOptions([
          "-preset ultrafast",       
          "-movflags +faststart",
          "-b:v 1000k",
          "-maxrate 1000k",
          "-bufsize 2000k",
          "-vf scale=640:-2",
          "-c:a aac",
          "-b:a 128k"
        ])
        .on("start", cmd => console.log("FFmpeg:", cmd))
        .on("error", err => {
          console.error("FFmpeg error:", err.message);
          reject(err);
        })
        .on("end", resolve)
        .save(outputTempPath);
    });

    // get video size
    const VideoSize  = await getVideoDimensions(outputTempPath);
    console.log("-0-------------",VideoSize)

    const uploadPromise = s3.upload({
      Bucket: bucket,
      Key: compressedKey,
      Body: fs.createReadStream(outputTempPath),
      ContentType: 'video/mp4'
    }).promise();

    const [compressedData, thumbnailUrl] = await Promise.all([
      uploadPromise,
      generateAndUploadThumbnail(outputTempPath, originalName, bucket , VideoSize.width, VideoSize.height)
    ]);

    return {
      compressedUrl: compressedData.Location,
      thumbnailUrl
    };
  } catch (err) {
    console.error("❌ Video compression failed:", err);
    throw new Error(`Video processing failed: ${err.message}`);
  } finally {
    await deleteFileWithRetry(inputTempPath);
    await deleteFileWithRetry(outputTempPath);
  }
}

/**
 * Compresses image file
 */
async function compressImage(buffer, originalName, bucket) {
  const timestamp = Date.now();
  const fileExtension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, fileExtension);
  const compressedKey = `compressed/compressed_${timestamp}_${baseName}${fileExtension}`;
  
  try {
    // Compress image using Sharp
    const compressedBuffer = await sharp(buffer)
      .resize({
        width: 800,
        height: 800,
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .jpeg({ quality: 80, mozjpeg: true }) // For JPEG
      .png({ quality: 80 })   // For PNG
      .toBuffer();

    // Upload compressed image
    const compressedData = await s3.upload({
      Bucket: bucket,
      Key: compressedKey,
      Body: compressedBuffer,
      ContentType: `image/${fileExtension.replace('.', '') === 'jpg' ? 'jpeg' : fileExtension.replace('.', '')}`
    }).promise();

    return {
      compressedUrl: compressedData.Location,
      thumbnailUrl: compressedData.Location // For images, we can use the same as thumbnail
    };
  } catch (err) {
    console.error("❌ Image compression failed:", err);
    throw new Error(`Image compression failed: ${err.message}`);
  }
}

/**
 * Main upload handler
 */
exports.createPost = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    const fileBuffer = req.file.buffer;
    const bucket = process.env.AWS_BUCKET;
    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(fileExtension);
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension);

    if (!isVideo && !isImage) {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type.",
      });
    }

    // Upload original file
    const originalKey = `original/${timestamp}_${req.file.originalname}`;
    const originalUpload = s3.upload({
      Bucket: bucket,
      Key: originalKey,
      Body: fileBuffer,
      ContentType: req.file.mimetype,
    }).promise();

    let compressedData = null;
    let compressionError = null;



    if (isVideo) {
      try {
        compressedData = await validateAndCompressVideo(
          fileBuffer,
          req.file.originalname,
          bucket
        );
      } catch (err) {
        console.error("❌ Video processing failed:", err);
        compressionError = err.message;
      }
    } else if (isImage) {
      try {
        compressedData = await compressImage(
          fileBuffer,
          req.file.originalname,
          bucket
        );
      } catch (err) {
        console.error("❌ Image processing failed:", err);
        compressionError = err.message;
      }
    }

    const originalData = await originalUpload;

    // Handle failed thumbnail generation
    let thumbnailUrl = originalData.Location;
    if (compressedData?.thumbnailUrl) {
      thumbnailUrl = compressedData.thumbnailUrl;
    } else if (isVideo && compressionError) {
      // For videos, if thumbnail failed, use a placeholder or original
      thumbnailUrl = originalData.Location;
    }

    res.status(201).json({
      success: true,
      message: compressionError 
        ? "File uploaded but processing failed: " + compressionError 
        : "File uploaded successfully.",
      originalUrl: originalData.Location,
      compressedUrl: compressedData?.compressedUrl || originalData.Location,
      thumbnailUrl: thumbnailUrl,
      fileType: isVideo ? 'video' : 'image',
      compressionSuccess: !!compressedData && compressedData.compressedUrl !== originalData.Location
    });
  } catch (err) {
    console.error("❌ Error uploading file:", err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to upload file.",
        error: err.message,
      });
    }
  }
};