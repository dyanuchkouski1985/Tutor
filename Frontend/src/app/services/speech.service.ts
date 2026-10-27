import { Injectable, NgZone } from '@angular/core';
import { Observable, catchError, defer, firstValueFrom, throwError } from 'rxjs';
import { LanguageEnum } from '../enums/language.enum';
import { ParticipantGenderEnum } from '../enums/participant-gender.enum';
import { ParticipantVoiceEnum } from '../enums/participant-voice.enum';
import { VoiceConstants, VoiceProfile } from '../constants/voice.constants';
import { ConversationParticipant } from '../models/conversation';
import { DeepgramConstants } from '../constants/deepgram.constants';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import {
  DeepgramConnectionError,
  DeepgramRecognitionService,
} from './deepgram-recognition.service';
import { DynamicConfigService } from './dynamic.config.service';
import { StaticConfigService } from './static.config.service';

export class SpeechTranscript {
  transcript: string;
  alternatives: string[];
  isFinal: boolean;
}

export class VoiceAssignment {
  voice: ParticipantVoiceEnum;
  order: number;
}

export class SpeechPhrase {
  text: string;
  boost: number;
}

@Injectable({
  providedIn: 'root',
})
export class SpeechService {
  localRecognitionStatus = '';

  private recognition: SpeechRecognition | null = null;
  private shouldRestart = false;
  private audio: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private speechRequestId = 0;
  private rate = 1;
  private utteranceProgress = 0;
  private endedAudioDuration = 0;
  private readonly audioCache = new Map<string, Blob>();
  private readonly pendingAudio = new Map<string, Promise<Blob | null>>();
  private decodingContext: AudioContext | null = null;
  private readonly voicesReady: Promise<void>;

  constructor(
    private readonly dynamicConfigService: DynamicConfigService,
    private readonly staticConfigService: StaticConfigService,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
    private readonly deepgramRecognitionService: DeepgramRecognitionService,
    private readonly zone: NgZone,
  ) {
    this.voicesReady = this.isSpeakingSupported ? this.loadVoices() : Promise.resolve();
  }

  get playbackRate() {
    return this.rate;
  }

  set playbackRate(value: number) {
    this.rate = value;

    if (this.audio) {
      this.audio.playbackRate = value;
    }
  }

  get audioTime(): number | null {
    return this.audio ? this.audio.currentTime : null;
  }

  get lastAudioDuration() {
    return this.endedAudioDuration;
  }

  get utteranceFraction() {
    return this.utteranceProgress;
  }

  get isSpeakingSupported() {
    return typeof speechSynthesis !== 'undefined';
  }

  get isListeningSupported() {
    return !!this.getRecognitionConstructor() || this.isDeepgramEnabled;
  }

  private get isDeepgramEnabled() {
    return !this.staticConfigService.browserSpeech && this.deepgramRecognitionService.isSupported;
  }

  assignVoices(participants: ConversationParticipant[]) {
    const assignments = new Map<number, VoiceAssignment>();
    const orders = new Map<ParticipantGenderEnum, number>();

    for (const participant of [...participants].sort((first, second) => first.id - second.id)) {
      const voice = participant.voice ?? ParticipantVoiceEnum.Unknown;
      const gender = this.profile(voice).gender;
      const order = orders.get(gender) ?? 0;

      orders.set(gender, order + 1);
      assignments.set(participant.id, { voice: voice, order: order });
    }

    return assignments;
  }

  async speak(text: string, language: LanguageEnum, assignment?: VoiceAssignment): Promise<void> {
    this.stopSpeaking();

    if (!text?.trim() || this.dynamicConfigService.muteSound) {
      return;
    }

    const speechRequestId = this.speechRequestId;

    if (!this.staticConfigService.browserSpeech && language === LanguageEnum.English) {
      const isHandled = await this.speakWithDeepgram(text, assignment, speechRequestId);

      if (isHandled || speechRequestId !== this.speechRequestId) {
        return;
      }
    }

    if (!this.isSpeakingSupported) {
      return;
    }

    await this.voicesReady;

    const tag = this.languageTag(language);
    const profile = this.profile(assignment?.voice ?? ParticipantVoiceEnum.Unknown);
    const order = assignment?.order ?? 0;

    return new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);

