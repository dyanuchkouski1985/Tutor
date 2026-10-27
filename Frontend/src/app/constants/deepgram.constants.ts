export class DeepgramConstants {
  public static LISTEN_URL = 'wss://api.deepgram.com/v1/listen';
  public static CHUNK_MILLISECONDS = 250;
  public static MAX_KEYTERMS = 50;
  public static MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  public static SPEECH_MIME_TYPE = 'audio/mpeg';
  public static SPEECH_CACHE_SIZE = 50;
}
