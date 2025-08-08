import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export interface FFmpegProgress {
  frames: number;
  currentFps: number;
  currentKbps: number;
  targetSize: number;
  timemark: string;
  percent: number;
}

export interface FFmpegOptions {
  timeout?: number; // in milliseconds
  maxConcurrent?: number;
  preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow';
  crf?: number; // 0-51, lower is better quality
  threads?: number;
}

export class FFmpegCommand extends EventEmitter {
  private inputs: string[] = [];
  private inputOptions: string[] = [];
  private outputOptions: string[] = [];
  private videoFilters: string[] = [];
  private audioFilters: string[] = [];
  private output: string = '';
  private process: ChildProcess | null = null;
  private options: FFmpegOptions;

  constructor(options: FFmpegOptions = {}) {
    super();
    this.options = {
      timeout: 300000, // 5 minutes default
      maxConcurrent: 2,
      preset: 'fast',
      crf: 23,
      threads: 2,
      ...options
    };
  }

  // Add input file
  input(inputPath: string): this {
    this.inputs.push(inputPath);
    return this;
  }

  // Add input options (applied before input)
  inputOption(option: string, value?: string): this {
    this.inputOptions.push(option);
    if (value !== undefined) {
      this.inputOptions.push(value);
    }
    return this;
  }

  // Add input options array
  addInputOptions(options: string[]): this {
    this.inputOptions.push(...options);
    return this;
  }

  // Add output options
  outputOption(option: string, value?: string): this {
    this.outputOptions.push(option);
    if (value !== undefined) {
      this.outputOptions.push(value);
    }
    return this;
  }

  // Add output options array
  addOutputOptions(options: string[]): this {
    this.outputOptions.push(...options);
    return this;
  }

  // Set video codec
  videoCodec(codec: string): this {
    return this.outputOption('-c:v', codec);
  }

  // Set audio codec
  audioCodec(codec: string): this {
    return this.outputOption('-c:a', codec);
  }

  // Set duration
  duration(seconds: number): this {
    return this.outputOption('-t', seconds.toString());
  }

  // Set video filter
  videoFilter(filter: string): this {
    this.videoFilters.push(filter);
    return this;
  }

  // Set audio filter
  audioFilter(filter: string): this {
    this.audioFilters.push(filter);
    return this;
  }

  // Set output format
  format(format: string): this {
    return this.outputOption('-f', format);
  }

  // Set frame rate
  fps(fps: number): this {
    return this.outputOption('-r', fps.toString());
  }

  // Set video size
  size(width: number, height: number): this {
    return this.outputOption('-s', `${width}x${height}`);
  }

  // Set aspect ratio
  aspect(ratio: string): this {
    return this.outputOption('-aspect', ratio);
  }

  // Set pixel format
  pixelFormat(format: string): this {
    return this.outputOption('-pix_fmt', format);
  }

  // Set quality (CRF)
  quality(crf: number): this {
    return this.outputOption('-crf', crf.toString());
  }

  // Set preset
  preset(preset: string): this {
    return this.outputOption('-preset', preset);
  }

  // Overwrite output files
  overwrite(): this {
    return this.outputOption('-y');
  }

  // Set output file
  save(outputPath: string): this {
    this.output = outputPath;
    return this;
  }

  // Build the complete FFmpeg command
  private buildCommand(): string[] {
    const args: string[] = [];

    // Add input options and inputs
    for (let i = 0; i < this.inputs.length; i++) {
      // Add any input-specific options here if needed
      args.push('-i', this.inputs[i]);
    }

    // Add global input options
    args.unshift(...this.inputOptions);

    // Add video filters
    if (this.videoFilters.length > 0) {
      args.push('-vf', this.videoFilters.join(','));
    }

    // Add audio filters
    if (this.audioFilters.length > 0) {
      args.push('-af', this.audioFilters.join(','));
    }

    // Add output options
    args.push(...this.outputOptions);

    // Add default options if not specified
    if (!this.outputOptions.includes('-preset')) {
      args.push('-preset', this.options.preset!);
    }
    if (!this.outputOptions.includes('-crf') && !this.outputOptions.includes('-b:v')) {
      args.push('-crf', this.options.crf!.toString());
    }
    if (!this.outputOptions.includes('-threads')) {
      args.push('-threads', this.options.threads!.toString());
    }

    // Add output file
    args.push(this.output);

    return args;
  }

