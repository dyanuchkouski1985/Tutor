let lockCount = 0;

export function blockBodyScroll() {
  if (lockCount++ === 0) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.setProperty('--ui-scrollbar-width', `${scrollbarWidth}px`);
    document.body.classList.add('ui-overflow-hidden');
  }
}

export function unblockBodyScroll() {
  if (--lockCount === 0) {
    document.body.classList.remove('ui-overflow-hidden');
    document.body.style.removeProperty('--ui-scrollbar-width');
  }
}
