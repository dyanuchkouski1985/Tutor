import { Injectable, NgZone } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { DeepgramConstants } from '../constants/deepgram.constants';
import { SpeechToken } from '../models/speech-token';
import type { SpeechTranscript } from './speech.service';

export class DeepgramConnectionError extends Error {}

@Injectable({
  providedIn: 'root',
})
export class DeepgramRecognitionService {
  private finishActive: (() => void) | null = null;

  constructor(private readonly zone: NgZone) {}

  get isSupported() {
    return typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  }

  listen(
    requestToken: () => Promise<SpeechToken | null>,
    language: string,
    keyterms: string[],
    continuous: boolean,
    maxRecordingSeconds: number,
  ): Observable<SpeechTranscript> {
    return new Observable<SpeechTranscript>((subscriber) => {
      let socket: WebSocket | null = null;
      let recorder: MediaRecorder | null = null;
      let stream: MediaStream | null = null;
      let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
      let cancelled = false;
      let isOpened = false;
      let isFinishing = false;
      const pendingChunks: Blob[] = [];
      const tokenRequest = requestToken().catch(() => null);

      const release = () => {
        clearTimeout(deadlineTimer);

        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }

        stream?.getTracks().forEach((track) => track.stop());
        recorder = null;
        stream = null;
      };

      const closeStream = () => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'CloseStream' }));
        }
      };

      const finish = () => {
        if (isFinishing) {
          return;
        }

        isFinishing = true;

        if (recorder && recorder.state !== 'inactive') {
          recorder.addEventListener('stop', closeStream, { once: true });
        } else {
          closeStream();
        }

        release();
      };

      this.finishActive = finish;

      const start = async () => {
        let media: MediaStream;

        try {
          media = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
          this.zone.run(() => subscriber.error(new Error(this.microphoneErrorMessage(error))));
          return;
        }

        if (cancelled) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }

        const mimeType = DeepgramConstants.MIME_TYPES.find((type) =>
          MediaRecorder.isTypeSupported(type),
        );

        stream = media;
        recorder = new MediaRecorder(media, mimeType ? { mimeType: mimeType } : undefined);
        recorder.ondataavailable = (event) => {
          if (!event.data.size) {
            return;
          }

          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          } else {
            pendingChunks.push(event.data);
          }
        };
        recorder.start(DeepgramConstants.CHUNK_MILLISECONDS);

        deadlineTimer = setTimeout(finish, maxRecordingSeconds * 1000);

        const token = await tokenRequest;

        if (cancelled) {
          return;
        }

        if (!token?.accessToken) {
          release();
          this.zone.run(() =>
            subscriber.error(
              new DeepgramConnectionError(token?.error || 'No speech token was issued.'),
            ),
          );
          return;
        }

        socket = new WebSocket(this.buildUrl(token.model, language, keyterms), [
          'bearer',
          token.accessToken,
        ]);

        socket.onopen = () => {
          isOpened = true;

          for (const chunk of pendingChunks.splice(0)) {
            socket?.send(chunk);
          }

          if (isFinishing && !recorder) {
            closeStream();
          }
        };

        socket.onmessage = (event) =>
          this.zone.run(() => this.handleMessage(event.data, subscriber, continuous, finish));

        socket.onerror = () =>
          this.zone.run(() => {
            release();
            subscriber.error(
              isOpened
                ? new Error('The speech service could not be reached. Try again.')
                : new DeepgramConnectionError('The speech service refused the connection.'),
            );
          });

        socket.onclose = () =>
          this.zone.run(() => {
            release();
            subscriber.complete();
          });
      };

      start();

      return () => {
        cancelled = true;
        release();

        if (this.finishActive === finish) {
          this.finishActive = null;
        }

        if (socket) {
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;

          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'CloseStream' }));
          }

          socket.close();
        }
      };
    });
  }

  stop() {
    this.finishActive?.();
    this.finishActive = null;
  }

  private handleMessage(
    data: string,
    subscriber: Subscriber<SpeechTranscript>,
    continuous: boolean,
    finish: () => void,
  ) {
    const message = JSON.parse(data);

    if (message.type !== 'Results') {
      return;
    }

    const variants: string[] = [];

    for (const alternative of message.channel?.alternatives ?? []) {
      const transcript = alternative.transcript?.trim();

      if (transcript && !variants.includes(transcript)) {
        variants.push(transcript);
      }
    }

    if (variants.length) {
      subscriber.next({
        transcript: variants[0],
        alternatives: variants.slice(1),
        isFinal: !!message.is_final,
      });
    }

    if (!continuous && message.speech_final) {
      finish();
    }
  }

  private buildUrl(model: string, language: string, keyterms: string[]) {
    const parameters = new URLSearchParams({
      model: model,
      language: language,
      interim_results: 'true',
      smart_format: 'true',
      mip_opt_out: 'true',
    });

    for (const keyterm of keyterms.slice(0, DeepgramConstants.MAX_KEYTERMS)) {
      parameters.append('keyterm', keyterm);
    }

    return `${DeepgramConstants.LISTEN_URL}?${parameters}`;
  }

  private microphoneErrorMessage(error: unknown) {
    switch ((error as DOMException)?.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'The microphone is blocked. Allow microphone access for this site and try again.';
      case 'NotFoundError':
        return 'No microphone was found. Check that one is connected and selected.';
      default:
        return 'The microphone could not be started. Try again.';
    }
  }
}
