import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from 'angular-svg-icon';
import { PopoverComponent } from '../../ui/popover';
import { TooltipDirective } from '../../ui/tooltip';
import { FormsModule } from '@angular/forms';
import { SelectButtonComponent } from '../../ui/select-button';
import { primaryColorNames, surfaces, ThemeService } from '../../ui/theme/theme.service';

@Component({
  selector: 'app-theme-switcher',
  imports: [
    CommonModule,
    FormsModule,
    PopoverComponent,
    TooltipDirective,
    SvgIconComponent,
    SelectButtonComponent,
  ],
  templateUrl: './theme-switcher.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './theme-switcher.scss',
})
export class ThemeSwitcher {
  readonly primaryColors = primaryColorNames;
  readonly surfaces = surfaces;
  readonly modeOptions = [
    { label: 'Light', value: false },
    { label: 'Dark', value: true },
  ];

  selectedPrimaryColor = computed(() => this.themeService.state().primary);
  selectedSurfaceColor = computed(() => this.themeService.state().surface);
  isDark = computed(() => this.themeService.state().dark);

  constructor(private readonly themeService: ThemeService) {}

  setDark(dark: boolean) {
    this.themeService.setDark(dark);
  }

  updateColors(type: 'primary' | 'surface', name: string) {
    this.themeService.set(type, name);
  }
}
