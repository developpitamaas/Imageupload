// // const AWS = require("aws-sdk");
// // const ffmpegPath = require("ffmpeg-static");
// // const ffmpeg = require("fluent-ffmpeg");
// // const sharp = require("sharp");
// // const { Readable, PassThrough } = require("stream");
// // const path = require("path");
// // const fs = require("fs");
// // const os = require("os");
// // const { promisify } = require('util');
// // const writeFileAsync = promisify(fs.writeFile);
// // const unlinkAsync = promisify(fs.unlink);

// // // Configure FFmpeg path
// // ffmpeg.setFfmpegPath(ffmpegPath);

// // // Initialize S3 client
// // const s3 = new AWS.S3({
// //   region: process.env.AWS_REGION,
// //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
// //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// // });

// // /**
// //  * Uploads a stream to S3
// //  */
// // function uploadStreamToS3(bucket, key, contentType) {
// //   const pass = new PassThrough();
// //   const params = {
// //     Bucket: bucket,
// //     Key: key,
// //     Body: pass,
// //     ContentType: contentType,
// //   };
// //   const uploadPromise = s3.upload(params).promise();
// //   return { pass, uploadPromise };
// // }

// // /**
// //  * Validates and compresses video file
// //  */
// // async function validateAndCompressVideo(buffer, originalName, bucket) {
// //   const timestamp = Date.now();
// //   const fileExtension = path.extname(originalName).toLowerCase();
// //   const baseName = path.basename(originalName, fileExtension);
// //   const compressedKey = `compressed/compressed_${timestamp}_${baseName}.mp4`;
  
// //   // Use system temp directory (works cross-platform)
// //   const tempDir = os.tmpdir();
// //   const tempFilePath = path.join(tempDir, `temp_${timestamp}${fileExtension}`);
  
// //   // Ensure temp directory exists
// //   if (!fs.existsSync(tempDir)) {
// //     fs.mkdirSync(tempDir, { recursive: true });
// //   }

// //   // Write buffer to temp file
// //   await writeFileAsync(tempFilePath, buffer);

// //   try {
// //     const { pass, uploadPromise } = uploadStreamToS3(
// //       bucket,
// //       compressedKey,
// //       "video/mp4"
// //     );

// //     await new Promise((resolve, reject) => {
// //       ffmpeg(tempFilePath)
// //         .inputFormat(fileExtension.replace('.', ''))
// //         .outputOptions([
// //           "-vf scale=640:-2",          
// //           "-b:v 800k",                 
// //           "-c:a aac",                  
// //           "-b:a 96k",                  
// //           "-preset fast",              
// //           "-movflags frag_keyframe+empty_moov", 
// //         ])
// //         .format("mp4")
// //         .on("start", (command) => {
// //           console.log("FFmpeg command:", command);
// //         })
// //         .on("error", (err) => {
// //           console.error("❌ FFmpeg error:", err);
// //           reject(new Error(`Video compression failed: ${err.message}`));
// //         })
// //         .on("end", () => {
// //           console.log("✅ Compression finished");
// //           resolve();
// //         })
// //         .on("stderr", (stderr) => {
// //           console.log("FFmpeg stderr:", stderr);
// //         })
// //         .pipe(pass, { end: true });
// //     });

// //     const compressedData = await uploadPromise;
// //     return compressedData.Location;
// //   } finally {
// //     // Clean up temp file
// //     try {
// //       await unlinkAsync(tempFilePath);
// //     } catch (cleanupErr) {
// //       console.error("Failed to clean up temp file:", cleanupErr);
// //     }
// //   }
// // }

// // /**
// //  * Compresses image file
// //  */
// // async function compressImage(buffer, originalName, bucket) {
// //   const timestamp = Date.now();
// //   const fileExtension = path.extname(originalName).toLowerCase();
// //   const baseName = path.basename(originalName, fileExtension);
// //   const compressedKey = `compressed/compressed_${timestamp}_${baseName}${fileExtension}`;
  
// //   try {
// //     // Compress image using Sharp
// //     const compressedBuffer = await sharp(buffer)
// //       .resize({
// //         width: 800,
// //         height: 800,
// //         fit: sharp.fit.inside,
// //         withoutEnlargement: true
// //       })
// //       .jpeg({ quality: 80 }) // For JPEG
// //       .png({ quality: 80 })   // For PNG
// //       .toBuffer();

// //     // Upload compressed image
// //     const compressedData = await s3.upload({
// //       Bucket: bucket,
// //       Key: compressedKey,
// //       Body: compressedBuffer,
// //       ContentType: `image/${fileExtension.replace('.', '') === 'jpg' ? 'jpeg' : fileExtension.replace('.', '')}`
// //     }).promise();

