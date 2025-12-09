/**
 * Client-side video compression using FFmpeg.wasm
 * Reduces video quality while maintaining playability
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let isLoading = false;

interface CompressionOptions {
  targetSizeMB?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Load FFmpeg (singleton pattern)
 */
async function loadFFmpeg(onProgress?: (progress: number) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) {
    return ffmpeg;
  }

  if (isLoading) {
    // Wait for existing load
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (ffmpeg && ffmpeg.loaded) {
      return ffmpeg;
    }
  }

  isLoading = true;

  try {
    ffmpeg = new FFmpeg();

    ffmpeg.on('progress', ({ progress }) => {
      onProgress?.(Math.round(progress * 100));
    });

    // Load FFmpeg core from CDN
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
  } finally {
    isLoading = false;
  }
}

/**
 * Compress video to target size
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { targetSizeMB = 50, onProgress } = options;
  const targetBytes = targetSizeMB * 1024 * 1024;

  // Skip if already small enough
  if (file.size <= targetBytes) {
    console.log('Video already within size limit, skipping compression');
    return file;
  }

  try {
    onProgress?.(0);

    const ff = await loadFFmpeg(onProgress);
    
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    // Write input file
    await ff.writeFile(inputName, await fetchFile(file));

    // Calculate target bitrate based on desired file size
    // Estimate video duration (rough estimate: 1MB per 10 seconds at medium quality)
    const estimatedDuration = Math.max(10, (file.size / (1024 * 1024)) * 8);
    const targetBitrate = Math.floor((targetBytes * 8) / estimatedDuration / 1000); // kbps

    // Ensure reasonable bitrate range
    const bitrate = Math.max(500, Math.min(targetBitrate, 2500));

    console.log(`Compressing: ${(file.size / 1024 / 1024).toFixed(1)}MB → target ${targetSizeMB}MB, bitrate: ${bitrate}kbps`);

    // Run FFmpeg compression
    await ff.exec([
      '-i', inputName,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '28',
      '-maxrate', `${bitrate}k`,
      '-bufsize', `${bitrate * 2}k`,
      '-vf', 'scale=1280:-2',  // 720p max width, keep aspect ratio
      '-c:a', 'aac',
      '-b:a', '128k',
      '-movflags', '+faststart',
      outputName
    ]);

    // Read output file
    const data = await ff.readFile(outputName);
    // Handle both Uint8Array and string response types
    let blobData: BlobPart;
    if (typeof data === 'string') {
      blobData = new TextEncoder().encode(data);
    } else {
      blobData = new Uint8Array(data);
    }
    const blob = new Blob([blobData], { type: 'video/mp4' });
    
    // Clean up
    await ff.deleteFile(inputName);
    await ff.deleteFile(outputName);

    const compressedFile = new File(
      [blob],
      file.name.replace(/\.[^/.]+$/, '.mp4'),
      { type: 'video/mp4' }
    );

    console.log(`Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB`);
    
    onProgress?.(100);
    return compressedFile;

  } catch (error) {
    console.error('FFmpeg compression failed:', error);
    throw error;
  }
}

/**
 * Check if compression is supported
 */
export function isCompressionSupported(): boolean {
  return typeof SharedArrayBuffer !== 'undefined';
}
