interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionEventMap {
  audioend: Event;
  audiostart: Event;
  end: Event;
  error: SpeechRecognitionErrorEvent;
  nomatch: SpeechRecognitionEvent;
  result: SpeechRecognitionEvent;
  soundend: Event;
  soundstart: Event;
  speechend: Event;
  speechstart: Event;
  start: Event;
}

interface SpeechRecognitionPhrase {
  readonly phrase: string;
  readonly boost: number;
}

declare var SpeechRecognitionPhrase: SpeechRecognitionPhraseConstructor | undefined;

interface SpeechRecognitionPhraseConstructor {
  prototype: SpeechRecognitionPhrase;
  new (phrase: string, boost: number): SpeechRecognitionPhrase;
}

interface SpeechRecognitionAvailabilityOptions {
  langs: string[];
  processLocally?: boolean;
}

type SpeechRecognitionAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  phrases?: SpeechRecognitionPhrase[];
  processLocally?: boolean;
  onend: ((this: SpeechRecognition, event: Event) => void) | null;
  onerror: ((this: SpeechRecognition, event: SpeechRecognitionErrorEvent) => void) | null;
  onnomatch: ((this: SpeechRecognition, event: SpeechRecognitionEvent) => void) | null;
  onresult: ((this: SpeechRecognition, event: SpeechRecognitionEvent) => void) | null;
  onstart: ((this: SpeechRecognition, event: Event) => void) | null;
  abort(): void;
  start(): void;
  stop(): void;
  addEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: (this: SpeechRecognition, event: SpeechRecognitionEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: (this: SpeechRecognition, event: SpeechRecognitionEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void;
}

declare var SpeechRecognition: SpeechRecognitionConstructor | undefined;

interface SpeechRecognitionConstructor {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
  available?(options: SpeechRecognitionAvailabilityOptions): Promise<SpeechRecognitionAvailability>;
  install?(options: SpeechRecognitionAvailabilityOptions): Promise<boolean>;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}