// //     return compressedData.Location;
// //   } catch (err) {
// //     console.error("❌ Image compression failed:", err);
// //     throw new Error(`Image compression failed: ${err.message}`);
// //   }
// // }

// // /**
// //  * Main upload handler
// //  */
// // exports.createPost = async (req, res) => {
// //   try {
// //     if (!req.file) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "No file uploaded.",
// //       });
// //     }

// //     const fileBuffer = req.file.buffer;
// //     const bucket = process.env.AWS_BUCKET;
// //     const timestamp = Date.now();
// //     const fileExtension = path.extname(req.file.originalname).toLowerCase();
// //     const isVideo = ['.mp4', '.mov', '.avi', '.mkv'].includes(fileExtension);
// //     const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(fileExtension);

// //     if (!isVideo && !isImage) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Unsupported file type.",
// //       });
// //     }

// //     // Upload original file
// //     const originalKey = `original/${timestamp}_${req.file.originalname}`;
// //     const originalUpload = s3.upload({
// //       Bucket: bucket,
// //       Key: originalKey,
// //       Body: fileBuffer,
// //       ContentType: req.file.mimetype,
// //     }).promise();

// //     let compressedUrl = null;
// //     let compressionError = null;

// //     if (isVideo) {
// //       try {
// //         compressedUrl = await validateAndCompressVideo(
// //           fileBuffer,
// //           req.file.originalname,
// //           bucket
// //         );
// //       } catch (err) {
// //         console.error("❌ Video compression failed:", err);
// //         compressionError = err.message;
// //       }
// //     } else if (isImage) {
// //       try {
// //         compressedUrl = await compressImage(
// //           fileBuffer,
// //           req.file.originalname,
// //           bucket
// //         );
// //       } catch (err) {
// //         console.error("❌ Image compression failed:", err);
// //         compressionError = err.message;
// //       }
// //     }

// //     const originalData = await originalUpload;

// //     res.status(201).json({
// //       success: true,
// //       message: compressionError 
// //         ? "File uploaded but compression failed: " + compressionError 
// //         : "File uploaded successfully.",
// //       originalUrl: originalData.Location,
// //       compressedUrl: compressedUrl || originalData.Location,
// //       fileType: isVideo ? 'video' : 'image',
// //       compressionSuccess: !!compressedUrl && compressedUrl !== originalData.Location
// //     });
// //   } catch (err) {
// //     console.error("❌ Error uploading file:", err);
// //     if (!res.headersSent) {
// //       res.status(500).json({
// //         success: false,
// //         message: "Failed to upload file.",
// //         error: err.message,
// //       });
// //     }
// //   }
// // };

// const AWS = require("aws-sdk");
// const ffmpegPath = require("ffmpeg-static");
// const ffmpeg = require("fluent-ffmpeg");
// const sharp = require("sharp");
// const { Readable, PassThrough } = require("stream");
// const path = require("path");
// const fs = require("fs");
// const os = require("os");
// const { promisify } = require('util');
// const writeFileAsync = promisify(fs.writeFile);
// const unlinkAsync = promisify(fs.unlink);

// // Configure FFmpeg path
// ffmpeg.setFfmpegPath(ffmpegPath);

// // Initialize S3 client
// const s3 = new AWS.S3({
//   region: process.env.AWS_REGION,
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
// });

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
//  * Generates a thumbnail from video and uploads to S3
//  */
// async function generateAndUploadThumbnail(videoPath, originalName, bucket) {
//   const timestamp = Date.now();
//   const baseName = path.basename(originalName, path.extname(originalName));
//   const thumbnailKey = `thumbnails/thumbnail_${timestamp}_${baseName}.jpg`;
    
//   // Temporary file for thumbnail
//   const tempThumbnailPath = path.join(os.tmpdir(), `thumbnail_${timestamp}.jpg`);
  
//   try {
//     // Capture thumbnail at 3 seconds
//     await new Promise((resolve, reject) => {
//       ffmpeg(videoPath)
//         .screenshots({
//           timestamps: ['00:00:03.000'],
//           filename: `thumbnail_${timestamp}.jpg`,
//           folder: os.tmpdir(),
//           size: '640x360'
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
//       .jpeg({ quality: 80 })
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
//     // Clean up temp thumbnail file
//     try {
//       await unlinkAsync(tempThumbnailPath);
//     } catch (cleanupErr) {
//       console.error("Failed to clean up temp thumbnail file:", cleanupErr);
//     }
//   }
// }

