/* ==========================================================================
   PLAY SCHOOL — Staff sign-in logic
   Standalone demo authentication: no backend exists in this static project,
   so this implements an isolated, clearly-marked demo auth flow. Swap
   DEMO_USERS + the submit handler's credential check for a real auth
   service call when one exists; lockout here is demonstration-level only —
   a real deployment must also enforce attempt limits server-side.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  const params = new URLSearchParams(window.location.search);

  /* ---------- Configuration (integration point) ----------
     Keep school branding / Enterprise status / school status / demo users
     here rather than scattered through markup. ?enterprise=1 and
     ?status=suspended are demo-only overrides for exercising those states
     without hardcoding the page into them. */
  const SCHOOL_CONFIG = {
    name: 'Play School',
    isEnterprise: params.get('enterprise') === '1',
    status: params.get('status') === 'suspended' ? 'suspended' : 'active',
  };

  // Demo credentials — development/demo only, never real secrets.
  // director@playschool.edu / Director!2026   -> returning user -> S04
  // newteacher@playschool.edu / Welcome!2026  -> first-time user -> S03
  const DEMO_USERS = [
    { match: 'director@playschool.edu', password: 'Director!2026', firstTime: false },
    { match: 'newteacher@playschool.edu', password: 'Welcome!2026', firstTime: true },
  ];

  // S03/S04 are not implemented in this independently-deployed project.
  // This map is the integration point — point these at the real routes
  // once they exist instead of the fallback pages below.
  const ROUTES = { s03: 'onboarding.html', s04: 'dashboard.html' };

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;
  const ATTEMPTS_KEY = 'ps_signin_attempts';
  const LOCKOUT_KEY = 'ps_signin_lockout_until';
  const LANG_KEY = 'ps_signin_lang';

  // Flags are factual national symbols, not theme chrome — their colors are
  // deliberately the real flag colors rather than design tokens.
  const FLAG_GB = '<svg viewBox="0 0 20 14" width="20" height="14"><rect width="20" height="14" fill="#00247d"/><path d="M0 0L20 14M20 0L0 14" stroke="#fff" stroke-width="2.8"/><path d="M0 0L20 14M20 0L0 14" stroke="#cf142b" stroke-width="1.2"/><path d="M10 0V14M0 7H20" stroke="#fff" stroke-width="4.6"/><path d="M10 0V14M0 7H20" stroke="#cf142b" stroke-width="2.2"/></svg>';
  const FLAG_SA = '<svg viewBox="0 0 20 14" width="20" height="14"><rect width="20" height="14" fill="#006c35"/><rect x="3" y="9.3" width="11" height="1.4" rx="0.7" fill="#fff"/><polygon points="14,8.1 16.8,10 14,11.9" fill="#fff"/></svg>';
  const FLAG_IN = '<svg viewBox="0 0 20 14" width="20" height="14"><rect width="20" height="4.67" fill="#ff9933"/><rect width="20" height="4.67" y="4.67" fill="#fff"/><rect width="20" height="4.67" y="9.33" fill="#138808"/><circle cx="10" cy="7" r="1.6" fill="none" stroke="#000080" stroke-width="0.4"/><circle cx="10" cy="7" r="0.3" fill="#000080"/></svg>';
  const FLAGS = { en: FLAG_GB, ar: FLAG_SA, hi: FLAG_IN, ta: FLAG_IN, ml: FLAG_IN };

  const EYE_ICON = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>';
  const EYE_OFF_ICON = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

  const STRINGS = {
    en: {
      dir: 'ltr', selfName: 'English',
      eyebrow: 'Staff sign-in',
      heading: 'Welcome back',
      subtitle: (name) => `Sign in to ${name}`,
      tagline: 'Every child, every day, in one place.',
      emailLabel: 'Email or phone',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      rememberMe: 'Remember me',
      forgotPassword: 'Forgot password?',
      signIn: 'Sign in',
      signingIn: 'Signing in…',
      or: 'or',
      ssoButton: 'Sign in with SSO',
      ssoUnavailable: "SSO sign-in isn't connected in this demo yet.",
      errorRequired: 'This field is required.',
      errorEmail: 'Enter a valid email or phone number.',
      errorCredentials: 'Email or password is incorrect',
      lockoutMessage: 'Too many attempts. Try again in',
      suspended: 'This school account is paused. Contact your administrator.',
      privacy: 'Privacy',
      help: 'Help',
    },
    ar: {
      dir: 'rtl', selfName: 'العربية',
      eyebrow: 'تسجيل دخول الموظفين',
      heading: 'مرحبًا بعودتك',
      subtitle: (name) => `سجّل الدخول إلى ${name}`,
      tagline: 'كل طفل، كل يوم، في مكان واحد.',
      emailLabel: 'البريد الإلكتروني أو رقم الهاتف',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'كلمة المرور',
      passwordPlaceholder: 'أدخل كلمة المرور',
      showPassword: 'إظهار كلمة المرور',
      hidePassword: 'إخفاء كلمة المرور',
      rememberMe: 'تذكرني',
      forgotPassword: 'هل نسيت كلمة المرور؟',
      signIn: 'تسجيل الدخول',
      signingIn: 'جارٍ تسجيل الدخول…',
      or: 'أو',
      ssoButton: 'تسجيل الدخول عبر SSO',
      ssoUnavailable: 'تسجيل الدخول عبر SSO غير مفعّل في هذا العرض التجريبي.',
      errorRequired: 'هذا الحقل مطلوب.',
      errorEmail: 'يرجى إدخال بريد إلكتروني أو رقم هاتف صالح.',
      errorCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      lockoutMessage: 'محاولات كثيرة جدًا. حاول مرة أخرى خلال',
      suspended: 'تم إيقاف حساب هذه المدرسة مؤقتًا. يرجى التواصل مع المسؤول.',
      privacy: 'الخصوصية',
      help: 'المساعدة',
    },
    hi: {
      dir: 'ltr', selfName: 'हिन्दी',
      eyebrow: 'स्टाफ़ साइन-इन',
      heading: 'वापसी पर स्वागत है',
      subtitle: (name) => `${name} में साइन इन करें`,
      tagline: 'हर बच्चा, हर दिन, एक ही जगह पर।',
      emailLabel: 'ईमेल या फ़ोन नंबर',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'पासवर्ड',
      passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
      showPassword: 'पासवर्ड दिखाएं',
      hidePassword: 'पासवर्ड छिपाएं',
      rememberMe: 'मुझे याद रखें',
      forgotPassword: 'पासवर्ड भूल गए?',
      signIn: 'साइन इन करें',
      signingIn: 'साइन इन हो रहा है…',
      or: 'या',
      ssoButton: 'SSO से साइन इन करें',
      ssoUnavailable: 'इस डेमो में SSO साइन-इन अभी कनेक्ट नहीं है।',
      errorRequired: 'यह फ़ील्ड आवश्यक है।',
      errorEmail: 'कृपया मान्य ईमेल या फ़ोन नंबर दर्ज करें।',
      errorCredentials: 'ईमेल या पासवर्ड ग़लत है',
      lockoutMessage: 'बहुत अधिक प्रयास। पुनः प्रयास करें',
      suspended: 'यह स्कूल खाता अस्थायी रूप से रोका गया है। कृपया अपने व्यवस्थापक से संपर्क करें।',
      privacy: 'गोपनीयता',
      help: 'सहायता',
    },
    ta: {
      dir: 'ltr', selfName: 'தமிழ்',
      eyebrow: 'பணியாளர் உள்நுழைவு',
      heading: 'மீண்டும் வரவேற்கிறோம்',
      subtitle: (name) => `${name} இல் உள்நுழையவும்`,
      tagline: 'ஒவ்வொரு குழந்தையும், ஒவ்வொரு நாளும், ஒரே இடத்தில்.',
      emailLabel: 'மின்னஞ்சல் அல்லது தொலைபேசி எண்',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'கடவுச்சொல்',
      passwordPlaceholder: 'உங்கள் கடவுச்சொல்லை உள்ளிடவும்',
      showPassword: 'கடவுச்சொல்லைக் காட்டு',
      hidePassword: 'கடவுச்சொல்லை மறை',
      rememberMe: 'என்னை நினைவில் கொள்',
      forgotPassword: 'கடவுச்சொல் மறந்துவிட்டதா?',
      signIn: 'உள்நுழைக',
      signingIn: 'உள்நுழைகிறது…',
      or: 'அல்லது',
      ssoButton: 'SSO மூலம் உள்நுழைக',
      ssoUnavailable: 'இந்த டெமோவில் SSO உள்நுழைவு இணைக்கப்படவில்லை.',
      errorRequired: 'இந்த புலம் தேவை.',
      errorEmail: 'சரியான மின்னஞ்சல் அல்லது தொலைபேசி எண்ணை உள்ளிடவும்.',
      errorCredentials: 'மின்னஞ்சல் அல்லது கடவுச்சொல் தவறானது',
      lockoutMessage: 'அதிக முயற்சிகள். மீண்டும் முயற்சிக்கவும்',
      suspended: 'இந்த பள்ளி கணக்கு இடைநிறுத்தப்பட்டுள்ளது. உங்கள் நிர்வாகியைத் தொடர்பு கொள்ளவும்.',
      privacy: 'தனியுரிமை',
      help: 'உதவி',
    },
    ml: {
      dir: 'ltr', selfName: 'മലയാളം',
      eyebrow: 'സ്റ്റാഫ് സൈൻ-ഇൻ',
      heading: 'തിരികെ സ്വാഗതം',
      subtitle: (name) => `${name} ലേക്ക് സൈൻ ഇൻ ചെയ്യുക`,
      tagline: 'എല്ലാ കുട്ടിയും, എല്ലാ ദിവസവും, ഒരിടത്ത്.',
      emailLabel: 'ഇമെയിൽ അല്ലെങ്കിൽ ഫോൺ നമ്പർ',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'പാസ്‌വേഡ്',
      passwordPlaceholder: 'നിങ്ങളുടെ പാസ്‌വേഡ് നൽകുക',
      showPassword: 'പാസ്‌വേഡ് കാണിക്കുക',
      hidePassword: 'പാസ്‌വേഡ് മറയ്ക്കുക',
      rememberMe: 'എന്നെ ഓർമ്മിക്കുക',
      forgotPassword: 'പാസ്‌വേഡ് മറന്നോ?',
      signIn: 'സൈൻ ഇൻ ചെയ്യുക',
      signingIn: 'സൈൻ ഇൻ ചെയ്യുന്നു…',
      or: 'അല്ലെങ്കിൽ',
      ssoButton: 'SSO വഴി സൈൻ ഇൻ ചെയ്യുക',
      ssoUnavailable: 'ഈ ഡെമോയിൽ SSO സൈൻ-ഇൻ ബന്ധിപ്പിച്ചിട്ടില്ല.',
      errorRequired: 'ഈ ഫീൽഡ് ആവശ്യമാണ്.',
      errorEmail: 'സാധുവായ ഇമെയിൽ അല്ലെങ്കിൽ ഫോൺ നമ്പർ നൽകുക.',
      errorCredentials: 'ഇമെയിൽ അല്ലെങ്കിൽ പാസ്‌വേഡ് തെറ്റാണ്',
      lockoutMessage: 'വളരെയധികം ശ്രമങ്ങൾ. വീണ്ടും ശ്രമിക്കുക',
      suspended: 'ഈ സ്കൂൾ അക്കൗണ്ട് താൽക്കാലികമായി നിർത്തിവച്ചിരിക്കുന്നു. നിങ്ങളുടെ അഡ്മിനിസ്ട്രേറ്ററെ ബന്ധപ്പെടുക.',
      privacy: 'സ്വകാര്യത',
      help: 'സഹായം',
    },
  };

  let lang = 'en';
  try { lang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { /* storage unavailable */ }
  if (!STRINGS[lang]) lang = 'en';

  let isSubmitting = false;
  let countdownTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    document.querySelectorAll('.signin-flag[data-flag]').forEach((el) => {
      el.innerHTML = FLAGS[el.dataset.flag] || '';
    });
    applyLanguage(lang);
    renderSso();
    wirePasswordToggle();
    wireLangDropdown();
    wireForm();
    resumeLockoutIfAny();

    // Pre-fill after a password reset (S02) hands back ?email=
    const prefillEmail = params.get('email');
    if (prefillEmail) {
      $('signinEmail').value = prefillEmail;
      $('signinPassword').focus();
    }
  }

  /* ---------- i18n / RTL ---------- */
  function applyLanguage(nextLang) {
    lang = STRINGS[nextLang] ? nextLang : 'en';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* storage unavailable */ }
    const d = STRINGS[lang];

    document.documentElement.lang = lang;
    document.documentElement.dir = d.dir;

    $('signinEyebrow').textContent = d.eyebrow;
    $('signinHeading').textContent = d.heading;
    $('signinSubtitle').textContent = d.subtitle(SCHOOL_CONFIG.name);
    $('signinTagline').textContent = d.tagline;
    $('signinEmailLabel').textContent = d.emailLabel;
    $('signinEmail').placeholder = d.emailPlaceholder;
    $('signinPasswordLabel').textContent = d.passwordLabel;
    $('signinPassword').placeholder = d.passwordPlaceholder;
    $('signinRememberLabel').textContent = d.rememberMe;
    $('signinForgot').textContent = d.forgotPassword;
    $('signinSubmitLabel').textContent = isSubmitting ? d.signingIn : d.signIn;
    $('signinOrText').textContent = d.or;
    $('signinSsoBtn').textContent = d.ssoButton;
    $('signinPrivacyLink').textContent = d.privacy;
    $('signinHelpLink').textContent = d.help;
    $('signinLangFlag').innerHTML = FLAGS[lang] || '';
    $('signinLangName').textContent = d.selfName;

    updatePasswordToggleLabel();
    renderSuspended();

    if (!$('signinErrorAlert').hidden) $('signinErrorText').textContent = d.errorCredentials;
    $('signinLockoutText').textContent = d.lockoutMessage;

    document.querySelectorAll('#signinLangPopover [data-lang]').forEach((btn) => {
      btn.setAttribute('aria-current', btn.dataset.lang === lang ? 'true' : 'false');
    });
  }

  /* ---------- Suspended-school state ---------- */
  function renderSuspended() {
    const notice = $('signinSuspendedNotice');
    const suspended = SCHOOL_CONFIG.status === 'suspended';
    notice.hidden = !suspended;
    if (suspended) {
      $('signinSuspendedText').textContent = STRINGS[lang].suspended;
      setFormDisabled(true);
    } else if (!isLockedOut()) {
      setFormDisabled(false);
    }
  }

  /* ---------- Enterprise SSO ---------- */
  function renderSso() {
    $('signinSsoBlock').hidden = !SCHOOL_CONFIG.isEnterprise;
    $('signinSsoBtn').addEventListener('click', () => {
      // Integration point: wire this to the real SSO/identity-provider flow
      // when one exists. Never claim success without it.
      showToast('info', STRINGS[lang].ssoUnavailable);
    });
  }

  /* ---------- Password visibility ---------- */
  function wirePasswordToggle() {
    const btn = $('signinPasswordToggle');
    const input = $('signinPassword');
    btn.addEventListener('click', () => {
      const willShow = input.type === 'password';
      input.type = willShow ? 'text' : 'password';
      btn.setAttribute('aria-pressed', String(willShow));
      $('signinEyeIcon').innerHTML = willShow ? EYE_OFF_ICON : EYE_ICON;
      btn.setAttribute('aria-label', willShow ? STRINGS[lang].hidePassword : STRINGS[lang].showPassword);
    });
  }
  function updatePasswordToggleLabel() {
    const showing = $('signinPassword').type === 'text';
    $('signinPasswordToggle').setAttribute('aria-label', showing ? STRINGS[lang].hidePassword : STRINGS[lang].showPassword);
  }

  /* ---------- Language dropdown ---------- */
  function wireLangDropdown() {
    const wrap = $('signinLangPopover');
    const trigger = $('signinLangTrigger');

    function close() {
      wrap.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !wrap.classList.contains('is-open');
      wrap.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
    });
    wrap.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => { applyLanguage(btn.dataset.lang); close(); });
    });
    document.addEventListener('click', close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------- Validation ---------- */
  function isValidEmailOrPhone(value) {
    const v = value.trim();
    if (!v) return false;
    if (v.indexOf('@') !== -1) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    return /^[+\d][\d\s-]{6,}$/.test(v);
  }

  /* ---------- Lockout (demo-level; persisted so a refresh can't bypass it) ---------- */
  function getAttempts() {
    try { return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function setAttempts(n) {
    try { localStorage.setItem(ATTEMPTS_KEY, String(n)); } catch (e) { /* storage unavailable */ }
  }
  function getLockoutUntil() {
    try { return parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10) || 0; } catch (e) { return 0; }
  }
  function setLockoutUntil(ts) {
    try { localStorage.setItem(LOCKOUT_KEY, String(ts)); } catch (e) { /* storage unavailable */ }
  }
  function isLockedOut() { return getLockoutUntil() > Date.now(); }

  function resumeLockoutIfAny() {
    if (isLockedOut()) startCountdown();
  }

  function registerFailedAttempt() {
    const attempts = getAttempts() + 1;
    setAttempts(attempts);
    if (attempts >= MAX_ATTEMPTS) {
      setLockoutUntil(Date.now() + LOCKOUT_MS);
      startCountdown();
    }
  }

  function clearLockoutState() {
    setAttempts(0);
    setLockoutUntil(0);
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    $('signinLockoutAlert').hidden = true;
  }

  function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    setFormDisabled(true);
    $('signinErrorAlert').hidden = true;
    $('signinLockoutAlert').hidden = false;
    $('signinLockoutText').textContent = STRINGS[lang].lockoutMessage;

    function tick() {
      const remaining = getLockoutUntil() - Date.now();
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        clearLockoutState();
        if (SCHOOL_CONFIG.status !== 'suspended') setFormDisabled(false);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      $('signinLockoutTimer').textContent = mins + ':' + String(secs).padStart(2, '0');
    }
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  /* ---------- Form state helpers ---------- */
  function setFormDisabled(disabled) {
    $('signinEmail').disabled = disabled;
    $('signinPassword').disabled = disabled;
    $('signinSubmit').disabled = disabled;
  }
  function setFieldError(inputId, errorId, message) {
    const errorEl = $(errorId);
    if (message) { errorEl.textContent = message; errorEl.hidden = false; $(inputId).closest('.field').classList.add('is-error'); }
    else { errorEl.hidden = true; $(inputId).closest('.field').classList.remove('is-error'); }
  }

  /* ---------- Submit ---------- */
  function wireForm() {
    $('signinForm').addEventListener('submit', (e) => {
      e.preventDefault();
      if (isSubmitting || isLockedOut() || SCHOOL_CONFIG.status === 'suspended') return;

      const d = STRINGS[lang];
      const emailInput = $('signinEmail');
      const passwordInput = $('signinPassword');
      const emailVal = emailInput.value;
      const passwordVal = passwordInput.value;

      let valid = true;
      if (!emailVal.trim()) { setFieldError('signinEmail', 'signinEmailError', d.errorRequired); valid = false; }
      else if (!isValidEmailOrPhone(emailVal)) { setFieldError('signinEmail', 'signinEmailError', d.errorEmail); valid = false; }
      else setFieldError('signinEmail', 'signinEmailError', null);

      if (!passwordVal) { setFieldError('signinPassword', 'signinPasswordError', d.errorRequired); valid = false; }
      else setFieldError('signinPassword', 'signinPasswordError', null);

      if (!valid) return;

      $('signinErrorAlert').hidden = true;
      beginSubmit();

      window.setTimeout(() => {
        const match = DEMO_USERS.find((u) =>
          u.match.toLowerCase() === emailVal.trim().toLowerCase() && u.password === passwordVal
        );

        if (match) {
          clearLockoutState();
          if (window.PlayShell) window.PlayShell.login();
          window.location.href = match.firstTime ? ROUTES.s03 : ROUTES.s04;
          return;
        }

        endSubmit();
        passwordInput.value = '';
        $('signinErrorText').textContent = d.errorCredentials;
        $('signinErrorAlert').hidden = false;
        registerFailedAttempt();
      }, 950);
    });
  }

  function beginSubmit() {
    isSubmitting = true;
    const btn = $('signinSubmit');
    btn.classList.add('is-loading');
    btn.disabled = true;
    $('signinSubmitLabel').textContent = STRINGS[lang].signingIn;
  }
  function endSubmit() {
    isSubmitting = false;
    const btn = $('signinSubmit');
    btn.classList.remove('is-loading');
    btn.disabled = isLockedOut() || SCHOOL_CONFIG.status === 'suspended';
    $('signinSubmitLabel').textContent = STRINGS[lang].signIn;
  }

  /* ---------- Toast (self-contained; this page has no app shell loaded) ---------- */
  function showToast(type, title) {
    const region = $('signinToastRegion');
    const icons = { success: '&#10003;', error: '&#9888;', warning: '&#9888;', info: '&#9432;' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span><div class="toast__title"></div></span><span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>`;
    el.querySelector('.toast__title').textContent = title;
    region.appendChild(el);
    const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 220); };
    const timer = setTimeout(remove, 4500);
    const closeBtn = el.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => { clearTimeout(timer); remove(); });
    closeBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearTimeout(timer); remove(); } });
  }
})();
