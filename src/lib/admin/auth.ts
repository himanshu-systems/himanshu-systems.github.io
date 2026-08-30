import { supabase } from '../supabaseClient';

export function initAuth(dependencies: {
  loginSection: HTMLElement;
  adminSection: HTMLElement;
  loginForm: HTMLFormElement;
  loginError: HTMLElement;
  whoEl: HTMLElement;
  logoutBtn: HTMLElement;
  loginEmailInput: HTMLInputElement;
  loginPasswordInput: HTMLInputElement;
  loginNotice: HTMLElement;
  forgotBtn: HTMLElement;
  recoverySection: HTMLElement;
  recoveryForm: HTMLFormElement;
  recoveryPassword: HTMLInputElement;
  recoveryError: HTMLElement;
  onLogin: (email: string) => void;
}) {
  const {
    loginSection, adminSection, loginForm, loginError, whoEl, logoutBtn,
    loginEmailInput, loginPasswordInput, loginNotice, forgotBtn,
    recoverySection, recoveryForm, recoveryPassword, recoveryError, onLogin,
  } = dependencies;

  /**
   * True while this page load came from a reset link. supabase-js consumes the
   * #access_token in the URL on startup and fires PASSWORD_RECOVERY, which
   * produces a real session -- so without this flag the recovery visit would
   * fall straight through to the editors and the password would never get set.
   */
  let recovering = false;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    loginNotice.hidden = true;
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmailInput.value,
      password: loginPasswordInput.value,
    });
    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
    }
  });

  forgotBtn.addEventListener('click', async () => {
    loginError.hidden = true;
    loginNotice.hidden = true;

    const email = loginEmailInput.value.trim();
    if (!email) {
      loginError.textContent = 'Enter your email address first, then press this.';
      loginError.hidden = false;
      return;
    }

    // redirectTo is this page, built from the live URL rather than a constant:
    // it keeps working under a base path and on localhost, and it is the whole
    // point -- Supabase's default redirect is the site root, which has no
    // client-side Supabase to consume the token, so the link appears to do
    // nothing. The address must also be listed under Authentication -> URL
    // Configuration -> Redirect URLs, or Supabase falls back to the Site URL.
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
      return;
    }
    loginNotice.textContent = `Sent. Check ${email} and open the link on this device.`;
    loginNotice.hidden = false;
  });

  recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    recoveryError.hidden = true;

    const { error } = await supabase.auth.updateUser({ password: recoveryPassword.value });
    if (error) {
      recoveryError.textContent = error.message;
      recoveryError.hidden = false;
      return;
    }

    recovering = false;
    recoveryPassword.value = '';
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.email) showLoggedIn(data.session.user.email);
    else showLoggedOut();
  });

  logoutBtn.addEventListener('click', () => {
    supabase.auth.signOut();
  });

  function showLoggedOut() {
    loginSection.hidden = false;
    adminSection.hidden = true;
    recoverySection.hidden = true;
  }

  function showLoggedIn(email: string) {
    loginSection.hidden = true;
    recoverySection.hidden = true;
    adminSection.hidden = false;
    whoEl.textContent = email;
    onLogin(email);
  }

  function showRecovery() {
    recovering = true;
    loginSection.hidden = true;
    adminSection.hidden = true;
    recoverySection.hidden = false;
  }

  supabase.auth.getSession().then(({ data }) => {
    if (recovering) return;
    if (data.session?.user.email) showLoggedIn(data.session.user.email);
    else showLoggedOut();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      showRecovery();
      return;
    }
    // Ignore the ordinary SIGNED_IN that accompanies a recovery session --
    // acting on it would skip the password form entirely.
    if (recovering && event !== 'SIGNED_OUT') return;
    if (session?.user.email) showLoggedIn(session.user.email);
    else showLoggedOut();
  });
}
