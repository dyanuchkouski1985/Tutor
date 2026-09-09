export class Usage {
  id: number;
  userUsageId: number;
  enabled: boolean;
  position: number;
  value: string;

  constructor(id: number, userUsageId: number, enabled: boolean, position: number, value: string) {
    this.id = id;
    this.userUsageId = userUsageId;
    this.enabled = enabled;
    this.position = position;
    this.value = value;
  }

  static swap(usage1: Usage, usage2: Usage): void {
    const id = usage2.id;
    const userUsageId = usage2.userUsageId;
    const enabled = usage2.enabled;
    const value = usage2.value;

    usage2.id = usage1.id;
    usage2.userUsageId = usage1.userUsageId;
    usage2.enabled = usage1.enabled;
    usage2.value = usage1.value;

    usage1.id = id;
    usage1.userUsageId = userUsageId;
    usage1.enabled = enabled;
    usage1.value = value;
  }
}
