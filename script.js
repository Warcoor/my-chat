const API_URL = "https://mychat-backend-gnp6.onrender.com";

const POLL_ACTIVE_MS = 1000;
const POLL_IDLE_MS = 3000;
const TYPING_THROTTLE_MS = 1500;
const TOKEN_KEY = "mychat_token";
const THEME_KEY = "mychat_theme";
const LANG_KEY = "mychat_lang";

// ------------------------------------------------------------ Переводы
const I18N = {
  ru: {
    "auth.subtitle": "Войдите или создайте аккаунт",
    "auth.login": "Логин",
    "auth.password": "Пароль",
    "auth.hint": "Логин: 3–20 символов, латиница, цифры и «_». Пароль: от 6 символов, минимум одна буква и одна цифра.",
    "auth.signin": "Войти",
    "auth.signup": "Зарегистрироваться",
    "nav.chats": "Чаты",
    "nav.contacts": "Контакты",
    "nav.settings": "Настройки",
    "nav.profile": "Профиль",
    "chats.search": "Поиск по сообщениям",
    "chats.add": "Добавить чат",
    "chats.empty": "Выберите чат слева или добавьте новый",
    "chats.message": "Сообщение",
    "chats.send": "Отправить",
    "chats.noMessages": "Сообщений пока нет. Напишите первым!",
    "chats.noneYet": "Чатов пока нет. Нажмите «Добавить чат», чтобы найти человека по логину или создать группу.",
    "chats.you": "Вы",
    "chats.typingOne": "печатает…",
    "chats.typingNamed": "{name} печатает…",
    "chats.typingMany": "{n} человека печатают…",
    "chats.privateChat": "Личный чат",
    "chats.membersCount": "Участников: {n}",
    "chats.retry": "Не отправлено, нажмите, чтобы повторить",
    "chats.sending": "отправка…",
    "contacts.add": "Добавить контакт",
    "contacts.empty": "В контактах пока никого. Нажмите «Добавить контакт».",
    "contacts.online": "в сети",
    "add.title": "Добавить чат",
    "add.startChat": "Добавить чат",
    "add.startChatDesc": "По логину или из ваших контактов",
    "add.group": "Создать группу",
    "add.groupDesc": "Выбрать людей из ваших контактов",
    "add.cancel": "Отмена",
    "add.back": "Назад",
    "add.loginPlaceholder": "Логин человека",
    "add.submit": "Добавить",
    "add.startChatTitle": "Новый чат",
    "add.orFromContacts": "Или выберите из контактов",
    "add.groupTitle": "Новая группа",
    "add.groupNamePlaceholder": "Название группы",
    "add.membersHint": "Участники из ваших контактов:",
    "add.create": "Создать",
    "add.noContacts": "В контактах пока никого. Сначала добавьте людей через «Добавить контакт».",
    "add.contactTitle": "Добавить контакт",
    "err.enterLogin": "Введите логин",
    "err.enterGroupName": "Введите название группы",
    "err.selectMember": "Выберите хотя бы одного участника",
    "profile.title": "Профиль",
    "profile.name": "Отображаемое имя",
    "profile.namePlaceholder": "Как вас видят другие",
    "profile.bio": "О себе",
    "profile.bioPlaceholder": "Пара слов о себе",
    "profile.save": "Сохранить",
    "profile.uploadPhoto": "Загрузить фото",
    "profile.removePhoto": "Удалить фото",
    "profile.login": "Логин: @{login}",
    "profile.saved": "Профиль обновлён",
    "settings.title": "Настройки",
    "settings.theme": "Тема оформления",
    "settings.language": "Язык интерфейса",
    "settings.theme.light": "Светлая",
    "settings.theme.dark": "Тёмная",
    "settings.theme.neon": "Неон",
    "settings.logout": "Выйти из аккаунта",
    "status.online": "в сети",
    "status.justNow": "был(а) в сети только что",
    "status.minAgo": "был(а) в сети {n} мин. назад",
    "status.hoursAgo": "был(а) в сети {n} ч. назад",
    "status.daysAgo": "был(а) в сети {n} дн. назад",
    "status.longAgo": "давно не был(а) в сети",
    "info.title": "Информация",
    "info.close": "Закрыть",
    "err.network": "Не удалось связаться с сервером",
    "err.generic": "Ошибка запроса",
    "chats.search": "Поиск чатов",
    "chats.noResults": "Ничего не найдено",
    "pin.label": "Закреплено",
    "attach.ready": "Фото готово к отправке",
    "attach.tooLarge": "Изображение слишком большое (максимум 2 МБ)",
    "attach.invalid": "Не удалось обработать изображение",
    "msg.deleted": "Сообщение удалено",
    "msg.you": "Вы",
    "menu.reply": "Ответить",
    "menu.react": "Реакция",
    "menu.pin": "Закрепить",
    "menu.unpin": "Открепить",
    "menu.edit": "Изменить",
    "menu.delete": "Удалить",
    "menu.copy": "Копировать",
    "menu.copied": "Скопировано",
    "edit.placeholder": "Изменить сообщение",
    "edit.save": "Сохранить",
    "edit.cancel": "Отмена",
    "edit.edited": "изменено",
    "delete.confirm": "Удалить это сообщение?",
    "receipts.title": "Кто видел",
    "receipts.read": "прочитано {time}",
    "receipts.delivered": "доставлено {time}",
    "receipts.pending": "ещё не доставлено",
    "status.image": "Фото",
  },
  en: {
    "auth.subtitle": "Sign in or create an account",
    "auth.login": "Username",
    "auth.password": "Password",
    "auth.hint": "Username: 3–20 characters, Latin letters, digits and \"_\". Password: 6+ characters, at least one letter and one digit.",
    "auth.signin": "Sign in",
    "auth.signup": "Create account",
    "nav.chats": "Chats",
    "nav.contacts": "Contacts",
    "nav.settings": "Settings",
    "nav.profile": "Profile",
    "chats.search": "Search messages",
    "chats.add": "Add chat",
    "chats.empty": "Select a chat on the left or add a new one",
    "chats.message": "Message",
    "chats.send": "Send",
    "chats.noMessages": "No messages yet. Say hi!",
    "chats.noneYet": "No chats yet. Tap \"Add chat\" to find someone by username or create a group.",
    "chats.you": "You",
    "chats.typingOne": "typing…",
    "chats.typingNamed": "{name} is typing…",
    "chats.typingMany": "{n} people are typing…",
    "chats.privateChat": "Private chat",
    "chats.membersCount": "Members: {n}",
    "chats.retry": "Not sent, tap to retry",
    "chats.sending": "sending…",
    "contacts.add": "Add contact",
    "contacts.empty": "No contacts yet. Tap \"Add contact\".",
    "contacts.online": "online",
    "add.title": "Add chat",
    "add.startChat": "Add chat",
    "add.startChatDesc": "By username or from your contacts",
    "add.group": "Create group",
    "add.groupDesc": "Pick people from your contacts",
    "add.cancel": "Cancel",
    "add.back": "Back",
    "add.loginPlaceholder": "Person's username",
    "add.submit": "Add",
    "add.startChatTitle": "New chat",
    "add.orFromContacts": "Or pick from your contacts",
    "add.groupTitle": "New group",
    "add.groupNamePlaceholder": "Group name",
    "add.membersHint": "Members from your contacts:",
    "add.create": "Create",
    "add.noContacts": "No contacts yet. Add people first via \"Add contact\".",
    "add.contactTitle": "Add contact",
    "err.enterLogin": "Enter a username",
    "err.enterGroupName": "Enter a group name",
    "err.selectMember": "Select at least one member",
    "profile.title": "Profile",
    "profile.name": "Display name",
    "profile.namePlaceholder": "How others see you",
    "profile.bio": "About",
    "profile.bioPlaceholder": "A few words about you",
    "profile.save": "Save",
    "profile.uploadPhoto": "Upload photo",
    "profile.removePhoto": "Remove photo",
    "profile.login": "Username: @{login}",
    "profile.saved": "Profile updated",
    "settings.title": "Settings",
    "settings.theme": "Appearance",
    "settings.language": "Language",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.theme.neon": "Neon",
    "settings.logout": "Log out",
    "status.online": "online",
    "status.justNow": "last seen just now",
    "status.minAgo": "last seen {n} min ago",
    "status.hoursAgo": "last seen {n}h ago",
    "status.daysAgo": "last seen {n}d ago",
    "status.longAgo": "last seen a while ago",
    "info.title": "Info",
    "info.close": "Close",
    "err.network": "Couldn't reach the server",
    "err.generic": "Request error",
    "chats.search": "Search chats",
    "chats.noResults": "No matches",
    "pin.label": "Pinned",
    "attach.ready": "Photo ready to send",
    "attach.tooLarge": "Image is too large (max 2 MB)",
    "attach.invalid": "Couldn't process the image",
    "msg.deleted": "Message deleted",
    "msg.you": "You",
    "menu.reply": "Reply",
    "menu.react": "React",
    "menu.pin": "Pin",
    "menu.unpin": "Unpin",
    "menu.edit": "Edit",
    "menu.delete": "Delete",
    "menu.copy": "Copy",
    "menu.copied": "Copied",
    "edit.placeholder": "Edit message",
    "edit.save": "Save",
    "edit.cancel": "Cancel",
    "edit.edited": "edited",
    "delete.confirm": "Delete this message?",
    "receipts.title": "Seen by",
    "receipts.read": "read {time}",
    "receipts.delivered": "delivered {time}",
    "receipts.pending": "not delivered yet",
    "status.image": "Photo",
  },
  uk: {
    "auth.subtitle": "Увійдіть або створіть акаунт",
    "auth.login": "Логін",
    "auth.password": "Пароль",
    "auth.hint": "Логін: 3–20 символів, латиниця, цифри та «_». Пароль: від 6 символів, мінімум одна літера й одна цифра.",
    "auth.signin": "Увійти",
    "auth.signup": "Зареєструватися",
    "nav.chats": "Чати",
    "nav.contacts": "Контакти",
    "nav.settings": "Налаштування",
    "nav.profile": "Профіль",
    "chats.search": "Пошук по повідомленнях",
    "chats.add": "Додати чат",
    "chats.empty": "Оберіть чат зліва або додайте новий",
    "chats.message": "Повідомлення",
    "chats.send": "Надіслати",
    "chats.noMessages": "Повідомлень поки немає. Напишіть першим!",
    "chats.noneYet": "Чатів поки немає. Натисніть «Додати чат», щоб знайти людину за логіном або створити групу.",
    "chats.you": "Ви",
    "chats.typingOne": "друкує…",
    "chats.typingNamed": "{name} друкує…",
    "chats.typingMany": "{n} людини друкують…",
    "chats.privateChat": "Особистий чат",
    "chats.membersCount": "Учасників: {n}",
    "chats.retry": "Не надіслано, натисніть, щоб повторити",
    "chats.sending": "надсилання…",
    "contacts.add": "Додати контакт",
    "contacts.empty": "У контактах поки нікого. Натисніть «Додати контакт».",
    "contacts.online": "у мережі",
    "add.title": "Додати чат",
    "add.startChat": "Додати чат",
    "add.startChatDesc": "За логіном або з ваших контактів",
    "add.group": "Створити групу",
    "add.groupDesc": "Обрати людей із ваших контактів",
    "add.cancel": "Скасувати",
    "add.back": "Назад",
    "add.loginPlaceholder": "Логін людини",
    "add.submit": "Додати",
    "add.startChatTitle": "Новий чат",
    "add.orFromContacts": "Або оберіть із контактів",
    "add.groupTitle": "Нова група",
    "add.groupNamePlaceholder": "Назва групи",
    "add.membersHint": "Учасники з ваших контактів:",
    "add.create": "Створити",
    "add.noContacts": "У контактах поки нікого. Спочатку додайте людей через «Додати контакт».",
    "add.contactTitle": "Додати контакт",
    "err.enterLogin": "Введіть логін",
    "err.enterGroupName": "Введіть назву групи",
    "err.selectMember": "Оберіть хоча б одного учасника",
    "profile.title": "Профіль",
    "profile.name": "Відображуване ім'я",
    "profile.namePlaceholder": "Як вас бачать інші",
    "profile.bio": "Про себе",
    "profile.bioPlaceholder": "Кілька слів про себе",
    "profile.save": "Зберегти",
    "profile.uploadPhoto": "Завантажити фото",
    "profile.removePhoto": "Видалити фото",
    "profile.login": "Логін: @{login}",
    "profile.saved": "Профіль оновлено",
    "settings.title": "Налаштування",
    "settings.theme": "Оформлення",
    "settings.language": "Мова інтерфейсу",
    "settings.theme.light": "Світла",
    "settings.theme.dark": "Темна",
    "settings.theme.neon": "Неон",
    "settings.logout": "Вийти з акаунту",
    "status.online": "у мережі",
    "status.justNow": "був(ла) в мережі щойно",
    "status.minAgo": "був(ла) в мережі {n} хв. тому",
    "status.hoursAgo": "був(ла) в мережі {n} год. тому",
    "status.daysAgo": "був(ла) в мережі {n} дн. тому",
    "status.longAgo": "давно не був(ла) в мережі",
    "info.title": "Інформація",
    "info.close": "Закрити",
    "err.network": "Не вдалося зв'язатися із сервером",
    "err.generic": "Помилка запиту",
    "chats.search": "Пошук чатів",
    "chats.noResults": "Нічого не знайдено",
    "pin.label": "Закріплено",
    "attach.ready": "Фото готове до надсилання",
    "attach.tooLarge": "Зображення завелике (максимум 2 МБ)",
    "attach.invalid": "Не вдалося обробити зображення",
    "msg.deleted": "Повідомлення видалено",
    "msg.you": "Ви",
    "menu.reply": "Відповісти",
    "menu.react": "Реакція",
    "menu.pin": "Закріпити",
    "menu.unpin": "Відкріпити",
    "menu.edit": "Змінити",
    "menu.delete": "Видалити",
    "menu.copy": "Копіювати",
    "menu.copied": "Скопійовано",
    "edit.placeholder": "Змінити повідомлення",
    "edit.save": "Зберегти",
    "edit.cancel": "Скасувати",
    "edit.edited": "змінено",
    "delete.confirm": "Видалити це повідомлення?",
    "receipts.title": "Хто бачив",
    "receipts.read": "прочитано {time}",
    "receipts.delivered": "доставлено {time}",
    "receipts.pending": "ще не доставлено",
    "status.image": "Фото",
  },
};

