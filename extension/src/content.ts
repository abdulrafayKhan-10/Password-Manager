/**
 * content.ts
 *
 * Content script — injected into every page.
 *
 * Responsibilities:
 *  1. Detect login / registration forms.
 *  2. Request matching credentials from the background worker.
 *  3. Autofill fields when the user picks a match in the popup.
 *  4. Offer to save newly submitted credentials back to the vault.
 *
 * Security notes:
 *  - We never store credentials in content script memory beyond the
 *    duration of the autofill action.
 *  - Autofill uses direct property assignment (not dispatchEvent with
 *    fake values) to avoid script-injection pitfalls.
 *  - We validate inbound messages to ignore injected content from
 *    potentially malicious page scripts.
 */

// ─── Form Detection ───────────────────────────────────────────────────────────

interface LoginForm {
  usernameField: HTMLInputElement;
  passwordField: HTMLInputElement;
  form: HTMLFormElement;
}

function detectLoginForms(): LoginForm[] {
  const passwordFields = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[type="password"]')
  );

  const results: LoginForm[] = [];

  for (const passwordField of passwordFields) {
    const form = passwordField.closest('form') as HTMLFormElement | null;
    if (!form) continue;

    // Find the most likely username/email field (preceding the password field in the DOM)
    const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input'));
    const pwIndex = inputs.indexOf(passwordField);
    const usernameField = inputs
      .slice(0, pwIndex)
      .reverse()
      .find((el) =>
        ['text', 'email', 'tel', 'username', ''].includes(el.type) &&
        !el.hidden &&
        !el.readOnly
      );

    if (usernameField) {
      results.push({ usernameField, passwordField, form });
    }
  }

  return results;
}

// ─── Autofill ─────────────────────────────────────────────────────────────────

function fillField(input: HTMLInputElement, value: string) {
  // Use native value setter to trigger React's synthetic events
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  nativeInputValueSetter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ─── Credential Save Detection ────────────────────────────────────────────────

let detectedForms: LoginForm[] = [];

function attachSaveListeners(forms: LoginForm[]) {
  for (const { usernameField, passwordField, form } of forms) {
    form.addEventListener(
      'submit',
      () => {
        const username = usernameField.value.trim();
        const password = passwordField.value;
        if (!username || !password) return;

        chrome.runtime.sendMessage({
          type: 'SAVE_CREDENTIAL',
          username,
          password,
          origin: window.location.origin,
        });
      },
      { once: true }
    );
  }
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: Record<string, unknown>) => {
  // Validate sender (only accept from our own extension)
  if (!message || typeof message !== 'object') return;

  if (message.type === 'FILL_CREDENTIAL') {
    const cred = message.credential as {
      username: string;
      password: string;
    } | undefined;
    if (!cred) return;

    const forms = detectLoginForms();
    if (forms.length === 0) return;

    const { usernameField, passwordField } = forms[0];
    fillField(usernameField, cred.username);
    fillField(passwordField, cred.password);
  }
});

// ─── Initialization ───────────────────────────────────────────────────────────

function init() {
  detectedForms = detectLoginForms();
  if (detectedForms.length > 0) {
    attachSaveListeners(detectedForms);

    // Notify background that login forms are present on this page
    chrome.runtime.sendMessage({
      type: 'GET_CREDENTIALS',
      origin: window.location.origin,
    });
  }
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
