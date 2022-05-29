import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-for-homebridge';
import {API, HAP, Logger } from 'homebridge';

export class Ffmpeg {
    private readonly log: Logger;
    snapshotPromise?: Promise<Buffer>;

    constructor(log: Logger, api: API) {
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
          const ffmpeg = spawn(ffmpegPath!, ffmpegArgs.split(/\s+/), { env: process.env });
    
          let snapshotBuffer = Buffer.alloc(0);
          ffmpeg.stdout.on('data', (data) => {
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

