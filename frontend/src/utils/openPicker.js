/**
 * Attach as onClick on date / datetime-local / time / month / week inputs so the
 * native picker opens when clicking anywhere on the field (not only the icon).
 * Uses HTMLInputElement.showPicker() where supported.
 */
export function openNativeDatePicker(event) {
  const input = event.currentTarget
  if (input.disabled || input.readOnly) return
  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker()
      return
    } catch {
      /* Safari / security restrictions — fall through */
    }
  }
  input.focus()
}
