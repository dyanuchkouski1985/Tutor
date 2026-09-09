export class Translation {
  id: number;
  userTranslationId: number;
  enabled: boolean;
  position: number;
  value: string;

  constructor(
    id: number,
    userTranslationId: number,
    enabled: boolean,
    position: number,
    value: string,
  ) {
    this.id = id;
    this.userTranslationId = userTranslationId;
    this.enabled = enabled;
    this.position = position;
    this.value = value;
  }

  static swap(translation1: Translation, translation2: Translation): void {
    const id = translation2.id;
    const userTranslationId = translation2.userTranslationId;
    const enabled = translation2.enabled;
    const value = translation2.value;

    translation2.id = translation1.id;
    translation2.userTranslationId = translation1.userTranslationId;
    translation2.enabled = translation1.enabled;
    translation2.value = translation1.value;

    translation1.id = id;
    translation1.userTranslationId = userTranslationId;
    translation1.enabled = enabled;
    translation1.value = value;
  }
}