// /**
//  * Validates and compresses video file
//  */
// async function validateAndCompressVideo(buffer, originalName, bucket) {
//   const timestamp = Date.now();
//   const fileExtension = path.extname(originalName).toLowerCase();
//   const baseName = path.basename(originalName, fileExtension);
//   const compressedKey = `compressed/compressed_${timestamp}_${baseName}.mp4`;
  
//   // Use system temp directory
//   const tempDir = os.tmpdir();
//   const tempFilePath = path.join(tempDir, `temp_${timestamp}${fileExtension}`);
  
//   // Ensure temp directory exists
//   if (!fs.existsSync(tempDir)) {
//     fs.mkdirSync(tempDir, { recursive: true });
//   }

//   // Write buffer to temp file
//   await writeFileAsync(tempFilePath, buffer);

//   try {
//     const { pass, uploadPromise } = uploadStreamToS3(
//       bucket,
//       compressedKey,
//       "video/mp4"
//     );

//     await new Promise((resolve, reject) => {
//       ffmpeg(tempFilePath)
//         .inputFormat(fileExtension.replace('.', ''))
//         .outputOptions([
//           "-vf scale=640:-2",          
//           "-b:v 800k",                 
//           "-c:a aac",                  
//           "-b:a 96k",                  
//           "-preset fast",              
//           "-movflags frag_keyframe+empty_moov", 
//         ])
//         .format("mp4")
//         .on("start", (command) => {
//           console.log("FFmpeg command:", command);
//         })
//         .on("error", (err) => {
//           console.error("❌ FFmpeg error:", err);
//           reject(new Error(`Video compression failed: ${err.message}`));
//         })
//         .on("end", () => {
//           console.log("✅ Compression finished");
//           resolve();
//         })
//         .on("stderr", (stderr) => {
//           console.log("FFmpeg stderr:", stderr);
//         })
//         .pipe(pass, { end: true });
//     });

//     const compressedData = await uploadPromise;
    
//     // Generate thumbnail after successful compression
//     const thumbnailUrl = await generateAndUploadThumbnail(tempFilePath, originalName, bucket);
    
//     return {
//       compressedUrl: compressedData.Location,
//       thumbnailUrl
//     };
//   } finally {
//     // Clean up temp file
//     try {
//       await unlinkAsync(tempFilePath);
//     } catch (cleanupErr) {
//       console.error("Failed to clean up temp file:", cleanupErr);
//     }
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
//       .jpeg({ quality: 80 }) // For JPEG
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
//         console.error("❌ Video compression failed:", err);
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
//         console.error("❌ Image compression failed:", err);
//         compressionError = err.message;
//       }
//     }

//     const originalData = await originalUpload;

//     res.status(201).json({
//       success: true,
//       message: compressionError 
//         ? "File uploaded but compression failed: " + compressionError 
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
  const ffmpegPath = require("ffmpeg-static");
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
  async function generateAndUploadThumbnail(videoPath, originalName, bucket) {
    const timestamp = Date.now();
    const baseName = path.basename(originalName, path.extname(originalName));
    const thumbnailKey = `thumbnails/thumbnail_${timestamp}_${baseName}.jpg`;
    
    // Use unique temp file name with process ID
    const tempThumbnailPath = path.join(os.tmpdir(), `thumbnail_${timestamp}_${process.pid}.jpg`);
    
    try {
      // Capture thumbnail at 3 seconds
      await new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['00:00:03.000'],
            filename: `thumbnail_${timestamp}_${process.pid}.jpg`,
            folder: os.tmpdir(),
            size: '640x360',
            fastSeek: true
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Optimize thumbnail with sharp
      const optimizedThumbnail = await sharp(tempThumbnailPath)
        .resize(640, 360, {
          fit: 'cover',
          withoutEnlargement: true
        })
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
    } finally {
      await deleteFileWithRetry(tempThumbnailPath);
    }
  }




// async function generateAndUploadThumbnail(videoPath, originalName, bucket) {
//     const timestamp = Date.now();
//     const baseName = path.basename(originalName, path.extname(originalName));
//     const thumbnailKey = `thumbnails/thumbnail_${timestamp}_${baseName}.jpg`;
    
//     // Use unique temp file name with process ID
//     const tempThumbnailPath = path.join(os.tmpdir(), `thumbnail_${timestamp}_${process.pid}.jpg`);
    
//     try {
//         // First get video metadata to determine original dimensions
//         const videoMetadata = await new Promise((resolve, reject) => {
//             ffmpeg.ffprobe(videoPath, (err, metadata) => {
//                 if (err) reject(err);
//                 else resolve(metadata);
//             });
//         });

//         // Get video dimensions from metadata
//         const videoStream = videoMetadata.streams.find(stream => stream.codec_type === 'video');
//         const { width: originalWidth, height: originalHeight } = videoStream;