let lang = localStorage.getItem(LANG_KEY) || (navigator.language || "ru").slice(0, 2);
if (!I18N[lang]) lang = "ru";

function t(key, params) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.ru[key] || key;
  if (params) for (const k in params) s = s.replace("{" + k + "}", params[k]);
  return s;
}

function applyI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((n) => (n.textContent = t(n.dataset.i18n)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((n) => (n.placeholder = t(n.dataset.i18nPlaceholder)));
}

function setLang(next) {
  lang = I18N[next] ? next : "ru";
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
  applyI18n();
  lastListSig = "";
  if (chats.length) renderChatList();
  if (activeId) updateHeader();
}

// ------------------------------------------------------------ Темы
const THEMES = ["light", "dark", "neon"];
let theme = localStorage.getItem(THEME_KEY) || "light";
if (!THEMES.includes(theme)) theme = "light";

function setTheme(next) {
  theme = THEMES.includes(next) ? next : "light";
  localStorage.setItem(THEME_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}
setTheme(theme);

// ------------------------------------------------------------ Состояние
let token = localStorage.getItem(TOKEN_KEY);
let me = null;
let chats = [];
let contacts = [];
let activeId = null;
let sinceIso = null;
let lastSender = null;
let renderedIds = new Set();
let localJobs = new Map();
let pollTimer = null;
let pollGen = 0;
let lastTypingSent = 0;
let lastListSig = "";
let activeSection = "chats";
let chatFilterQuery = "";
let replyTarget = null;       // { id, sender, text, image }
let pendingAttachment = null; // { dataUrl, previewUrl, w, h }
let pinned = null;            // { id, sender, text, image }
let msgRows = new Map();      // id сообщения -> { row, bubble } (для точечного обновления без перерисовки всего списка)
let messagesData = new Map(); // id сообщения -> последние данные с сервера
const REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👎", "🎉"];
const EMOJI_SET = [
  "😀","😁","😂","🤣","😊","😉","😍","😘","😜","🤩","🥳","😎","🤔","🙄","😴","😭",
  "😢","😡","🥺","😱","🤗","👍","👎","👏","🙏","💪","🔥","✨","🎉","❤️","💔","💕",
  "😇","😅","🤨","😬","🥰","😋","🤯","🫡","🙌","👀","💯","☕","🍕","🎂","⚽","🌙",
];

const $ = (id) => document.getElementById(id);
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ------------------------------------------------------------ API
async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = "Bearer " + token;

  let res;
  try {
    res = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (_) {
    throw new Error(t("err.network"));
  }
  let data = {};
  try { data = await res.json(); } catch (_) {}

  if (res.status === 401 && token) {
    resetSession();
    throw new Error(t("err.network"));
  }
  if (!res.ok) throw new Error(data.error || t("err.generic"));
  return data;
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

// ------------------------------------------------------------ Аватары
function avatarColor(name) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 42% 42%)`;
}

function fillAvatar(node, user, small = false) {
  node.classList.toggle("sm", small);
  node.replaceChildren();
  const name = typeof user === "string" ? user : user.name || user.login || "?";
  const inner = el("div", "avatar-img");
  if (user && typeof user === "object" && user.avatar) {
    const img = el("img");
    img.src = API_URL + user.avatar;
    img.alt = "";
    inner.appendChild(img);
  } else {
    inner.textContent = (name[0] || "?").toUpperCase();
    inner.style.background = avatarColor(name);
  }
  node.appendChild(inner);
  // Точка статуса — отдельный элемент поверх .avatar, а не внутри .avatar-img,
  // иначе overflow:hidden у круглой обёртки срезает её до полукруга.
  if (user && typeof user === "object" && user.online) node.appendChild(el("div", "dot"));
}

function makeAvatar(user, small = false) {
  const a = el("div", "avatar" + (small ? " sm" : ""));
  fillAvatar(a, user, small);
  return a;
}

// ------------------------------------------------------------ Статус "в сети"
function formatLastSeen(user) {
  if (!user) return "";
  if (user.online) return t("status.online");
  if (!user.last_seen) return t("status.longAgo");
  const diffMs = Date.now() - new Date(user.last_seen).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t("status.justNow");
  if (min < 60) return t("status.minAgo", { n: min });
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t("status.hoursAgo", { n: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 30) return t("status.daysAgo", { n: days });
  return t("status.longAgo");
}

// ------------------------------------------------------------ Валидация
function checkCredentials(login, pas) {
  if (!/^[A-Za-z0-9_]{3,20}$/.test(login)) return t("auth.hint");
  if (pas.length < 6 || pas.length > 64) return t("auth.hint");
  if (!/[A-Za-z]/.test(pas) || !/\d/.test(pas)) return t("auth.hint");
  if (/\s/.test(pas)) return t("auth.hint");
  return "";
}

// ------------------------------------------------------------ Вход / выход
function setAuthError(msg) { $("auth-error").textContent = msg; }

async function doLogin(login, pas) {
  const data = await api("/login", { method: "POST", body: { log: login, pas } });
  token = data.token;
  localStorage.setItem(TOKEN_KEY, token);
  startApp(data.user);
}

async function onLoginClick() {
  setAuthError("");
  const login = $("auth-login").value.trim();
  const pas = $("auth-pas").value;
  if (!login || !pas) return setAuthError(t("err.enterLogin"));
  setBusy(true);
  try { await doLogin(login, pas); }
  catch (e) { setAuthError(e.message); }
  finally { setBusy(false); }
}

async function onRegisterClick() {
  setAuthError("");
  const login = $("auth-login").value.trim();
  const pas = $("auth-pas").value;
  const problem = checkCredentials(login, pas);
  if (problem) return setAuthError(problem);
  setBusy(true);
  try {
    await api("/register", { method: "POST", body: { log: login, pas } });
    await doLogin(login, pas);
  } catch (e) { setAuthError(e.message); }
  finally { setBusy(false); }
}

function setBusy(busy) {
  $("btn-login").disabled = busy;
  $("btn-register").disabled = busy;
}

async function logout() {
  try { if (token) await api("/logout", { method: "POST" }); } catch (_) {}
  resetSession();
}

function resetSession() {
  token = null; me = null;
  localStorage.removeItem(TOKEN_KEY);
  pollGen++;
  clearTimeout(pollTimer);
  pollTimer = null;
  chats = []; contacts = []; activeId = null;
  msgRows = new Map(); messagesData = new Map();
  pinned = null; replyTarget = null; pendingAttachment = null; chatFilterQuery = "";
  closeMessageMenu();
  closeModal();
  $("app").classList.add("hidden");
  $("app").classList.remove("chat-open");
  $("auth").classList.remove("hidden");
  $("auth-pas").value = "";
}

function startApp(user) {
  me = user;
  $("auth").classList.add("hidden");
  $("app").classList.remove("hidden");
  updateSelfAvatars();
  chats = []; lastListSig = "";
  showSection("chats");
  showEmptyPane();
  pollGen++;
  clearTimeout(pollTimer);
  pollLoop(pollGen);
}

function updateSelfAvatars() {
  fillAvatar($("nav-avatar"), me, true);
}

// ------------------------------------------------------------ Опрос сервера
async function pollLoop(gen) {
  if (gen !== pollGen || !token) return;
  await poll();
  if (gen !== pollGen || !token) return;
  const fast = activeId && document.visibilityState === "visible";
  pollTimer = setTimeout(() => pollLoop(gen), fast ? POLL_ACTIVE_MS : POLL_IDLE_MS);
}

async function poll() {
  try {
    const params = new URLSearchParams();
    if (activeId) {
      params.set("chat_id", activeId);
      if (sinceIso) params.set("since", sinceIso);
      if (document.visibilityState === "visible") params.set("read", "1");
    }
    const data = await api("/poll?" + params.toString());
    if (data.chat_id && data.chat_id === activeId) {
      applyMessages(data.messages);
      setPinned(data.pinned);
    }
    setChats(data.chats);
    if (me) {
      const fresh = data.chats.flatMap((c) => c.members).find((m) => m.id === me.id);
      if (fresh) { me = { ...me, ...fresh }; updateSelfAvatars(); }
    }
  } catch (e) {
    console.error("poll:", e.message);
  }
}

function setChats(list) {
  chats = list;
  renderChatList();
  updateHeader();
}

// ------------------------------------------------------------ Боковая навигация
function showSection(section) {
  activeSection = section;
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.section === section));

  if (section === "settings") return openSettings();
  if (section === "profile") return openProfile();

  $("sidebar-chats").classList.toggle("hidden", section !== "chats");
  $("sidebar-contacts").classList.toggle("hidden", section !== "contacts");
  if (section === "contacts") loadContacts();
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (btn) showSection(btn.dataset.section);
});

// ------------------------------------------------------------ Список чатов
function formatListTime(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString(langLocale(), { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(langLocale(), { day: "2-digit", month: "2-digit" });
}
function langLocale() { return lang === "uk" ? "uk-UA" : lang === "en" ? "en-US" : "ru-RU"; }

function typingText(chat) {
  if (!chat.typing.length) return "";
  if (chat.type === "private") return t("chats.typingOne");
  if (chat.typing.length === 1) return t("chats.typingNamed", { name: chat.typing[0] });
  return t("chats.typingMany", { n: chat.typing.length });
}

function renderChatList() {
  const sig = JSON.stringify([chats, activeId, lang, chatFilterQuery]);
  if (sig === lastListSig) return;
  lastListSig = sig;

  const list = $("chat-list");
  list.replaceChildren();

  const filtered = chatFilterQuery
    ? chats.filter((c) => c.title.toLowerCase().includes(chatFilterQuery))
    : chats;

  if (!filtered.length) {
    list.appendChild(el("div", "empty-list", chatFilterQuery ? t("chats.noResults") : t("chats.noneYet")));
    return;
  }

  for (const c of filtered) {
    const row = el("button", "chat-row" + (c.id === activeId ? " active" : ""));
    row.appendChild(makeAvatar(c.type === "private" ? c.peer || c.title : c.title));

    const mid = el("div", "mid");
    const top = el("div", "top");
    top.appendChild(el("div", "title", c.title));
    if (c.last_message) top.appendChild(el("div", "time", formatListTime(c.last_message.at)));

    const bottom = el("div", "bottom");
    const typing = typingText(c);
    let preview;
    if (typing) {
      preview = el("div", "preview typing", typing);
    } else if (c.last_message) {
      const mine = c.last_message.sender === (me.name || me.login);
      const prefix = mine ? t("chats.you") + ": " : c.type === "group" ? c.last_message.sender + ": " : "";
      preview = el("div", "preview", prefix + (c.last_message.image ? "📷 " : "") + c.last_message.text);
    } else {
      preview = el("div", "preview", "");
    }
    bottom.appendChild(preview);
    if (c.unread > 0 && c.id !== activeId) bottom.appendChild(el("div", "badge", c.unread > 99 ? "99+" : String(c.unread)));

    mid.append(top, bottom);
    row.appendChild(mid);
    row.addEventListener("click", () => openChat(c.id));
    list.appendChild(row);
  }
}

// ------------------------------------------------------------ Контакты
async function loadContacts() {
  const list = $("contact-list");
  try {
    contacts = (await api("/contacts")).contacts;
  } catch (e) {
    list.replaceChildren(el("div", "empty-list", e.message));
    return;
  }
  list.replaceChildren();
  if (!contacts.length) {
    list.appendChild(el("div", "empty-list", t("contacts.empty")));
    return;
  }
  for (const u of contacts) {
    const row = el("button", "contact-row");
    row.appendChild(makeAvatar(u));
    const mid = el("div", "mid");
    mid.appendChild(el("div", "name", u.name));
    mid.appendChild(el("div", "status" + (u.online ? " online" : ""), formatLastSeen(u)));
    row.appendChild(mid);
    row.addEventListener("click", () => openChatWithContact(u));
    list.appendChild(row);
  }
}

// Раньше клик по контакту всегда шёл на сервер (POST /contacts), даже если чат уже существовал —
// это и была заметная задержка. Чат с контактом создаётся сразу при его добавлении,
// поэтому сначала ищем его локально и открываем мгновенно; на сервер идём только если не нашли.
function findPrivateChat(contactId) {
  return chats.find((c) => c.type === "private" && c.peer && c.peer.id === contactId) || null;
}

async function openChatWithContact(u) {
  showSection("chats");
  const local = findPrivateChat(u.id);
  if (local) { openChat(local.id); return; }
  try {
    const data = await api("/contacts", { method: "POST", body: { login: u.login } });
    if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
    openChat(data.chat.id);
  } catch (e) { console.error(e.message); }
}

// ------------------------------------------------------------ Окно чата
function activeChat() { return chats.find((c) => c.id === activeId) || null; }

function showEmptyPane() {
  $("pane-empty").classList.remove("hidden");
  $("chat-view").classList.add("hidden");
}

function updateHeader() {
  const c = activeChat();
  if (!c) return;
  $("head-title").textContent = c.title;
  fillAvatar($("head-avatar"), c.type === "private" ? c.peer || c.title : c.title);
  const status = $("head-status");
  const typing = typingText(c);
  status.classList.remove("typing", "online");
  if (typing) {
    status.textContent = typing;
    status.classList.add("typing");
  } else if (c.type === "private" && c.peer) {
    status.textContent = formatLastSeen(c.peer);
    if (c.peer.online) status.classList.add("online");
  } else {
    status.textContent = t("chats.membersCount", { n: c.members.length });
  }
}

async function openChat(chatId) {
  closeModal();
  closeMessageMenu();
  activeId = chatId;
  sinceIso = null;
  lastSender = null;
  renderedIds = new Set();
  msgRows = new Map();
  messagesData = new Map();
  cancelReply();
  cancelAttachment();
  setPinned(null);

  $("messages").replaceChildren();
  $("message-text").value = "";
  $("pane-empty").classList.add("hidden");
  $("chat-view").classList.remove("hidden");
  $("app").classList.add("chat-open");

  lastListSig = "";
  renderChatList();
  updateHeader();

  try {
    const data = await api(`/chats/${chatId}/messages`);
    if (chatId !== activeId) return;
    sinceIso = data.since;
    setPinned(data.pinned);
    if (!data.messages.length) showNoMessages();
    applyMessages(data.messages, true);
  } catch (e) { console.error(e.message); }
  if (window.matchMedia("(min-width: 761px)").matches) $("message-text").focus();
  poll();
}

function closeChat() {
  activeId = null;
  closeMessageMenu();
  cancelReply();
  cancelAttachment();
  $("app").classList.remove("chat-open");
  showEmptyPane();
  lastListSig = "";
  renderChatList();
}

// ------------------------------------------------------------ Закреплённое сообщение
function setPinned(p) {
  pinned = p || null;
  const bar = $("pinned-bar");
  if (!pinned) { bar.classList.add("hidden"); return; }
  bar.classList.remove("hidden");
  $("pinned-text").textContent = (pinned.image ? "📷 " : "") + (pinned.text || "");
}

async function unpin() {
  if (!activeId) return;
  const prev = pinned;
  setPinned(null);
  try { await api(`/chats/${activeId}/pin`, { method: "POST", body: { message_id: null } }); }
  catch (e) { setPinned(prev); }
}

async function pinMessage(id) {
  if (!activeId) return;
  try {
    const data = await api(`/chats/${activeId}/pin`, { method: "POST", body: { message_id: id } });
    setPinned(data.pinned);
  } catch (e) { console.error(e.message); }
}

function showNoMessages() {
  if (!$("messages").querySelector(".no-msgs")) $("messages").appendChild(el("div", "no-msgs", t("chats.noMessages")));
}

function timeLabel(iso) { return new Date(iso).toLocaleTimeString(langLocale(), { hour: "2-digit", minute: "2-digit" }); }
function removeEmptyNote() { const e = $("messages").querySelector(".no-msgs"); if (e) e.remove(); }

// Фото приходят через приватный /images/<id>, который требует заголовок Authorization —
// обычный <img src="..."> его не отправит, поэтому грузим файл через fetch и превращаем в blob-URL.
const imageUrlCache = new Map();
async function loadAuthedImage(imgEl, imageId) {
  if (imageUrlCache.has(imageId)) { imgEl.src = imageUrlCache.get(imageId); return; }
  try {
    const res = await fetch(API_URL + "/images/" + imageId, { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    imageUrlCache.set(imageId, url);
    imgEl.src = url;
  } catch (_) {}
}

function openLightbox(src) {
  const overlay = el("div", "lightbox");
  const img = el("img"); img.src = src; img.alt = "";
  overlay.addEventListener("click", () => overlay.remove());
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

// ------------------------------------------------------------ Отрисовка одного сообщения
function renderBubble(bubble, m, mine, isGroup, firstInRun) {
  bubble.replaceChildren();
  bubble.classList.toggle("deleted", !!m.deleted);

  if (m.deleted) {
    bubble.appendChild(document.createTextNode(t("msg.deleted")));
    bubble.appendChild(el("span", "time", timeLabel(m.updated_at || m.created_at)));
    return;
  }

  if (m.reply) {
    const q = el("div", "reply-quote");
    const body = el("div", "rq-body");
    body.appendChild(el("span", "rq-sender", m.reply.deleted ? t("msg.deleted") : m.reply.sender));
    if (!m.reply.deleted) body.appendChild(el("span", "rq-text", (m.reply.image ? "📷 " : "") + (m.reply.text || "")));
    q.appendChild(body);
    q.addEventListener("click", (e) => {
      e.stopPropagation();
      const target = msgRows.get(m.reply.id);
      if (target) target.row.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    bubble.appendChild(q);
  }

  if (!mine && isGroup && firstInRun) {
    const author = el("span", "author", m.sender);
    author.style.color = avatarColor(m.sender);
    bubble.appendChild(author);
  }

  if (m.image) {
    const img = el("img", "msg-image" + (m.image.localUrl ? " uploading" : ""));
    img.alt = "";
    img.loading = "lazy";
    if (m.image.localUrl) img.src = m.image.localUrl;
    else if (m.image.id) loadAuthedImage(img, m.image.id);
    img.addEventListener("click", (e) => { e.stopPropagation(); if (img.src) openLightbox(img.src); });
    bubble.appendChild(img);
  }
  if (m.text) bubble.appendChild(document.createTextNode(m.text));

  const timeEl = el("span", "time");
  if (m.edited) timeEl.appendChild(el("span", "edited-flag", t("edit.edited")));
  timeEl.appendChild(document.createTextNode(timeLabel(m.created_at)));
  if (mine && !String(m.id).startsWith("local-")) {
    const ticks = el("span", "ticks" + (m.status === "read" ? " read" : ""));
    ticks.textContent = m.status === "read" ? "✓✓" : "✓";
    if (isGroup) {
      timeEl.classList.add("clickable");
      timeEl.addEventListener("click", (e) => { e.stopPropagation(); showReceipts(m.id); });
    }
    timeEl.appendChild(ticks);
  }
  bubble.appendChild(timeEl);

  const reactions = m.reactions || {};
  const entries = Object.entries(reactions).filter(([, users]) => users.length);
  if (entries.length) {
    const row = el("div", "reactions");
    for (const [emoji, users] of entries) {
      const chip = el("button", "reaction-chip" + (users.includes(me.id) ? " mine" : ""), `${emoji} ${users.length}`);
      chip.addEventListener("click", (e) => { e.stopPropagation(); toggleReaction(m.id, emoji); });
      row.appendChild(chip);
    }
    bubble.appendChild(row);
  }
}

function createRow(m, pending) {
  const c = activeChat();
  const isGroup = c ? c.type === "group" : false;
  const mine = m.sender_id === me.id;
  const firstInRun = lastSender !== m.sender_id;
  lastSender = m.sender_id;

  const row = el("div", "msg" + (mine ? " out" : "") + (firstInRun ? " gap" : "") + (pending ? " pending" : ""));
  row.dataset.id = pending ? "" : m.id;
  row.dataset.first = firstInRun ? "1" : "";

  if (!mine) {
    const slot = el("div", "avatar-slot");
    if (firstInRun) slot.appendChild(makeAvatar(m.sender, true));
    row.appendChild(slot);
  }
  const bubble = el("div", "bubble");
  row.appendChild(bubble);
  renderBubble(bubble, m, mine, isGroup, firstInRun);
  if (!pending) bindMessageInteractions(row, bubble);
  return { row, bubble };
}

// Клик, долгий тап и ПКМ по сообщению — вызывают контекстное меню (Reply/React/Pin/Edit/Delete/Copy)
function bindMessageInteractions(row, bubble) {
  let suppressClick = false;
  let pressTimer = null;

  const open = (x, y) => {
    const m = messagesData.get(row.dataset.id);
    if (m && !m.deleted) showMessageMenu(m, x, y);
  };

  bubble.addEventListener("click", (e) => {
    if (suppressClick) { suppressClick = false; return; }
    open(e.clientX, e.clientY);
  });
  row.addEventListener("contextmenu", (e) => { e.preventDefault(); open(e.clientX, e.clientY); });
  bubble.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    pressTimer = setTimeout(() => { suppressClick = true; open(touch.clientX, touch.clientY); }, 450);
  }, { passive: true });
  bubble.addEventListener("touchend", () => { clearTimeout(pressTimer); setTimeout(() => { suppressClick = false; }, 80); });
  bubble.addEventListener("touchmove", () => clearTimeout(pressTimer));
}

// Точечное обновление: если строка сообщения уже на экране (правка/реакция/статус) — просто
// перерисовываем её содержимое; если сообщения ещё нет — добавляем новую строку в конец списка.
function upsertMessage(m) {
  messagesData.set(m.id, m);
  if (m.updated_at && (!sinceIso || m.updated_at > sinceIso)) sinceIso = m.updated_at;

  const rowObj = msgRows.get(m.id);
  if (rowObj) {
    const c = activeChat();
    const isGroup = c ? c.type === "group" : false;
    const mine = m.sender_id === me.id;
    const firstInRun = rowObj.row.dataset.first === "1";
    renderBubble(rowObj.bubble, m, mine, isGroup, firstInRun);
    if (pinned && pinned.id === m.id) setPinned(m.deleted ? null : { id: m.id, sender: m.sender, text: m.text, image: !!m.image });
    return;
  }

  removeEmptyNote();
  const box = $("messages");
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
  const { row, bubble } = createRow(m, false);
  msgRows.set(m.id, { row, bubble });
  box.appendChild(row);
  if (nearBottom || m.sender_id === me.id) box.scrollTop = box.scrollHeight;
}

function applyMessages(list, forceScroll = false) {
  if (!list.length) return;
  for (const m of list) {
    const job = m.client_id ? localJobs.get(m.client_id) : null;
    if (job && !job.done && job.el && job.el.isConnected) { confirmJob(job, m); continue; }
    upsertMessage(m);
  }
  if (forceScroll) { const box = $("messages"); box.scrollTop = box.scrollHeight; }
}

// ------------------------------------------------------------ Контекстное меню сообщения
function closeMessageMenu() {
  const existing = $("msg-menu-root");
  if (existing) existing.remove();
}

function showMessageMenu(m, x, y) {
  closeMessageMenu();
  const mine = m.sender_id === me.id;
  const root = el("div"); root.id = "msg-menu-root";
  const backdrop = el("div", "msg-menu-backdrop");
  backdrop.addEventListener("click", closeMessageMenu);
  backdrop.addEventListener("contextmenu", (e) => { e.preventDefault(); closeMessageMenu(); });

  const menu = el("div", "msg-menu");
  const reactRow = el("div", "reaction-row");
  for (const emo of REACTIONS) {
    const b = el("button", "", emo);
    b.addEventListener("click", () => { toggleReaction(m.id, emo); closeMessageMenu(); });
    reactRow.appendChild(b);
  }
  menu.appendChild(reactRow);

  const addItem = (label, fn, danger = false) => {
    const btn = el("button", "menu-item" + (danger ? " danger" : ""), label);
    btn.addEventListener("click", fn);
    menu.appendChild(btn);
  };

  addItem(t("menu.reply"), () => { startReply(m); closeMessageMenu(); });
  if (pinned && pinned.id === m.id) addItem(t("menu.unpin"), () => { unpin(); closeMessageMenu(); });
  else addItem(t("menu.pin"), () => { pinMessage(m.id); closeMessageMenu(); });
  if (m.text) addItem(t("menu.copy"), () => { copyText(m.text); closeMessageMenu(); });
  if (mine) {
    addItem(t("menu.edit"), () => { startEdit(m); closeMessageMenu(); });
    addItem(t("menu.delete"), () => { deleteMessage(m.id); closeMessageMenu(); }, true);
  }

  document.body.appendChild(root);
  root.append(backdrop, menu);
  const vw = window.innerWidth, vh = window.innerHeight;
  requestAnimationFrame(() => {
    const w = menu.offsetWidth || 220, h = menu.offsetHeight || 240;
    menu.style.left = Math.max(8, Math.min(x, vw - w - 8)) + "px";
    menu.style.top = Math.max(8, Math.min(y, vh - h - 8)) + "px";
  });
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).catch(() => {});
  else {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (_) {}
    ta.remove();
  }
}

async function toggleReaction(id, emoji) {
  try {
    const data = await api(`/messages/${id}/react`, { method: "POST", body: { emoji } });
    upsertMessage(data.message);
  } catch (e) { console.error(e.message); }
}

async function deleteMessage(id) {
  if (!confirm(t("delete.confirm"))) return;
  try {
    const data = await api(`/messages/${id}/delete`, { method: "POST" });
    upsertMessage(data.message);
  } catch (e) { console.error(e.message); }
}

function startEdit(m) {
  const rowObj = msgRows.get(m.id);
  if (!rowObj) return;
  const { row, bubble } = rowObj;
  const c = activeChat();
  const isGroup = c ? c.type === "group" : false;
  const firstInRun = row.dataset.first === "1";
  const restore = () => renderBubble(bubble, m, true, isGroup, firstInRun);

  bubble.replaceChildren();
  const box = el("div", "edit-box");
  const ta = el("textarea", "field");
  ta.value = m.text || "";
  ta.maxLength = 2000;
  ta.rows = 3;
  const actions = el("div", "edit-actions");
  const cancel = el("button", "edit-cancel", t("edit.cancel"));
  const save = el("button", "edit-save", t("edit.save"));
  actions.append(cancel, save);
  box.append(ta, actions);
  bubble.appendChild(box);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  cancel.addEventListener("click", (e) => { e.stopPropagation(); restore(); });
  const submit = async (e) => {
    if (e) e.stopPropagation();
    const text = ta.value.trim();
    if (!text && !m.image) return;
    save.disabled = true;
    try {
      const data = await api(`/messages/${m.id}/edit`, { method: "POST", body: { text } });
      upsertMessage(data.message);
    } catch (err) { restore(); }
  };
  save.addEventListener("click", submit);
  ta.addEventListener("click", (e) => e.stopPropagation());
  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    if (e.key === "Escape") restore();
  });
}

// ------------------------------------------------------------ Статусы прочтения (для групп и лички)
async function showReceipts(id) {
  let data;
  try { data = await api(`/messages/${id}/receipts`); } catch (e) { return; }
  openModal((modal) => {
    modal.appendChild(el("h3", "", t("receipts.title")));
    if (!data.receipts.length) {
      modal.appendChild(el("div", "empty-list", "—"));
    }
    for (const r of data.receipts) {
      const row = el("div", "receipt-row");
      row.appendChild(makeAvatar(r.user, true));
      const mid = el("div", "mid");
      mid.appendChild(el("div", "name", r.user.name));
      let statusText, cls = "";
      if (r.read_at) { statusText = t("receipts.read", { time: timeLabel(r.read_at) }); cls = "read"; }
      else if (r.delivered_at) statusText = t("receipts.delivered", { time: timeLabel(r.delivered_at) });
      else statusText = t("receipts.pending");
      mid.appendChild(el("div", "status-line" + (cls ? " " + cls : ""), statusText));
      row.appendChild(mid);
      modal.appendChild(row);
    }
    const close = el("button", "btn btn-ghost btn-wide", t("info.close"));
    close.style.marginTop = "10px";
    close.addEventListener("click", closeModal);
    modal.appendChild(close);
  });
}

// ------------------------------------------------------------ Ответ на сообщение
function startReply(m) {
  replyTarget = { id: m.id, sender: m.sender, text: m.text, image: !!m.image };
  $("reply-sender").textContent = t("menu.reply") + " — " + replyTarget.sender;
  $("reply-text").textContent = (replyTarget.image ? "📷 " : "") + (replyTarget.text || "");
  $("reply-bar").classList.add("active");
  $("message-text").focus();
}
function cancelReply() {
  replyTarget = null;
  $("reply-bar").classList.remove("active");
}

// ------------------------------------------------------------ Вложение фото
function cancelAttachment() {
  pendingAttachment = null;
  $("attach-bar").classList.remove("active");
  $("file-input").value = "";
}

function resizeImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL("image/jpeg", quality), w: width, h: height });
    };
    img.onerror = () => reject(new Error("bad image"));
    img.src = URL.createObjectURL(file);
  });
}

async function onFileSelected() {
  const file = $("file-input").files[0];
  if (!file) return;
  try {
    const { dataUrl, w, h } = await resizeImage(file, 1600, 0.82);
    pendingAttachment = { dataUrl, previewUrl: dataUrl, w, h };
    $("attach-preview").src = dataUrl;
    $("attach-bar").classList.add("active");
  } catch (e) {
    alert(t("attach.invalid"));
  }
  $("file-input").value = "";
}

// ------------------------------------------------------------ Эмодзи
function buildEmojiPanel() {
  const panel = $("emoji-panel");
  panel.replaceChildren();
  for (const emo of EMOJI_SET) {
    const b = el("button", "", emo);
    b.type = "button";
    b.addEventListener("click", () => {
      const input = $("message-text");
      const pos = input.selectionStart ?? input.value.length;
      input.value = input.value.slice(0, pos) + emo + input.value.slice(pos);
      input.focus();
      input.selectionStart = input.selectionEnd = pos + emo.length;
      onTyping();
    });
    panel.appendChild(b);
  }
}
function toggleEmojiPanel() { $("emoji-panel").classList.toggle("active"); }

// ------------------------------------------------------------ Отправка
function sendMessage() {
  if (!activeId) return;
  const input = $("message-text");
  const text = input.value.trim();
  const attachment = pendingAttachment;
  if (!text && !attachment) return;

  const replySnapshot = replyTarget;
  input.value = "";
  input.focus();
  lastTypingSent = 0;
  cancelReply();
  cancelAttachment();
  $("emoji-panel").classList.remove("active");

  const job = { chatId: activeId, text, clientId: uuid(), done: false, el: null, bubble: null };
  localJobs.set(job.clientId, job);

  removeEmptyNote();
  const box = $("messages");
  const localMsg = {
    id: "local-" + job.clientId,
    sender_id: me.id,
    sender: me.name || me.login,
    text,
    created_at: new Date().toISOString(),
    reactions: {},
    reply: replySnapshot ? { id: replySnapshot.id, sender: replySnapshot.sender, text: replySnapshot.text, image: replySnapshot.image } : null,
    image: attachment ? { id: null, localUrl: attachment.previewUrl } : null,
  };
  const { row, bubble } = createRow(localMsg, true);
  job.el = row; job.bubble = bubble;
  row.addEventListener("click", () => { if (row.classList.contains("failed")) postJob(job, attachment, replySnapshot ? replySnapshot.id : null); });
  box.appendChild(row);
  box.scrollTop = box.scrollHeight;

  postJob(job, attachment, replySnapshot ? replySnapshot.id : null);
}

async function postJob(job, attachment, replyToId) {
  job.el.classList.remove("failed");
  job.el.classList.add("pending");
  try {
    const body = { text: job.text, client_id: job.clientId };
    if (replyToId) body.reply_to = replyToId;
    if (attachment) { body.image = attachment.dataUrl; body.w = attachment.w; body.h = attachment.h; }
    const data = await api(`/chats/${job.chatId}/messages`, { method: "POST", body });
    if (!job.done) confirmJob(job, data.message);
    poll();
  } catch (e) {
    if (job.done) return;
    job.el.classList.remove("pending");
    job.el.classList.add("failed");
  }
}

function confirmJob(job, m) {
  job.done = true;
  localJobs.delete(job.clientId);
  messagesData.set(m.id, m);
  if (m.updated_at && (!sinceIso || m.updated_at > sinceIso)) sinceIso = m.updated_at;
  if (job.el && job.el.isConnected) {
    job.el.classList.remove("pending", "failed");
    job.el.dataset.id = m.id;
    const c = activeChat();
    renderBubble(job.bubble, m, true, c ? c.type === "group" : false, job.el.dataset.first === "1");
    bindMessageInteractions(job.el, job.bubble);
    msgRows.set(m.id, { row: job.el, bubble: job.bubble });
  }
}

function onTyping() {
  if (!activeId || !$("message-text").value.trim()) return;
  const t2 = Date.now();
  if (t2 - lastTypingSent < TYPING_THROTTLE_MS) return;
  lastTypingSent = t2;
  api(`/chats/${activeId}/typing`, { method: "POST" }).catch(() => {});
}

// ------------------------------------------------------------ Модальные окна
function closeModal() { $("modal-root").replaceChildren(); }
function openModal(build) {
  const overlay = el("div", "overlay");
  const modal = el("div", "modal");
  overlay.appendChild(modal);
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) { closeModal(); if (activeSection === "settings" || activeSection === "profile") showSection("chats"); } });
  $("modal-root").replaceChildren(overlay);
  build(modal);
  applyI18n(modal);
  return modal;
}

// Кнопка «Добавить чат» (раздел «Чаты»): выбор между новым чатом (по логину или из контактов) и группой.
function showAddChooser() {
  openModal((modal) => {
    modal.appendChild(el("h3", "", t("add.title")));
    const a = el("button", "row-btn");
    a.append(el("b", "", t("add.startChat")), el("span", "", t("add.startChatDesc")));
    a.addEventListener("click", showStartChat);
    const b = el("button", "row-btn");
    b.append(el("b", "", t("add.group")), el("span", "", t("add.groupDesc")));
    b.addEventListener("click", showCreateGroup);
    const cancel = el("button", "btn btn-ghost btn-wide", t("add.cancel"));
    cancel.addEventListener("click", closeModal);
    modal.append(a, b, cancel);
  });
}

// Новый чат: логин (с автодобавлением в контакты) + список уже существующих контактов ниже.
function showStartChat() {
  openModal(async (modal) => {
    modal.appendChild(el("h3", "", t("add.startChatTitle")));
    const error = el("div", "error");
    const input = el("input", "field");
    input.placeholder = t("add.loginPlaceholder");
    input.maxLength = 20;
    input.autocomplete = "off";

    const actions = el("div", "actions");
    const back = el("button", "btn btn-ghost", t("add.back"));
    const add = el("button", "btn", t("add.submit"));
    actions.append(back, add);
    modal.append(input, error, actions);
    back.addEventListener("click", showAddChooser);

    const submit = async () => {
      error.textContent = "";
      const login = input.value.trim();
      if (!login) { error.textContent = t("err.enterLogin"); return; }
      add.disabled = true;
      try {
        const data = await api("/contacts", { method: "POST", body: { login } });
        if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
        openChat(data.chat.id);
      } catch (e) { error.textContent = e.message; add.disabled = false; }
    };
    add.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
    input.focus();

    modal.appendChild(el("p", "hint", t("add.orFromContacts")));
    const box = el("div", "pick-list");
    box.appendChild(el("div", "empty-list", "…"));
    modal.appendChild(box);

    let cts = [];
    try { cts = (await api("/contacts")).contacts; } catch (e) { /* тихо: поле логина всё равно работает */ }
    box.replaceChildren();
    if (!cts.length) {
      box.appendChild(el("div", "empty-list", t("add.noContacts")));
    } else {
      for (const u of cts) {
        const row = el("button", "contact-row");
        row.appendChild(makeAvatar(u, true));
        const mid = el("div", "mid");
        mid.appendChild(el("div", "name", u.name));
        row.appendChild(mid);
        row.addEventListener("click", () => openChatWithContact(u));
        box.appendChild(row);
      }
    }
  });
}

// Кнопка «Добавить контакт» (раздел «Контакты»): сразу форма логина, без выбора чат/группа.
function showAddContact() {
  openModal((modal) => {
    modal.appendChild(el("h3", "", t("add.contactTitle")));
    const error = el("div", "error");
    const input = el("input", "field");
    input.placeholder = t("add.loginPlaceholder");
    input.maxLength = 20;
    input.autocomplete = "off";
    const actions = el("div", "actions");
    const cancel = el("button", "btn btn-ghost", t("add.cancel"));
    const add = el("button", "btn", t("add.submit"));
    actions.append(cancel, add);
    modal.append(input, error, actions);
    input.focus();
    cancel.addEventListener("click", closeModal);
    const submit = async () => {
      error.textContent = "";
      const login = input.value.trim();
      if (!login) { error.textContent = t("err.enterLogin"); return; }
      add.disabled = true;
      try {
        const data = await api("/contacts", { method: "POST", body: { login } });
        if (!contacts.some((c) => c.id === data.contact.id)) contacts = [data.contact, ...contacts];
        if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
        closeModal();
        loadContacts();
      } catch (e) { error.textContent = e.message; add.disabled = false; }
    };
    add.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  });
}

function showCreateGroup() {
  openModal(async (modal) => {
    modal.appendChild(el("h3", "", t("add.groupTitle")));
    const error = el("div", "error");
    const name = el("input", "field");
    name.placeholder = t("add.groupNamePlaceholder");
    name.maxLength = 40;
    modal.appendChild(name);
    modal.appendChild(el("p", "hint", t("add.membersHint")));
    const box = el("div", "pick-list");
    box.appendChild(el("div", "empty-list", "…"));
    modal.appendChild(box);
    const actions = el("div", "actions");
    const back = el("button", "btn btn-ghost", t("add.back"));
    const create = el("button", "btn", t("add.create"));
    actions.append(back, create);
    modal.append(error, actions);
    back.addEventListener("click", showAddChooser);

    let cts = [];
    try { cts = (await api("/contacts")).contacts; } catch (e) { error.textContent = e.message; }

    box.replaceChildren();
    if (!cts.length) { box.appendChild(el("div", "empty-list", t("add.noContacts"))); create.disabled = true; }
    const checks = [];
    for (const u of cts) {
      const label = el("label", "pick");
      const cb = el("input"); cb.type = "checkbox"; cb.value = u.id;
      checks.push(cb);
      label.append(cb, makeAvatar(u, true), el("span", "", u.name));
      box.appendChild(label);
    }
    create.addEventListener("click", async () => {
      error.textContent = "";
      const groupName = name.value.trim();
      const members = checks.filter((c) => c.checked).map((c) => c.value);
      if (!groupName) { error.textContent = t("err.enterGroupName"); return; }
      if (!members.length) { error.textContent = t("err.selectMember"); return; }
      create.disabled = true;
      try {
        const data = await api("/groups", { method: "POST", body: { name: groupName, members } });
        if (!chats.some((c) => c.id === data.chat.id)) chats = [data.chat, ...chats];
        openChat(data.chat.id);
      } catch (e) { error.textContent = e.message; create.disabled = false; }
    });
  });
}

function showChatInfo() {
  const c = activeChat();
  if (!c) return;
  openModal((modal) => {
    const head = el("div", "member-row");
    head.append(makeAvatar(c.type === "private" ? c.peer || c.title : c.title), el("h3", "", c.title));
    head.lastChild.style.marginBottom = "0";
    modal.appendChild(head);
    if (c.type === "group") {
      modal.appendChild(el("p", "hint", t("chats.membersCount", { n: c.members.length })));
      for (const m of c.members) {
        const row = el("div", "member-row");
        const suffix = m.id === c.owner_id ? " · " + t("nav.profile") : m.id === me.id ? " (" + t("chats.you") + ")" : "";
        row.append(makeAvatar(m, true), el("span", "", m.name + suffix));
        modal.appendChild(row);
      }
    } else if (c.peer) {
      modal.appendChild(el("p", "hint", formatLastSeen(c.peer)));
      if (c.peer.bio) modal.appendChild(el("p", "hint", c.peer.bio));
    }
    const close = el("button", "btn btn-ghost btn-wide", t("info.close"));
    close.style.marginTop = "12px";
    close.addEventListener("click", closeModal);
    modal.appendChild(close);
  });
}

// ------------------------------------------------------------ Профиль
function openProfile() {
  openModal((modal) => {
    modal.appendChild(el("h3", "", t("profile.title")));

    const head = el("div", "profile-head");
    const wrap = el("div", "avatar-edit");
    const av = el("div", "avatar lg");
    fillAvatar(av, me);
    const badge = el("button", "edit-badge");
    badge.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 20h4l11-11-4-4L4 16z"/></svg>';
    const fileInput = el("input"); fileInput.type = "file"; fileInput.accept = "image/png,image/jpeg,image/webp"; fileInput.className = "hidden";
    wrap.append(av, badge, fileInput);
    head.append(wrap, el("div", "hint", t("profile.login", { login: me.login })));
    modal.appendChild(head);

    const error = el("div", "error");

    badge.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (file.size > 400 * 1024) {
        error.textContent = lang === "en" ? "Image is too large (max 400 KB)" : lang === "uk" ? "Зображення завелике (максимум 400 КБ)" : "Изображение слишком большое (максимум 400 КБ)";
        return;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const data = await api("/profile/avatar", { method: "POST", body: { image: dataUrl } });
        me = { ...me, ...data.user };
        fillAvatar(av, me);
        updateSelfAvatars();
        lastListSig = "";
      } catch (e) { error.textContent = e.message; }
    });

    if (me.avatar) {
      const remove = el("button", "btn btn-ghost btn-wide", t("profile.removePhoto"));
      remove.style.marginTop = "10px";
      remove.addEventListener("click", async () => {
        try {
          const data = await api("/profile/avatar", { method: "DELETE" });
          me = { ...me, ...data.user };
          openProfile();
        } catch (e) { error.textContent = e.message; }
      });
      head.appendChild(remove);
    }

    modal.appendChild(el("div", "field-label", t("profile.name")));
    const nameInput = el("input", "field");
    nameInput.placeholder = t("profile.namePlaceholder");
    nameInput.maxLength = 30;
    nameInput.value = me.name || "";
    modal.appendChild(nameInput);

    modal.appendChild(el("div", "field-label", t("profile.bio")));
    const bioInput = el("textarea", "field");
    bioInput.placeholder = t("profile.bioPlaceholder");
    bioInput.maxLength = 200;
    bioInput.value = me.bio || "";
    modal.appendChild(bioInput);
    const count = el("div", "char-count", `${bioInput.value.length}/200`);
    bioInput.addEventListener("input", () => (count.textContent = `${bioInput.value.length}/200`));
    modal.appendChild(count);

    modal.appendChild(error);
    const save = el("button", "btn btn-wide", t("profile.save"));
    save.addEventListener("click", async () => {
      error.textContent = "";
      save.disabled = true;
      try {
        const data = await api("/profile", { method: "POST", body: { name: nameInput.value.trim(), bio: bioInput.value.trim() } });
        me = { ...me, ...data.user };
        updateSelfAvatars();
        lastListSig = "";
        closeModal();
        showSection("chats");
      } catch (e) { error.textContent = e.message; }
      finally { save.disabled = false; }
    });
    modal.appendChild(save);
  });
}

// ------------------------------------------------------------ Настройки
const THEME_COLORS = {
  light: ["#e6ecf0", "#0e7c86", "#ffffff"],
  dark: ["#0f1620", "#28a8b6", "#161f2b"],
  neon: ["#0a0521", "#ff2fd0", "#5b1aff"],
};

function openSettings() {
  openModal((modal) => {
    modal.appendChild(el("h3", "", t("settings.title")));

    const themeGroup = el("div", "settings-group");
    themeGroup.appendChild(el("h4", "", t("settings.theme")));
    const grid = el("div", "theme-grid");
    for (const key of THEMES) {
      const card = el("button", "theme-card" + (theme === key ? " selected" : ""));
      const sw = el("div", "theme-swatch");
      for (const c of THEME_COLORS[key]) { const i = el("i"); i.style.background = c; sw.appendChild(i); }
      card.append(sw, el("div", "name", t("settings.theme." + key)));
      card.addEventListener("click", () => { setTheme(key); grid.querySelectorAll(".theme-card").forEach((c) => c.classList.remove("selected")); card.classList.add("selected"); });
      grid.appendChild(card);
    }
    themeGroup.appendChild(grid);
    modal.appendChild(themeGroup);

    const langGroup = el("div", "settings-group");
    langGroup.appendChild(el("h4", "", t("settings.language")));
    const langList = el("div", "lang-grid");
    const langs = [["ru", "Русский"], ["en", "English"], ["uk", "Українська"]];
    for (const [code, label] of langs) {
      const row = el("button", "lang-row" + (lang === code ? " selected" : ""));
      row.append(el("span", "", label), el("div", "radio-dot"));
      row.addEventListener("click", () => {
        setLang(code);
        closeModal();
        openSettings();
      });
      langList.appendChild(row);
    }
    langGroup.appendChild(langList);
    modal.appendChild(langGroup);

    const logoutBtn = el("button", "btn btn-danger btn-wide", t("settings.logout"));
    logoutBtn.addEventListener("click", logout);
    modal.appendChild(logoutBtn);
  });
}

// ------------------------------------------------------------ Поиск по названию чата/собеседника
function onSearchInput() {
  chatFilterQuery = $("chat-search").value.trim().toLowerCase();
  lastListSig = "";
  renderChatList();
}

// ------------------------------------------------------------ Мобильная клавиатура
function syncViewport() {
  const vv = window.visualViewport;
  document.documentElement.style.setProperty("--app-h", (vv ? vv.height : window.innerHeight) + "px");
  window.scrollTo(0, 0);
}
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncViewport);
  window.visualViewport.addEventListener("scroll", syncViewport);
}
window.addEventListener("resize", syncViewport);
syncViewport();

// ------------------------------------------------------------ Инициализация
applyI18n();
document.documentElement.lang = lang;

$("btn-login").addEventListener("click", onLoginClick);
$("btn-register").addEventListener("click", onRegisterClick);
$("auth-pas").addEventListener("keydown", (e) => { if (e.key === "Enter") onLoginClick(); });
$("btn-add-chat").addEventListener("click", showAddChooser);
$("btn-add-contact-2").addEventListener("click", showAddContact);
$("btn-back").addEventListener("click", closeChat);
$("head-info").addEventListener("click", showChatInfo);
$("btn-send").addEventListener("click", sendMessage);
$("message-text").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendMessage(); } });
$("message-text").addEventListener("input", onTyping);
$("message-text").addEventListener("focus", () => setTimeout(() => { const b = $("messages"); b.scrollTop = b.scrollHeight; }, 300));
$("chat-search").addEventListener("input", onSearchInput);
$("btn-cancel-reply").addEventListener("click", cancelReply);
$("btn-cancel-attach").addEventListener("click", cancelAttachment);
$("btn-unpin").addEventListener("click", unpin);
$("btn-emoji").addEventListener("click", toggleEmojiPanel);
$("btn-attach").addEventListener("click", () => $("file-input").click());
$("file-input").addEventListener("change", onFileSelected);
document.addEventListener("click", (e) => {
  if (!e.target.closest("#emoji-panel") && !e.target.closest("#btn-emoji")) $("emoji-panel").classList.remove("active");
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeMessageMenu(); closeModal(); } });
buildEmojiPanel();

(async function init() {
  if (!token) return;
  try {
    const data = await api("/me");
    startApp(data.user);
  } catch (_) { resetSession(); }
})();