      utterance.lang = tag;
      utterance.voice = this.selectVoice(tag, profile.gender, order);
      utterance.pitch = this.tune(
        profile.pitch,
        VoiceConstants.ORDER_PITCH_OFFSETS,
        order,
        VoiceConstants.MIN_PITCH,
        VoiceConstants.MAX_PITCH,
      );
      utterance.rate = this.tune(
        profile.rate,
        VoiceConstants.ORDER_RATE_OFFSETS,
        order,
        VoiceConstants.MIN_RATE,
        VoiceConstants.MAX_RATE,
      );

      utterance.onboundary = (event) => (this.utteranceProgress = event.charIndex / text.length);
      utterance.onend = () => this.zone.run(() => resolve());
      utterance.onerror = () => this.zone.run(() => resolve());

      speechSynthesis.speak(utterance);
    });
  }

  stopSpeaking() {
    this.speechRequestId++;
    this.utteranceProgress = 0;
    this.endedAudioDuration = 0;
    this.abortController?.abort();
    this.abortController = null;
    this.audio?.pause();
    this.audio = null;

    if (this.isSpeakingSupported) {
      speechSynthesis.cancel();
    }
  }

  private async speakWithDeepgram(
    text: string,
    assignment: VoiceAssignment | undefined,
    speechRequestId: number,
  ): Promise<boolean> {
    const voice = assignment?.voice ?? ParticipantVoiceEnum.Unknown;
    const order = assignment?.order ?? 0;
    const cacheKey = `${voice}|${order}|${text}`;
    const cached = this.audioCache.get(cacheKey);

    if (cached) {
      return this.playAudio(URL.createObjectURL(cached));
    }

    const pending = this.pendingAudio.get(cacheKey);

    if (pending) {
      const audioData = await pending;

      if (speechRequestId !== this.speechRequestId) {
        return true;
      }

      return audioData
        ? this.playAudio(URL.createObjectURL(audioData))
        : this.handleSpeechFailure(speechRequestId);
    }

    const abortController = new AbortController();
    let response: Response;

    this.abortController = abortController;

    try {
      response = await fetch(`${this.staticConfigService.apiUrl}Speech/Speak`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authService.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text, voice: voice, order: order }),
        signal: abortController.signal,
      });
    } catch {
      return this.handleSpeechFailure(speechRequestId);
    }

    if (speechRequestId !== this.speechRequestId) {
      return true;
    }

    if (!response.ok || !response.body) {
      return this.handleSpeechFailure(speechRequestId);
    }

    const cacheAudio = (chunks: BlobPart[]) =>
      this.cacheAudio(cacheKey, new Blob(chunks, { type: DeepgramConstants.SPEECH_MIME_TYPE }));

    if (this.canStreamAudio) {
      return this.playStream(response.body, cacheAudio);
    }

    let audioData: Blob;

    try {
      audioData = await response.blob();
    } catch {
      return this.handleSpeechFailure(speechRequestId);
    }

    if (speechRequestId !== this.speechRequestId) {
      return true;
    }

    cacheAudio([audioData]);

    return this.playAudio(URL.createObjectURL(audioData));
  }

  async preload(
    text: string,
    language: LanguageEnum,
    assignment?: VoiceAssignment,
  ): Promise<number | null> {
    if (
      !text?.trim() ||
      this.dynamicConfigService.muteSound ||
      this.staticConfigService.browserSpeech ||
      language !== LanguageEnum.English
    ) {
      return null;
    }

    const voice = assignment?.voice ?? ParticipantVoiceEnum.Unknown;
    const order = assignment?.order ?? 0;
    const cacheKey = `${voice}|${order}|${text}`;
    let audioData = this.audioCache.get(cacheKey) ?? null;

    if (!audioData) {
      let pending = this.pendingAudio.get(cacheKey);

      if (!pending) {
        pending = this.fetchAudio(text, voice, order).then((fetched) => {
          this.pendingAudio.delete(cacheKey);

          if (fetched) {
            this.cacheAudio(cacheKey, fetched);
          }

          return fetched;
        });
        this.pendingAudio.set(cacheKey, pending);
      }

      audioData = await pending;
    }

    if (!audioData) {
      return null;
    }

    try {
      this.decodingContext ??= new AudioContext();
      const buffer = await this.decodingContext.decodeAudioData(await audioData.arrayBuffer());

      return buffer.duration;
    } catch {
      return null;
    }
  }

  private async fetchAudio(text: string, voice: ParticipantVoiceEnum, order: number) {
    try {
      const response = await fetch(`${this.staticConfigService.apiUrl}Speech/Speak`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authService.getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text, voice: voice, order: order }),
      });

      if (!response.ok) {
        return null;
      }

      const audioData = await response.blob();

      return new Blob([audioData], { type: DeepgramConstants.SPEECH_MIME_TYPE });
    } catch {
      return null;
    }
  }

  private get canStreamAudio() {
    return (
      typeof MediaSource !== 'undefined' &&
      MediaSource.isTypeSupported(DeepgramConstants.SPEECH_MIME_TYPE)
    );
  }

  private handleSpeechFailure(speechRequestId: number) {
    if (speechRequestId !== this.speechRequestId) {
      return true;
    }

    console.warn('Deepgram speech is unavailable, using browser voices.');
    return false;
  }

  private cacheAudio(cacheKey: string, audioData: Blob) {
    this.audioCache.delete(cacheKey);
    this.audioCache.set(cacheKey, audioData);

    if (this.audioCache.size > DeepgramConstants.SPEECH_CACHE_SIZE) {
      this.audioCache.delete(this.audioCache.keys().next().value!);
    }
  }

  private playStream(body: ReadableStream<Uint8Array>, onComplete: (chunks: BlobPart[]) => void) {
    const mediaSource = new MediaSource();

    mediaSource.addEventListener(
      'sourceopen',
      () => this.pumpStream(mediaSource, body, onComplete),
      {
        once: true,
      },
    );

    return this.playAudio(URL.createObjectURL(mediaSource));
  }

  private async pumpStream(
    mediaSource: MediaSource,
    body: ReadableStream<Uint8Array>,
    onComplete: (chunks: BlobPart[]) => void,
  ) {
    const reader = body.getReader();
    const chunks: BlobPart[] = [];

    try {
      const sourceBuffer = mediaSource.addSourceBuffer(DeepgramConstants.SPEECH_MIME_TYPE);

      for (;;) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        chunks.push(value as BlobPart);
        await this.appendChunk(sourceBuffer, value);
      }

      mediaSource.endOfStream();
      onComplete(chunks);
    } catch {
      reader.cancel().catch(() => {});

      try {
        if (mediaSource.readyState === 'open') {
          mediaSource.endOfStream('network');
        }
      } catch {}
    }
  }

  private appendChunk(sourceBuffer: SourceBuffer, chunk: Uint8Array) {
    return new Promise<void>((resolve, reject) => {
      sourceBuffer.addEventListener('updateend', () => resolve(), { once: true });
      sourceBuffer.addEventListener('error', () => reject(), { once: true });
      sourceBuffer.appendBuffer(chunk as BufferSource);
    });
  }

  private playAudio(url: string) {
    const audio = new Audio(url);

    audio.defaultPlaybackRate = this.rate;
    audio.playbackRate = this.rate;
    this.audio = audio;

    return new Promise<boolean>((resolve) => {
      let isDone = false;

      const done = (isPlayed: boolean) => {
        if (isDone) {
          return;
        }

        isDone = true;
        URL.revokeObjectURL(url);

        if (this.audio === audio) {
          this.audio = null;
        }

        this.zone.run(() => resolve(isPlayed));
      };

      audio.onended = () => {
        this.endedAudioDuration = audio.currentTime;
        done(true);
      };
      audio.onpause = () => done(true);
      audio.onerror = () => done(false);
      audio.play().catch(() => done(false));
    });
  }

  listen(language: LanguageEnum, phrases: SpeechPhrase[] = []): Observable<SpeechTranscript> {
    if (!this.isDeepgramEnabled) {
      return this.listenInBrowser(language, phrases);
    }

    return defer(() => {
      this.stopListening();
      this.localRecognitionStatus = 'Deepgram';

      return this.deepgramRecognitionService.listen(
        () => firstValueFrom(this.apiService.getSpeechToken()),
        this.deepgramLanguage(language),
        phrases.map((phrase) => phrase.text),
        this.staticConfigService.continuousRecording,
        this.staticConfigService.maxRecordingSeconds,
      );
    }).pipe(
      catchError((error) =>
        error instanceof DeepgramConnectionError
          ? this.fallBackToBrowser(language, phrases, error.message)
          : throwError(() => error),
      ),
    );
  }

  private fallBackToBrowser(language: LanguageEnum, phrases: SpeechPhrase[], reason?: string) {
    console.warn(`Deepgram is unavailable, using browser recognition. ${reason ?? ''}`.trim());

    return this.getRecognitionConstructor()
      ? this.listenInBrowser(language, phrases)
      : throwError(() => new Error(reason || 'Speech recognition is not available right now.'));
  }

  private listenInBrowser(
    language: LanguageEnum,
    phrases: SpeechPhrase[],
  ): Observable<SpeechTranscript> {
    return new Observable<SpeechTranscript>((subscriber) => {
      const recognitionConstructor = this.getRecognitionConstructor();

      if (!recognitionConstructor) {
        subscriber.error(new Error('Speech recognition is not supported by this browser.'));
        return;
      }

      this.stopListening();

      const continuous = this.staticConfigService.continuousRecording;
      const deadline = Date.now() + this.staticConfigService.maxRecordingSeconds * 1000;

      const maxAlternatives = this.staticConfigService.maxAlternatives;
      const tag = this.recognitionTag(language);

      let cancelled = false;

      const recognition = new recognitionConstructor();
      recognition.lang = tag;
      recognition.continuous = continuous;
      recognition.interimResults = true;
      recognition.maxAlternatives = maxAlternatives;

      this.shouldRestart = continuous;

      recognition.onresult = (event) => {
        const results: SpeechRecognitionResult[] = [];
        let isFinal = false;

        for (let index = event.resultIndex; index < event.results.length; index++) {
          results.push(event.results[index]);
          isFinal = isFinal || event.results[index].isFinal;
        }

        const variants = this.buildVariants(results, maxAlternatives);

        this.zone.run(() =>
          subscriber.next({
            transcript: variants[0] ?? '',
            alternatives: variants.slice(1),
            isFinal: isFinal,
          }),
        );
      };

      recognition.onerror = (event) =>
        this.zone.run(() => {
          if (event.error === 'no-speech' || event.error === 'aborted') {
            return;
          }

          this.shouldRestart = false;
          subscriber.error(new Error(this.errorMessage(event.error)));
        });

      recognition.onend = () =>
        this.zone.run(() => {
          if (!this.shouldRestart || Date.now() >= deadline) {
            subscriber.complete();
            return;
          }

          recognition.start();
        });

      this.applyPhrases(recognitionConstructor, recognition, tag, phrases).then(() => {
        if (cancelled) {
          return;
        }

        recognition.start();
        this.recognition = recognition;
      });

      return () => {
        cancelled = true;
        this.shouldRestart = false;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();

        if (this.recognition === recognition) {
          this.recognition = null;
        }
      };
    });
  }

  stopListening() {
    this.deepgramRecognitionService.stop();
    this.shouldRestart = false;
    this.recognition?.stop();
    this.recognition = null;
  }

  private getRecognitionConstructor() {
    return window.SpeechRecognition ?? window.webkitSpeechRecognition;
  }

  private async applyPhrases(
    recognitionConstructor: SpeechRecognitionConstructor,
    recognition: SpeechRecognition,
    tag: string,
    phrases: SpeechPhrase[],
  ) {
    if (!this.staticConfigService.localRecognition) {
      this.localRecognitionStatus = 'off';
      return;
    }

    if (!phrases.length) {
      this.localRecognitionStatus = 'no phrases';
      return;
    }

    if (
      !recognitionConstructor.available ||
      typeof SpeechRecognitionPhrase === 'undefined' ||
      !('phrases' in recognition)
    ) {
      this.localRecognitionStatus = 'unsupported';
      return;
    }

    const phraseConstructor = SpeechRecognitionPhrase;
    const options = { langs: [tag], processLocally: true };

    try {
      const availability = await recognitionConstructor.available(options);

      this.localRecognitionStatus = availability;

      if (availability === 'downloadable') {
        recognitionConstructor.install?.(options);
        this.localRecognitionStatus = 'downloading';
        return;
      }

      if (availability !== 'available') {
        return;
      }

      recognition.processLocally = true;
      recognition.phrases = phrases.map(
        (phrase) => new phraseConstructor(phrase.text, phrase.boost),
      );

      this.localRecognitionStatus = `on-device, ${phrases.length} phrases`;
    } catch {
      recognition.processLocally = false;
      this.localRecognitionStatus = 'unavailable';
    }
  }

  private errorMessage(error: string) {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'The microphone is blocked. Allow microphone access for this site and try again.';
      case 'audio-capture':
        return 'No microphone was found. Check that one is connected and selected.';
      case 'network':
        return 'The recognition service could not be reached. Check your connection.';
      case 'language-not-supported':
        return 'This browser cannot recognise the language of this conversation.';
      default:
        return 'Speech recognition stopped unexpectedly. Try again.';
    }
  }

  private buildVariants(results: SpeechRecognitionResult[], maxAlternatives: number) {
    const variants: string[] = [];

    for (let order = 0; order < maxAlternatives; order++) {
      let variant = '';

      for (const result of results) {
        variant += result[Math.min(order, result.length - 1)].transcript;
      }

      variant = variant.trim();

      if (variant && !variants.includes(variant)) {
        variants.push(variant);
      }
    }

    return variants;
  }

  private loadVoices() {
    return new Promise<void>((resolve) => {
      if (speechSynthesis.getVoices().length) {
        resolve();
        return;
      }

      speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
      setTimeout(() => resolve(), VoiceConstants.VOICES_READY_TIMEOUT);
    });
  }

  private selectVoice(tag: string, gender: ParticipantGenderEnum, order: number) {
    const candidates = speechSynthesis
      .getVoices()
      .filter((candidate) => this.primaryTag(candidate.lang) === this.primaryTag(tag))
      .sort((first, second) => this.score(second, tag) - this.score(first, tag));

    const matching =
      gender === ParticipantGenderEnum.Unspecified
        ? []
        : candidates.filter((candidate) => this.voiceGender(candidate.name) === gender);

    const pool = matching.length ? matching : candidates;

    return pool.length ? pool[order % pool.length] : null;
  }

  private score(voice: SpeechSynthesisVoice, tag: string) {
    const name = voice.name.toLowerCase();

    return (
      (this.normalizeTag(voice.lang) === this.normalizeTag(tag) ? 2 : 0) +
      (VoiceConstants.QUALITY_MARKERS.some((marker) => name.includes(marker)) ? 1 : 0)
    );
  }

  private voiceGender(name: string) {
    const lowered = name.toLowerCase();

    if (lowered.includes('female')) {
      return ParticipantGenderEnum.Female;
    }

    if (lowered.includes('male')) {
      return ParticipantGenderEnum.Male;
    }

    const tokens = lowered.split(/[^a-z]+/);

    if (tokens.some((token) => VoiceConstants.FEMALE_NAMES.includes(token))) {
      return ParticipantGenderEnum.Female;
    }

    if (tokens.some((token) => VoiceConstants.MALE_NAMES.includes(token))) {
      return ParticipantGenderEnum.Male;
    }

    return ParticipantGenderEnum.Unspecified;
  }

  private profile(voice: ParticipantVoiceEnum): VoiceProfile {
    return VoiceConstants.PROFILES[voice] ?? VoiceConstants.PROFILES[ParticipantVoiceEnum.Unknown];
  }

  private tune(base: number, offsets: number[], order: number, min: number, max: number) {
    return Math.min(Math.max(base + offsets[order % offsets.length], min), max);
  }

  private normalizeTag(tag: string) {
    return tag.replace('_', '-').toLowerCase();
  }

  private primaryTag(tag: string) {
    return this.normalizeTag(tag).split('-')[0];
  }

  private languageTag(language: LanguageEnum) {
    return language === LanguageEnum.Polish ? 'pl-PL' : 'en-GB';
  }

  private deepgramLanguage(language: LanguageEnum) {
    return language === LanguageEnum.Polish ? 'pl' : this.staticConfigService.englishRecognitionTag;
  }

  private recognitionTag(language: LanguageEnum) {
    return language === LanguageEnum.Polish
      ? this.staticConfigService.polishRecognitionTag
      : this.staticConfigService.englishRecognitionTag;
  }
}
