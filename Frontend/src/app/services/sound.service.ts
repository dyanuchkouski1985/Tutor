import { DynamicConfigService } from './dynamic.config.service';
import { Injectable, NgZone } from '@angular/core';
import { launchSuccessFireworks } from '../core/fireworks';
import { CelebrationService } from './celebration.service';

@Injectable({
  providedIn: 'root',
})
export class SoundService {
  correctSound = new Audio();
  errorSound = new Audio();
  beepSound = new Audio();
  deleteSound = new Audio();
  finishSound = new Audio();
  clockTickingSound = new Audio();
  helpSound = new Audio();

  constructor(
    public readonly dynamicConfigService: DynamicConfigService,
    private readonly ngZone: NgZone,
    private readonly celebrationService: CelebrationService,
  ) {
    this.correctSound.src = '../assets/sounds/correct.mp3';
    this.correctSound.load();
    this.errorSound.src = '../assets/sounds/error.mp3';
    this.errorSound.load();
    this.beepSound.src = '../assets/sounds/beep.mp3';
    this.beepSound.load();
    this.deleteSound.src = '../assets/sounds/delete.mp3';
    this.deleteSound.load();
    this.clockTickingSound.src = '../assets/sounds/clock-ticking.mp3';
    this.clockTickingSound.load();
    this.finishSound.src = '../assets/sounds/finish.mp3';
    this.finishSound.load();
    this.helpSound.src = '../assets/sounds/help.mp3';
    this.helpSound.load();
  }

  correct() {
    !this.dynamicConfigService.muteSound && this.correctSound.play();
  }

  beep() {
    !this.dynamicConfigService.muteSound && this.beepSound.play();
  }

  delete() {
    !this.dynamicConfigService.muteSound && this.deleteSound.play();
  }

  clockTicking() {
    !this.dynamicConfigService.muteSound && this.clockTickingSound.play();
  }

  clockTickingReset() {
    this.clockTickingSound.pause();
    this.clockTickingSound.currentTime = 0;
  }

  finish() {
    !this.dynamicConfigService.muteSound && this.finishSound.play();
    this.celebrationService.nudge();
  }

  error() {
    !this.dynamicConfigService.muteSound && this.errorSound.play();
  }

  celebrate() {
    this.ngZone.runOutsideAngular(() =>
      launchSuccessFireworks(!this.dynamicConfigService.muteSound),
    );
    this.celebrationService.nudge();
  }

  help() {
    !this.dynamicConfigService.muteSound && this.helpSound.play();
  }
}
