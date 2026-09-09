export class Picture {
  id: number;
  userPictureId: number;
  url: string;
  enabled: boolean;
  position: number;
  file: File;

  constructor(
    id: number,
    userPictureId: number,
    url: string,
    enabled: boolean,
    position: number,
    file: File,
  ) {
    this.id = id;
    this.userPictureId = userPictureId;
    this.url = url;
    this.enabled = enabled;
    this.position = position;
    this.file = file;
  }

  static swap(picture1: Picture, picture2: Picture) {
    const id = picture2.id;
    const userPictureId = picture2.userPictureId;
    const url = picture2.url;
    const enabled = picture2.enabled;
    const file = picture2.file;

    picture2.id = picture1.id;
    picture2.userPictureId = picture1.userPictureId;
    picture2.url = picture1.url;
    picture2.enabled = picture1.enabled;
    picture2.file = picture1.file;

    picture1.id = id;
    picture1.url = url;
    picture1.userPictureId = userPictureId;
    picture1.enabled = enabled;
    picture1.file = file;
  }
}
