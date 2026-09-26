import { icon } from './icons.ts';

export const escape = (value: unknown): string => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
export const number = (value: number): string => Math.floor(value).toLocaleString('en');

export function meter(label: string, value: number, maximum = 100, color = 'gold', showNumbers = true): string {
  const percent = Math.min(100, Math.max(0, value / maximum * 100));
  return `<div class="meter-group"><div class="meter-label"><span>${escape(label)}</span>${showNumbers ? `<span>${Math.ceil(value)}<small> / ${maximum}</small></span>` : `<span>${Math.round(percent)}%</span>`}</div><div class="meter ${color}" role="meter" aria-label="${escape(label)}" aria-valuemin="0" aria-valuemax="${maximum}" aria-valuenow="${Math.round(value)}"><i style="width:${percent}%"></i></div></div>`;
}

export function button(label: string, action: string, options: { icon?: string; className?: string; disabled?: boolean; data?: string; title?: string } = {}): string {
  return `<button type="button" class="button ${options.className ?? ''}" data-action="${action}" ${options.data ?? ''}${options.disabled ? ' disabled' : ''}${options.title ? ` title="${escape(options.title)}"` : ''}>${options.icon ? icon(options.icon) : ''}<span>${escape(label)}</span></button>`;
}

export function title(kicker: string, heading: string, description = ''): string {
  return `<div class="page-heading"><div><span class="eyebrow">${escape(kicker)}</span><h1>${escape(heading)}</h1>${description ? `<p>${escape(description)}</p>` : ''}</div></div>`;
}

export function dialog(content: string, options: { label: string; wide?: boolean; close?: boolean } = { label: 'Dialog' }): HTMLDialogElement {
  const element = document.createElement('dialog');
  element.className = options.wide ? 'modal modal-wide' : 'modal';
  element.setAttribute('aria-label', options.label);
  element.innerHTML = `${options.close === false ? '' : `<button type="button" class="icon-button modal-close" aria-label="Close dialog" data-close>${icon('close')}</button>`}${content}`;
  const previousFocus = document.activeElement as HTMLElement | null;
  element.addEventListener('click', event => {
    if ((event.target as HTMLElement).closest('[data-close]')) element.close();
    if (event.target === element && options.close !== false) {
      const rect = element.getBoundingClientRect();
      const pointer = event as MouseEvent;
      if (pointer.clientX < rect.left || pointer.clientX > rect.right || pointer.clientY < rect.top || pointer.clientY > rect.bottom) element.close();
    }
  });
  if (options.close === false) element.addEventListener('cancel', event => event.preventDefault());
  element.addEventListener('close', () => {
    element.remove();
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }, { once: true });
  document.body.append(element);
  element.showModal();
  return element;
}

export function confirm(heading: string, text: string, action = 'Continue'): Promise<boolean> {
  return new Promise(resolve => {
    const element = dialog(`<span class="eyebrow">A moment before you continue</span><h2>${escape(heading)}</h2><p>${escape(text)}</p><div class="dialog-actions">${button('Cancel', 'cancel', { className: 'subtle' })}${button(action, 'confirm', { className: 'primary', icon: 'arrow' })}</div>`, { label: heading });
    let accepted = false;
    element.addEventListener('click', event => {
      const control = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (!control) return;
      accepted = control.dataset.action === 'confirm';
      element.close();
    });
    element.addEventListener('close', () => resolve(accepted), { once: true });
  });
}

export function toast(message: string, kind: 'info' | 'success' | 'error' = 'info'): void {
  let root = document.getElementById('toasts')!;
  const modal = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
  if (modal) {
    let notices = modal.querySelector<HTMLDivElement>('.dialog-notices');
    if (!notices) {
      notices = document.createElement('div');
      notices.className = 'dialog-notices';
      notices.setAttribute('aria-live', 'polite');
      modal.append(notices);
    }
    root = notices;
  }
  const node = document.createElement('div');
  node.className = `toast ${kind}`;
  node.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  node.innerHTML = `${icon(kind === 'success' ? 'check' : kind === 'error' ? 'help' : 'feather')}<span>${escape(message)}</span>`;
  root.append(node);
  setTimeout(() => node.remove(), kind === 'error' ? 8500 : 4500);
}