//         // Capture thumbnail at 3 seconds using original dimensions
//         await new Promise((resolve, reject) => {
//             ffmpeg(videoPath)
//                 .screenshots({
//                     timestamps: ['00:00:03.000'],
//                     filename: `thumbnail_${timestamp}_${process.pid}.jpg`,
//                     folder: os.tmpdir(),
//                     size: `${originalWidth}x${originalHeight}`,
//                     fastSeek: true
//                 })
//                 .on('end', resolve)
//                 .on('error', reject);
//         });

//          const optimizedThumbnail = await sharp(tempThumbnailPath)
//             .resize(originalWidth, originalHeight, {
//                 fit: 'cover',
//                 withoutEnlargement: true
//             })
//             .jpeg({ 
//                 quality: 80,
//                 mozjpeg: true 
//             })
//             .toBuffer();

//         // Upload thumbnail to S3
//         const thumbnailData = await s3.upload({
//             Bucket: bucket,
//             Key: thumbnailKey,
//             Body: optimizedThumbnail,
//             ContentType: 'image/jpeg'
//         }).promise();

//         return thumbnailData.Location;
//     } finally {
//         await deleteFileWithRetry(tempThumbnailPath);
//     }
// }
  /**
   * Validates and compresses video file
   */
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

      const uploadPromise = s3.upload({
        Bucket: bucket,
        Key: compressedKey,
        Body: fs.createReadStream(outputTempPath),
        ContentType: 'video/mp4'
      }).promise();

      const [compressedData, thumbnailUrl] = await Promise.all([
        uploadPromise,
        generateAndUploadThumbnail(outputTempPath, originalName, bucket)
      ]);

      return {
        compressedUrl: compressedData.Location,
        thumbnailUrl
      };
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

      res.status(201).json({
        success: true,
        message: compressionError 
          ? "File uploaded but processing failed: " + compressionError 
          : "File uploaded successfully.",
        originalUrl: originalData.Location,
        compressedUrl: compressedData?.compressedUrl || originalData.Location,
        thumbnailUrl: compressedData?.thumbnailUrl || originalData.Location,
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

//   const AWS = require("aws-sdk");
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

// /**
//  * Compresses video and streams directly to S3
//  */
// async function compressVideoToStream(inputPath, compressedKey, bucket) {
//   const outputStream = new PassThrough();
  
//   const uploadPromise = s3.upload({
//     Bucket: bucket,
//     Key: compressedKey,
//     Body: outputStream,
//     ContentType: 'video/mp4'
//   }).promise();

//   return new Promise((resolve, reject) => {
//     ffmpeg(inputPath)
//       .outputOptions([
//         "-preset ultrafast",              // Fastest encoding preset
//         "-crf 35",                       // Lower quality
//         "-b:v 300k",                     // Low video bitrate
//         "-maxrate 400k",                 
//         "-bufsize 800k",
//         "-vf scale=320:-2",              // Lower resolution
//         "-c:v libx264",
//         "-an",                           // No audio
//         "-movflags +faststart"           // Enable streaming
//       ])
//       .on('start', (cmd) => console.log('FFmpeg started:', cmd))
//       .on('error', (err) => {
//         outputStream.destroy(err);
//         reject(err);
//       })
//       .on('end', () => {
//         outputStream.end();
//       })
//       .output(outputStream)
//       .run();

//     uploadPromise
//       .then(resolve)
//       .catch(reject);
//   });
// }

// /**
//  * Validates and compresses video file
//  */
// async function validateAndCompressVideo(buffer, originalName, bucket) {
//   const timestamp = Date.now();
//   const fileExtension = path.extname(originalName).toLowerCase();
//   const baseName = path.basename(originalName, fileExtension);
//   const compressedKey = `compressed/compressed_${timestamp}_${baseName}.mp4`;

//   const tempDir = os.tmpdir();
//   const inputTempPath = path.join(tempDir, `input_${timestamp}_${process.pid}${fileExtension}`);

//   await fsExtra.ensureDir(tempDir);
//   await writeFileAsync(inputTempPath, buffer);

//   try {
//     // Process video compression and thumbnail generation in parallel
//     const [compressedUpload, thumbnailUrl] = await Promise.all([
//       compressVideoToStream(inputTempPath, compressedKey, bucket),
//       generateAndUploadThumbnail(inputTempPath, originalName, bucket)
//     ]);

//     return {
//       compressedUrl: compressedUpload.Location,
//       thumbnailUrl
//     };
//   } finally {
//     await deleteFileWithRetry(inputTempPath);
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