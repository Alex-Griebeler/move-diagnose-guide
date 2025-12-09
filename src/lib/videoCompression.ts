/**
 * Client-side video compression utility
 * Reduces video resolution to 720p and bitrate to 1.5Mbps
 */

interface CompressionOptions {
  maxWidth: number;
  maxHeight: number;
  videoBitrate: number;
  onProgress?: (progress: number) => void;
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1280,
  maxHeight: 720,
  videoBitrate: 1500000, // 1.5 Mbps
};

/**
 * Compress a video file using MediaRecorder API
 */
export async function compressVideo(
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // Skip compression for small files (less than 10MB)
  if (file.size < 10 * 1024 * 1024) {
    console.log('Video is small enough, skipping compression');
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const blobUrl = URL.createObjectURL(file);
    video.src = blobUrl;

    video.onloadedmetadata = async () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { videoWidth, videoHeight } = video;
        
        if (videoWidth > opts.maxWidth || videoHeight > opts.maxHeight) {
          const aspectRatio = videoWidth / videoHeight;
          
          if (aspectRatio > opts.maxWidth / opts.maxHeight) {
            videoWidth = opts.maxWidth;
            videoHeight = Math.round(opts.maxWidth / aspectRatio);
          } else {
            videoHeight = opts.maxHeight;
            videoWidth = Math.round(opts.maxHeight * aspectRatio);
          }
        }

        // Create canvas for rendering
        const canvas = document.createElement('canvas');
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Get canvas stream
        const canvasStream = canvas.captureStream(30);
        
        // Get audio track from original video if available
        await video.play();
        video.pause();
        video.currentTime = 0;
        
        // Determine best supported format
        const mimeType = getSupportedMimeType();
        if (!mimeType) {
          console.warn('MediaRecorder not fully supported, returning original file');
          URL.revokeObjectURL(blobUrl);
          resolve(file);
          return;
        }

        // Create MediaRecorder
        const chunks: Blob[] = [];
        const mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond: opts.videoBitrate,
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          URL.revokeObjectURL(blobUrl);
          
          const blob = new Blob(chunks, { type: mimeType });
          const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^/.]+$/, `.${extension}`),
            { type: mimeType }
          );
          
          console.log(`Video compressed: ${formatBytes(file.size)} → ${formatBytes(compressedFile.size)}`);
          resolve(compressedFile);
        };

        mediaRecorder.onerror = (e) => {
          URL.revokeObjectURL(blobUrl);
          reject(e);
        };

        // Start recording
        mediaRecorder.start(100);
        
        const duration = video.duration;
        let lastProgress = 0;
        
        // Play video and draw to canvas
        video.onended = () => {
          mediaRecorder.stop();
          opts.onProgress?.(100);
        };

        video.ontimeupdate = () => {
          const progress = Math.round((video.currentTime / duration) * 100);
          if (progress !== lastProgress) {
            lastProgress = progress;
            opts.onProgress?.(progress);
          }
        };

        // Render loop
        const renderFrame = () => {
          if (!video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            requestAnimationFrame(renderFrame);
          }
        };

        video.play().then(() => {
          renderFrame();
        }).catch(reject);
        
      } catch (error) {
        URL.revokeObjectURL(blobUrl);
        reject(error);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Get supported MIME type for MediaRecorder
 */
function getSupportedMimeType(): string | null {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return null;
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if video compression is supported
 */
export function isCompressionSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && getSupportedMimeType() !== null;
}
