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
  onLogin: (email: string) => void;
}) {
  const { loginSection, adminSection, loginForm, loginError, whoEl, logoutBtn, loginEmailInput, loginPasswordInput, onLogin } = dependencies;

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
    }
  });

  logoutBtn.addEventListener('click', () => {
    supabase.auth.signOut();
  });

  function showLoggedOut() {
    loginSection.hidden = false;
    adminSection.hidden = true;
  }

  function showLoggedIn(email: string) {
    loginSection.hidden = true;
    adminSection.hidden = false;
    whoEl.textContent = email;
    onLogin(email);
  }

  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.user.email) showLoggedIn(data.session.user.email);
    else showLoggedOut();
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user.email) showLoggedIn(session.user.email);
    else showLoggedOut();
  });
}
