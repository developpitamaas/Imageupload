const AWS = require("aws-sdk");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const { Readable, PassThrough } = require("stream");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Configure FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize S3 client
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});


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
 * Validates and compresses video file
 */
async function validateAndCompressVideo(buffer, originalName, bucket) {
  const timestamp = Date.now();
  const fileExtension = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, fileExtension);
  const compressedKey = `compressed/compressed_${timestamp}_${baseName}.mp4`;
  
  // Use system temp directory (works cross-platform)
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `temp_${timestamp}${fileExtension}`);
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Write buffer to temp file
  await writeFileAsync(tempFilePath, buffer);

  try {
    const { pass, uploadPromise } = uploadStreamToS3(
      bucket,
      compressedKey,
      "video/mp4"
    );

    await new Promise((resolve, reject) => {
      ffmpeg(tempFilePath)
        .inputFormat(fileExtension.replace('.', ''))
        .outputOptions([
          "-vf scale=640:-2",          
          "-b:v 800k",                 
          "-c:a aac",                  
          "-b:a 96k",                  
          "-preset fast",           
          "-movflags frag_keyframe+empty_moov", 
        ])
        .format("mp4")
        .on("start", (command) => {
          console.log("FFmpeg command:", command);
        })
        .on("error", (err) => {
          console.error("❌ FFmpeg error:", err);
          reject(new Error(`Video compression failed: ${err.message}`));
        })
        .on("end", () => {
          console.log("✅ Compression finished");
          resolve();
        })
        .on("stderr", (stderr) => {
          console.log("FFmpeg stderr:", stderr);
        })
        .pipe(pass, { end: true });
    });

    const compressedData = await uploadPromise;
    return compressedData.Location;
  } finally {
    // Clean up temp file
    try {
      await unlinkAsync(tempFilePath);
    } catch (cleanupErr) {
      console.error("Failed to clean up temp file:", cleanupErr);
    }
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

    let compressedUrl = null;
    let compressionError = null;

    if (isVideo) {
      try {
        compressedUrl = await validateAndCompressVideo(
          fileBuffer,
          req.file.originalname,
          bucket
        );
      } catch (err) {
        console.error("❌ Video compression failed:", err);
        compressionError = err.message;
      }
    } else {
      // For images, use original as compressed version
      compressedUrl = (await originalUpload).Location;
    }

    const originalData = await originalUpload;

    res.status(201).json({
      success: true,
      message: compressionError 
        ? "File uploaded but compression failed: " + compressionError 
        : "File uploaded successfully.",
      originalUrl: originalData.Location,
      compressedUrl: compressedUrl || originalData.Location,
      fileType: isVideo ? 'video' : 'image',
      compressionSuccess: !!compressedUrl && compressedUrl !== originalData.Location
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
