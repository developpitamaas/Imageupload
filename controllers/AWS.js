const AWS = require("aws-sdk");
const ffmpegPath = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const { Readable, PassThrough } = require("stream");
const path = require("path");


ffmpeg.setFfmpegPath(ffmpegPath);

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

    const originalKey = `original/${timestamp}_${req.file.originalname}`;

    // Upload original file
    const originalUpload = s3.upload({
      Bucket: bucket,
      Key: originalKey,
      Body: fileBuffer,
      ContentType: req.file.mimetype,
    }).promise();

    let compressedData = null;

    if (isVideo) {
      // Handle video compression
      const compressedKey = `compressed/compressed_${timestamp}_${path.basename(req.file.originalname, fileExtension)}.mp4`;
      
      const { pass, uploadPromise } = uploadStreamToS3(
        bucket,
        compressedKey,
        "video/mp4"
      );

      const bufferStream = Readable.from(fileBuffer);

      await new Promise((resolve, reject) => {
        ffmpeg(bufferStream)
          .outputOptions([
            "-vf scale=640:-2",
            "-b:v 800k",
            "-c:a aac",
            "-b:a 96k",
            "-preset fast",
            "-movflags frag_keyframe+empty_moov",
          ])
          .format("mp4")
          .on("error", (err) => {
            console.error("❌ FFmpeg error:", err);
            reject(err);
          })
          .on("end", () => {
            console.log("✅ Compression finished");
            resolve();
          })
          .pipe(pass, { end: true });
      });

      compressedData = await uploadPromise;
    } else if (isImage) {
      // For images, we can just use the original as there's no compression in this example
      // In a real app, you might want to add image compression here
      compressedData = {
        Location: (await originalUpload).Location
      };
    }

    const originalData = await originalUpload;

    res.status(201).json({
      success: true,
      message: "File uploaded successfully.",
      originalUrl: originalData.Location,
      compressedUrl: compressedData?.Location || originalData.Location,
      fileType: isVideo ? 'video' : 'image'
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