import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Logging2 } from './platformAccessory.js';

// Calculate the path to ffmpeg-for-homebridge similar to how the package does it
const __dirname = dirname(fileURLToPath(import.meta.url));
const ffmpegBinary = platform() === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
const ffmpegForHomebridgePath = resolve(__dirname, '..', 'node_modules', 'ffmpeg-for-homebridge', ffmpegBinary);
const pathToFfmpeg = existsSync(ffmpegForHomebridgePath) ? ffmpegForHomebridgePath : undefined;

export class Ffmpeg {
  private readonly log: Logging2;
  snapshotPromise?: Promise<Buffer>;

  constructor(log: Logging2) {
    this.log = log;
  }

  fetchSnapshot(url: string, cameraName:string): Promise<Buffer> {
    this.snapshotPromise = new Promise((resolve, reject) => {
      const ffmpegArgs = url + // Still
            ' -frames:v 1' +
            ' -f image2 -' +
            ' -hide_banner' +
            ' -loglevel error';

      this.log.debug('Snapshot command: ' + url + ' ' + ffmpegArgs, cameraName);

      const path:string = /*ffmpegPath.ffmpeg_for_homebridge*/ pathToFfmpeg || 'ffmpeg';
      this.log.debug(`Path to ffmpeg: ${path}`);
      const ffmpeg = spawn(path, ffmpegArgs.split(/\s+/), { env: process.env });

      let snapshotBuffer = Buffer.alloc(0);
          ffmpeg.stdout!.on('data', (data) => {
            snapshotBuffer = Buffer.concat([snapshotBuffer, data]);
          });
          ffmpeg.on('error', (error: Error) => {
            reject('FFmpeg process creation failed: ' + error.message);
          });
          ffmpeg.stderr.on('data', (data) => {
            data.toString().split('\n').forEach((line: string) => {
              if (line.length > 0) { // For now only write anything out when debug is set
                this.log.debug(line, cameraName + '] [Snapshot');
              }
            });
          });
          ffmpeg.on('close', () => {
            if (snapshotBuffer.length > 0) {
              resolve(snapshotBuffer);
            } else {
              reject('Failed to fetch snapshot.');
            }

            setTimeout(() => {
              this.snapshotPromise = undefined;
            }, 3 * 1000); // Expire cached snapshot after 3 seconds
          });
    });
    return this.snapshotPromise;
  }
}