  // Parse progress from FFmpeg stderr
  private parseProgress(data: string): FFmpegProgress | null {
    const lines = data.split('\n');
    let progress: Partial<FFmpegProgress> = {};

    for (const line of lines) {
      if (line.includes('frame=')) {
        const frameMatch = line.match(/frame=\s*(\d+)/);
        if (frameMatch) progress.frames = parseInt(frameMatch[1]);

        const fpsMatch = line.match(/fps=\s*([\d.]+)/);
        if (fpsMatch) progress.currentFps = parseFloat(fpsMatch[1]);

        const kbpsMatch = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
        if (kbpsMatch) progress.currentKbps = parseFloat(kbpsMatch[1]);

        const sizeMatch = line.match(/size=\s*(\d+)kB/);
        if (sizeMatch) progress.targetSize = parseInt(sizeMatch[1]);

        const timeMatch = line.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
        if (timeMatch) progress.timemark = timeMatch[1];

        // Calculate percentage if we have duration
        if (progress.timemark) {
          const [hours, minutes, seconds] = progress.timemark.split(':').map(parseFloat);
          const currentSeconds = hours * 3600 + minutes * 60 + seconds;
          
          // This is a rough estimate - in practice you'd need to know the total duration
          // For now, we'll emit the progress without percentage
          progress.percent = 0; // Will be calculated by caller if needed
        }
      }
    }

    if (Object.keys(progress).length > 0) {
      return progress as FFmpegProgress;
    }

    return null;
  }

  // Execute the FFmpeg command
  async run(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.output) {
        reject(new Error('No output file specified'));
        return;
      }

      if (this.inputs.length === 0) {
        reject(new Error('No input files specified'));
        return;
      }

      const args = this.buildCommand();
      console.log('🔧 [FFmpeg] Executing command:', 'ffmpeg', args.join(' '));

      this.process = spawn('ffmpeg', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';
      let stdout = '';

      // Handle stdout
      this.process.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Handle stderr (FFmpeg outputs progress to stderr)
      this.process.stderr?.on('data', (data) => {
        const chunk = data.toString();
        stderr += chunk;

        // Parse and emit progress
        const progress = this.parseProgress(chunk);
        if (progress) {
          this.emit('progress', progress);
        }

        // Emit raw stderr for debugging
        this.emit('stderr', chunk);
      });

      // Handle process completion
      this.process.on('close', (code) => {
        if (code === 0) {
          this.emit('end');
          resolve();
        } else {
          const error = new Error(`FFmpeg process exited with code ${code}\nStderr: ${stderr}`);
          this.emit('error', error);
          reject(error);
        }
      });

      // Handle process errors
      this.process.on('error', (error) => {
        this.emit('error', error);
        reject(error);
      });

      // Set timeout
      if (this.options.timeout) {
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
            const error = new Error(`FFmpeg process timed out after ${this.options.timeout}ms`);
            this.emit('error', error);
            reject(error);
          }
        }, this.options.timeout);
      }
    });
  }

  // Cancel the running process
  cancel(): void {
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM');
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    }
  }
}

// Factory function to create FFmpeg commands
export function ffmpeg(options?: FFmpegOptions): FFmpegCommand {
  return new FFmpegCommand(options);
}

// Utility function to get video/audio info
export async function getMediaInfo(filePath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(stdout);
          resolve(info);
        } catch (error) {
          reject(new Error(`Failed to parse ffprobe output: ${error}`));
        }
      } else {
        reject(new Error(`ffprobe process exited with code ${code}\nStderr: ${stderr}`));
      }
    });

    process.on('error', (error) => {
      reject(error);
    });
  });
}

// Utility function to check if FFmpeg is available
export async function checkFFmpegAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('ffmpeg', ['-version']);
    
    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}
