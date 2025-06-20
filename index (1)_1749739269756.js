// index.js – Complete Telegram Top-Up Bot with Full Plan Management

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// Replace with your actual bot token:
const TOKEN = '8111508881:AAFGA72emZedDawRuOwLmqiqsA_3wvs_sIA';
const ADMIN_ID = 7830539814;

const bot = new TelegramBot(TOKEN, {
  polling: true,
  request: {
    agentOptions: {
      keepAlive: true,
      family: 4
    }
  }
});

// In-memory storage:
const users = new Map(); // Map<chatId, { lang, plan, crypto }>
let purchaseLogs = [];   // Array of { user, plan, crypto, time }

// Supported cryptos:
let cryptos = [
  { name: 'USDT (TRC20)', address: 'THcpxC6Tzye4vaYxLcP2ufkbhy7XMCVdRc', qrFileId: null },
  { name: 'BTC',          address: 'bc1q5clkxvk8u9lgfdkq2njutcd0pmxpe08um4mdyw', qrFileId: null },
  { name: 'ETH',          address: '0x36da8622EBdD7BF9AA6668fb68Ec18870CCCDAAC', qrFileId: null }
];

// Multi-language translations:
const translations = {
  en: {
    welcome: "🌟 Welcome to Call Spoofing Services!\nChoose your language:",
    choose_plan: "✅ CHOOSE YOUR PLAN ✅\n──────────────",
    payment: "💳 *{plan}*\n{description}\n\nSelect payment method:",
    payment_instruction: "✅ Please send *{method}* to:\n```{address}```",
    payment_done: "✅ Payment Done",
    ask_screenshot: "📸 Please send your payment screenshot now.",
    language_set: "🌐 Language set to English",
    demo_video: "🎥 Demo Video",
    admin_panel: "🛠 ADMIN PANEL",
    admin_logs: "📋 Last 20 Logs",
    admin_broadcast: "📢 Broadcast",
    admin_users: "👤 User Count",
    admin_add_crypto: "➕ Add Crypto",
    admin_remove_crypto: "➖ Remove Crypto",
    help: `📌 *How to Use*:
1. Choose your plan
2. Select payment method
3. Send crypto to provided address
4. Click 'Payment Done' and send payment screenshot
5. Get your credentials within 15 minutes`,
    back: "🔙 Back",
    main_menu: "🏠 Main Menu",
    select_lang: "🌐 Select Language"
  },
  fr: {
    welcome: "🌟 Bienvenue aux services de spoofing d'appel !\nChoisissez votre langue:",
    choose_plan: "✅ CHOISISSEZ VOTRE FORFAIT ✅\n──────────────",
    payment: "💳 *{plan}*\n{description}\n\nSélectionnez votre mode de paiement :",
    payment_instruction: "✅ Veuillez envoyer *{method}* à :\n```{address}```",
    payment_done: "✅ Paiement effectué",
    ask_screenshot: "📸 Veuillez envoyer votre capture d’écran maintenant.",
    language_set: "🌐 Langue définie sur Français",
    demo_video: "🎥 Vidéo de démonstration",
    admin_panel: "🛠 PANEL ADMIN",
    admin_logs: "📋 20 derniers logs",
    admin_broadcast: "📢 Diffusion",
    admin_users: "👤 Nombre d'utilisateurs",
    admin_add_crypto: "➕ Ajouter Crypto",
    admin_remove_crypto: "➖ Supprimer Crypto",
    help: `📌 *Mode d'emploi* :
1. Choisissez votre forfait
2. Sélectionnez le mode de paiement
3. Envoyez les crypto-monnaies à l'adresse fournie
4. Cliquez sur 'Paiement effectué' et envoyez la capture d’écran
5. Recevez vos identifiants sous 15 minutes`,
    back: "🔙 Retour",
    main_menu: "🏠 Menu Principal",
    select_lang: "🌐 Choisir la langue"
  },
  de: {
    welcome: "🌟 Willkommen beim Call Spoofing Service!\nWählen Sie Ihre Sprache:",
    choose_plan: "✅ WÄHLEN SIE IHREN PLAN ✅\n──────────────",
    payment: "💳 *{plan}*\n{description}\n\nWählen Sie eine Kryptowährung:",
    payment_instruction: "✅ Bitte senden Sie *{method}* an:\n```{address}```",
    payment_done: "✅ Ich habe bezahlt",
    ask_screenshot: "📸 Bitte senden Sie jetzt Ihren Zahlungsnachweis.",
    language_set: "🌐 Sprache auf Deutsch eingestellt",
    demo_video: "🎥 Demovideo",
    admin_panel: "🛠 ADMIN-PANEL",
    admin_logs: "📋 Letzte 20 Logs",
    admin_broadcast: "📢 Rundsendung",
    admin_users: "👤 Benutzeranzahl",
    admin_add_crypto: "➕ Krypto hinzufügen",
    admin_remove_crypto: "➖ Krypto entfernen",
    help: `📌 *Anleitung*:
1. Wählen Sie Ihren Plan
2. Wählen Sie Zahlungsmethode
3. Senden Sie Kryptowährung an die angegebene Adresse
4. Klicken Sie auf 'Ich habe bezahlt' und senden Sie den Nachweis
5. Erhalten Sie Ihre Zugangsdaten innerhalb von 15 Minuten`,
    back: "🔙 Zurück",
    main_menu: "🏠 Hauptmenü",
    select_lang: "🌐 Sprache wählen"
  },
  es: {
    welcome: "🌟 ¡Bienvenido a los servicios de suplantación de llamadas!\nElija su idioma:",
    choose_plan: "✅ ELIJA SU PLAN ✅\n──────────────",
    payment: "💳 *{plan}*\n{description}\n\nSeleccione método de pago:",
    payment_instruction: "✅ Envíe *{method}* a:\n```{address}```",
    payment_done: "✅ He Pagado",
    ask_screenshot: "📸 Envíe ahora su comprobante de pago.",
    language_set: "🌐 Idioma establecido en Español",
    demo_video: "🎥 Video Demostrativo",
    admin_panel: "🛠 PANEL ADMIN",
    admin_logs: "📋 Últimos 20 registros",
    admin_broadcast: "📢 Transmisión",
    admin_users: "👤 Recuento de usuarios",
    admin_add_crypto: "➕ Agregar Crypto",
    admin_remove_crypto: "➖ Eliminar Crypto",
    help: `📌 *Instrucciones*:
1. Elija su plan
2. Seleccione método de pago
3. Envíe criptomonedas a la dirección proporcionada
4. Haga clic en 'He Pagado' y envíe el comprobante
5. Reciba sus credenciales en 15 minutos`,
    back: "🔙 Atrás",
    main_menu: "🏠 Menú Principal",
    select_lang: "🌐 Seleccionar idioma"
  },
  ru: {
    welcome: "🌟 Добро пожаловать в сервисы спуфинга звонков!\nВыберите язык:",
    choose_plan: "✅ ВЫБЕРИТЕ ТАРИФ ✅\n──────────────",
    payment: "💳 *{plan}*\n{description}\n\nВыберите способ оплаты:",
    payment_instruction: "✅ Отправьте *{method}* на:\n```{address}```",
    payment_done: "✅ Я оплатил",
    ask_screenshot: "📸 Пожалуйста, отправьте подтверждение оплаты.",
    language_set: "🌐 Язык изменен на Русский",
    demo_video: "🎥 Демо-видео",
    admin_panel: "🛠 АДМИН ПАНЕЛЬ",
    admin_logs: "📋 Последние 20 записей",
    admin_broadcast: "📢 Рассылка",
    admin_users: "👤 Количество пользователей",
    admin_add_crypto: "➕ Добавить Крипто",
    admin_remove_crypto: "➖ Удалить Крипто",
    help: `📌 *Инструкция*:
1. Выберите тариф
2. Выберите способ оплаты
3. Отправьте криптовалюту на указанный адрес
4. Нажмите 'Я оплатил' и отправьте подтверждение
5. Получите учетные данные в течение 15 минут`,
    back: "🔙 Назад",
    main_menu: "🏠 Главное меню",
    select_lang: "🌐 Выбрать язык"
  }
};

// Plan details with original platinum descriptions, plus 1-month copy:
const plansData = {
  en: [
    {
      id: 'gold',
      name: '⚡ GOLD PLAN — $90 ⚡',
      description:
        '1️⃣ Month Unlimited Calling — no per-minute charges\n\n' +
        'Includes:\n' +
        '• Full Call Spoofing Access\n' +
        '• Standard Voice Changer\n' +
        '• Website & Application Access\n'
    },
    {
      id: 'diamond',
      name: '⚡ DIAMOND PLAN — $200 ⚡',
      description:
        '2️⃣ Months Unlimited Calling — no per-minute charges\n\n' +
        'Includes:\n' +
        '• Advanced Call Spoofing\n' +
        '• Premium Voice Changer\n' +
        '• Enhanced Call Routing\n' +
        '• Advance OTP Bot Access\n' +
        '• Website & Application Access\n' +
        '• Email & SMS Spoofing Access\n' +
        '• IVR System\n' +
        '• Toll-Free Number Spoofing\n' +
        '• SIP Trunk Access (inbound & outbound)\n'
    },
    {
      id: 'platinum',
      name: '⚡ PLATINUM PLAN — $300 ⚡',
      description:
        '3️⃣ Months Unlimited Calling — no per-minute charges\n\n' +
        'Includes all premium features:\n' +
        '• Advanced Call Spoofing\n' +
        '• Premium Voice Changer\n' +
        '• Enhanced Routing\n' +
        '• Priority Support\n' +
        '• Advance OTP Bot Access\n' +
        '• Full API & Custom Integration\n' +
        '• Website & Application Access\n' +
        '• Email & SMS Spoofing Access\n' +
        '• IVR System\n' +
        '• Premium Toll-Free Number Spoofing\n' +
        '• Premium SIP Trunk Access (inbound & outbound, with dedicated routing and enhanced quality)\n\n' +
        '📌 As an introductory offer, the Platinum Plan is available for 1 Month at $100 — For New Clients Only\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ PLATINUM 1-MONTH PLAN — $100 ⚡',
      description:
        '1️⃣ Months Unlimited Calling — no per-minute charges\n\n' +
        'Includes all premium features:\n' +
        '• Advanced Call Spoofing\n' +
        '• Premium Voice Changer\n' +
        '• Enhanced Routing\n' +
        '• Priority Support\n' +
        '• Advance OTP Bot Access\n' +
        '• Full API & Custom Integration\n' +
        '• Website & Application Access\n' +
        '• Email & SMS Spoofing Access\n' +
        '• IVR System\n' +
        '• Premium Toll-Free Number Spoofing\n' +
        '• Premium SIP Trunk Access (inbound & outbound, with dedicated routing and enhanced quality)\n\n' +
        '📌 As an introductory offer, the Platinum Plan is available for 1 Month at $100 — For New Clients Only\n'
    }
  ],
  fr: [
    {
      id: 'gold',
      name: '⚡ FORFAIT OR — $90 ⚡',
      description:
        '1️⃣ Mois d’appels illimités — pas de facturation à la minute\n\n' +
        'Inclut :\n' +
        '• Accès complet au spoofing d’appel\n' +
        '• Changeur de voix standard\n' +
        '• Accès site et application\n'
    },
    {
      id: 'diamond',
      name: '⚡ FORFAIT DIAMANT — $200 ⚡',
      description:
        '2️⃣ Mois d’appels illimités — pas de facturation à la minute\n\n' +
        'Inclut :\n' +
        '• Spoofing d’appel avancé\n' +
        '• Changeur de voix premium\n' +
        '• Routage d’appel amélioré\n' +
        '• Accès Bot OTP avancé\n' +
        '• Accès site et application\n' +
        '• Spoofing email & SMS\n' +
        '• Système IVR\n' +
        '• Spoofing de numéro gratuit\n' +
        '• Accès SIP Trunk (entrant & sortant)\n'
    },
    {
      id: 'platinum',
      name: '⚡ FORFAIT PLATINE — $300 ⚡',
      description:
        '3️⃣ Mois d’appels illimités — pas de facturation à la minute\n\n' +
        'Inclut toutes les fonctionnalités premium :\n' +
        '• Spoofing d’appel avancé\n' +
        '• Changeur de voix premium\n' +
        '• Routage amélioré\n' +
        '• Support prioritaire\n' +
        '• Accès Bot OTP avancé\n' +
        '• API & intégration personnalisée\n' +
        '• Accès site et application\n' +
        '• Spoofing email & SMS\n' +
        '• Système IVR\n' +
        '• Spoofing de numéro gratuit premium\n' +
        '• Accès SIP Trunk premium (entrant & sortant, routage dédié et qualité améliorée)\n\n' +
        '📌 Offre d’introduction : Forfait Platine à $100 pour 1 mois — Pour Nouveaux Clients\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ FORFAIT PLATINE 1 MOIS — $100 ⚡',
      description:
        '1️⃣ Mois d’appels illimités — pas de facturation à la minute\n\n' +
        'Inclut toutes les fonctionnalités premium :\n' +
        '• Spoofing d’appel avancé\n' +
        '• Changeur de voix premium\n' +
        '• Routage amélioré\n' +
        '• Support prioritaire\n' +
        '• Accès Bot OTP avancé\n' +
        '• API & intégration personnalisée\n' +
        '• Accès site et application\n' +
        '• Spoofing email & SMS\n' +
        '• Système IVR\n' +
        '• Spoofing de numéro gratuit premium\n' +
        '• Accès SIP Trunk premium (entrant & sortant, routage dédié et qualité améliorée)\n\n' +
        '📌 Offre d’introduction : Forfait Platine à $100 pour 1 mois — Pour Nouveaux Clients\n'
    }
  ],
  de: [
    {
      id: 'gold',
      name: '⚡ GOLD-PAKET — $90 ⚡',
      description:
        '1️⃣ Monat unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält:\n' +
        '• Vollständiges Call Spoofing\n' +
        '• Standard-Sprachwechsler\n' +
        '• Website- & App-Zugriff\n'
    },
    {
      id: 'diamond',
      name: '⚡ DIAMANT-PAKET — $200 ⚡',
      description:
        '2️⃣ Monate unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält:\n' +
        '• Fortgeschrittenes Call Spoofing\n' +
        '• Premium-Sprachwechsler\n' +
        '• Verbesserte Anrufweiterleitung\n' +
        '• Fortgeschrittener OTP-Bot-Zugriff\n' +
        '• Website- & App-Zugriff\n' +
        '• E-Mail- & SMS-Spoofing\n' +
        '• IVR-System\n' +
        '• Kostenlose Nummern-Spoofing\n' +
        '• SIP-Trunk-Zugriff (eingehend & ausgehend)\n'
    },
    {
      id: 'platinum',
      name: '⚡ PLATIN-PAKET — $300 ⚡',
      description:
        '3️⃣ Monate unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält alle Premium-Funktionen:\n' +
        '• Fortgeschrittenes Call Spoofing\n' +
        '• Premium-Sprachwechsler\n' +
        '• Verbesserte Weiterleitung\n' +
        '• Priorisierter Support\n' +
        '• Fortgeschrittener OTP-Bot-Zugriff\n' +
        '• Vollständige API- & benutzerdefinierte Integration\n' +
        '• Website- & App-Zugriff\n' +
        '• E-Mail- & SMS-Spoofing\n' +
        '• IVR-System\n' +
        '• Premium Toll-Free Number Spoofing\n' +
        '• Premium SIP-Trunk-Zugriff (eingehend & ausgehend, dediziertes Routing und verbesserte Qualität)\n\n' +
        '📌 Einführungsangebot: Platinum-Paket 1 Monat für $100 — Nur für neue Kunden\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ PLATIN-PAKET 1 MONAT — $100 ⚡',
      description:
        '1️⃣ Monate unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält alle Premium-Funktionen:\n' +
        '• Fortgeschrittenes Call Spoofing\n' +
        '• Premium-Sprachwechsler\n' +
        '• Verbesserte Weiterleitung\n' +
        '• Priorisierter Support\n' +
        '• Fortgeschrittener OTP-Bot-Zugriff\n' +
        '• Vollständige API- & benutzerdefinierte Integration\n' +
        '• Website- & App-Zugriff\n' +
        '• E-Mail- & SMS-Spoofing\n' +
        '• IVR-System\n' +
        '• Premium Toll-Free Number Spoofing\n' +
        '• Premium SIP-Trunk-Zugriff (eingehend & ausgehend, dediziertes Routing und verbesserte Qualität)\n\n' +
        '📌 Einführungsangebot: Platinum-Paket 1 Monat für $100 — Nur für neue Kunden\n'
    }
  ],
  es: [
    {
      id: 'gold',
      name: '⚡ PLAN ORO — $90 ⚡',
      description:
        '1️⃣ Mes llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye:\n' +
        '• Acceso completo a Call Spoofing\n' +
        '• Cambiador de voz estándar\n' +
        '• Acceso web y app\n'
    },
    {
      id: 'diamond',
      name: '⚡ PLAN DIAMANTE — $200 ⚡',
      description:
        '2️⃣ Meses llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye:\n' +
        '• Spoofing de llamada avanzado\n' +
        '• Cambiador de voz premium\n' +
        '• Enrutamiento de llamadas mejorado\n' +
        '• Acceso avanzado a Bot OTP\n' +
        '• Acceso web y app\n' +
        '• Spoofing de Email y SMS\n' +
        '• Sistema IVR\n' +
        '• Spoofing de número gratuito\n' +
        '• Acceso SIP Trunk (entrante y saliente)\n'
    },
    {
      id: 'platinum',
      name: '⚡ PLAN PLATINO — $300 ⚡',
      description:
        '3️⃣ Meses llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye todas las funciones premium:\n' +
        '• Spoofing de llamada avanzado\n' +
        '• Cambiador de voz premium\n' +
        '• Enrutamiento mejorado\n' +
        '• Soporte prioritario\n' +
        '• Acceso avanzado a Bot OTP\n' +
        '• API completa e integración personalizada\n' +
        '• Acceso web y app\n' +
        '• Spoofing de Email y SMS\n' +
        '• Sistema IVR\n' +
        '• Spoofing de número gratuito premium\n' +
        '• Acceso SIP Trunk premium (entrante y saliente, enrutamiento dedicado y calidad mejorada)\n\n' +
        '📌 Oferta introductoria: Plan Platino 1 Mes por $100 — Solo para nuevos clientes\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ PLAN PLATINO 1 MES — $100 ⚡',
      description:
        '1️⃣ Meses llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye todas las funciones premium:\n' +
        '• Spoofing de llamada avanzado\n' +
        '• Cambiador de voz premium\n' +
        '• Enrutamiento mejorado\n' +
        '• Soporte prioritario\n' +
        '• Acceso avanzado a Bot OTP\n' +
        '• API completa e integración personalizada\n' +
        '• Acceso web y app\n' +
        '• Spoofing de Email y SMS\n' +
        '• Sistema IVR\n' +  
        '• Spoofing de número gratuito premium\n' +  
        '• Acceso SIP Trunk premium (entrante y saliente, enrutamiento dedicado y calidad mejorada)\n\n' +
        '📌 Oferta introductoria: Plan Platino 1 Mes por $100 — Solo para nuevos clientes\n'
    }
  ],
  ru: [
    {
      id: 'gold',
      name: '⚡ ЗОЛОТОЙ ТАРИФ — $90 ⚡',
      description:
        '1️⃣ Месяц безлимитных звонков — без поминутной платы\n\n' +
        'Включает:\n' +
        '• Полный Call Spoofing\n' +
        '• Стандартный сменщик голоса\n' +
        '• Доступ к веб-сайту и приложению\n'
    },
    {
      id: 'diamond',
      name: '⚡ БРИЛЛИАНТОВЫЙ ТАРИФ — $200 ⚡',
      description:
        '2️⃣ Месяца безлимита — без поминутной платы\n\n' +
        'Включает:\n' +
        '• Продвинутый Call Spoofing\n' +
        '• Премиум сменщик голоса\n' +
        '• Улучшенное маршрутизация займков\n' +
        '• Продвинутый доступ к Bot OTP\n' +
        '• Доступ к веб-сайту и приложению\n' +
        '• Spoofing Email и SMS\n' +
        '• Система IVR\n' +
        '• Spoofing бесплатного номера\n' +
        '• Доступ SIP Trunk (входящий и исходящий)\n'
    },
    {
      id: 'platinum',
      name: '⚡ ПЛАТИНОВЫЙ ТАРИФ — $300 ⚡',
      description:
        '3️⃣ Месяца безлимита — без поминутной платы\n\n' +
        'Включает все премиум-функции:\n' +
        '• Продвинутый Call Spoofing\n' +
        '• Премиум сменщик голоса\n' +
        '• Улучшенное маршрутизация займков\n' +
        '• Приоритетная поддержка\n' +
        '• Продвинутый доступ к Bot OTP\n' +
        '• Полная API и кастомная интеграция\n' +
        '• Доступ к веб-сайту и приложению\n' +
        '• Spoofing Email и SMS\n' +
        '• Система IVR\n' +
        '• Spoofing премиум бесплатного номера\n' +
        '• Премиум доступ SIP Trunk (входящий и исходящий, выделенное маршрутизация и повышенное качество)\n\n' +
        '📌 Промо: Платиновый тариф 1 месяц за $100 — Только для новых клиентов\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ ПЛАТИНОВЫЙ ТАРИФ 1 МЕС — $100 ⚡',
      description:
        '1️⃣ Месяца безлимита — без поминутной платы\n\n' +
        'Включает все премиум-функции:\n' +
        '• Продвинутый Call Spoofing\n' +
        '• Премиум сменщик голоса\n' +
        '• Улучшенное маршрутизация займков\n' +
        '• Приоритетная поддержка\n' +
        '• Продвинутый доступ к Bot OTP\n' +
        '• Полная API и кастомная интеграция\n' +
        '• Доступ к веб-сайту и приложению\n' +
        '• Spoofing Email и SMS\n' +
        '• Система IVR\n' +
        '• Spoofing премиум бесплатного номера\n' +
        '• Премиум доступ SIP Trunk (входящий и исходящий, выделенное маршрутизация и повышенное качество)\n\n' +
        '📌 Промо: Платиновый тариф 1 месяц за $100 — Только для новых клиентов\n'
    }
  ]
};

// Enhanced loading animation
const animateTyping = async (chatId, totalDuration = 1500) => {
  const interval = 500, loops = Math.ceil(totalDuration/interval);
  for (let i=0;i<loops;i++){ bot.sendChatAction(chatId,'typing'); await new Promise(r=>setTimeout(r,interval)); }
};
const sendAnimatedMessage = async (chatId, text, options={})=>{
  await animateTyping(chatId); return bot.sendMessage(chatId,text,options);
};

// Menus
const sendLanguageMenu=async(chatId)=>{
  if(!users.has(chatId)) users.set(chatId,{lang:'en',plan:null,crypto:null});
  const keyboard={inline_keyboard:[
    [{text:'🇺🇸 English',callback_data:'lang_en'}],
    [{text:'🇫🇷 Français',callback_data:'lang_fr'}],
    [{text:'🇩🇪 Deutsch',  callback_data:'lang_de'}],
    [{text:'🇪🇸 Español',  callback_data:'lang_es'}],
    [{text:'🇷🇺 Русский',  callback_data:'lang_ru'}]
  ]};
  await sendAnimatedMessage(chatId,translations.en.welcome,{reply_markup:keyboard,parse_mode:'Markdown'});
};

const sendMainMenu=async(chatId,lang='en')=>{
  if(!users.has(chatId)) users.set(chatId,{lang,plan:null,crypto:null}); else users.get(chatId).lang=lang;
  const t=translations[lang], pList=plansData[lang];
  const buttons=pList.map(p=>([{text:p.name,callback_data:`buy_${p.id}`}]));
  buttons.push([{text:t.demo_video,url:'https://t.me/Callspoofingbotofficial'}]);
  buttons.push([{text:t.select_lang,callback_data:'change_lang'}]);
  buttons.push([{text:'❓ '+t.help.split('\n')[0],callback_data:'help'}]);
  await sendAnimatedMessage(chatId,t.choose_plan,{reply_markup:{inline_keyboard:buttons},parse_mode:'Markdown'});
};

const showPaymentMethods=async(chatId,planId,lang='en')=>{
  if(!users.has(chatId)) users.set(chatId,{lang,plan:null,crypto:null}); else users.get(chatId).lang=lang;
  const t=translations[lang], sel=plansData[lang].find(pl=>pl.id===planId);
  if(!sel) return sendMainMenu(chatId,lang);
  purchaseLogs.unshift({user:chatId,plan:sel.name,crypto:null,time:new Date().toLocaleString('en-GB',{timeZone:'Asia/Kolkata'})});
  if(purchaseLogs.length>20) purchaseLogs.pop();
  const cryptoButtons=cryptos.map(c=>([{text:c.name,callback_data:`pay|${planId}|${c.name}`}]));
  cryptoButtons.push([{text:t.back,callback_data:'back_to_plans'}]);
  await sendAnimatedMessage(chatId,
    t.payment.replace('{plan}',sel.name).replace('{description}',sel.description),
    {reply_markup:{inline_keyboard:cryptoButtons},parse_mode:'Markdown'});
};

const sendHelp=async(chatId,lang='en')=>{
  if(!users.has(chatId)) users.set(chatId,{lang,plan:null,crypto:null}); else users.get(chatId).lang=lang;
  const t=translations[lang];
  await sendAnimatedMessage(chatId,t.help,{reply_markup:{inline_keyboard:[[{text:t.main_menu,callback_data:'main_menu'}]]},parse_mode:'Markdown'});
};

// Admin keyboard
function getAdminKeyboard(lang='en'){
  const t=translations[lang]||translations.en;
  return {inline_keyboard:[
    [{text:t.admin_logs,callback_data:'admin_logs'}],
    [{text:t.admin_broadcast,callback_data:'admin_broadcast'}],
    [{text:t.admin_users,callback_data:'admin_users'}],
    [{text:'➕ Add Plan',callback_data:'admin_add_plan'}],
    [{text:'✏️ Edit Plan',callback_data:'admin_edit_plan'}],
    [{text:'🗑️ Remove Plan',callback_data:'admin_remove_plan'}],
    [{text:'🔒 Assign Plan',callback_data:'admin_assign_plan'}],
    [{text:t.admin_add_crypto,callback_data:'admin_add_crypto'}],
    [{text:t.admin_remove_crypto,callback_data:'admin_remove_crypto'}],
    [{text:t.back,callback_data:'admin_panel'}]
  ]};
}

// Callback queries
bot.on('callback_query',async(query)=>{
  const chatId=query.message.chat.id;
  if(!users.has(chatId)) users.set(chatId,{lang:'en',plan:null,crypto:null});
  const {lang}=users.get(chatId), t=translations[lang], data=query.data;
  if(data.startsWith('lang_')){
    const nl=data.split('_')[1];
    users.get(chatId).lang=nl;
    await bot.answerCallbackQuery(query.id,{text:translations[nl].language_set});
    return sendMainMenu(chatId,nl);
  }
  if(data==='change_lang'){await bot.answerCallbackQuery(query.id);return sendLanguageMenu(chatId);}
  if(data==='help'){await bot.answerCallbackQuery(query.id);return sendHelp(chatId,lang);}
  if(data==='main_menu'||data==='back_to_plans'){await bot.answerCallbackQuery(query.id);return sendMainMenu(chatId,lang);}
  if(data.startsWith('buy_')){
    await bot.answerCallbackQuery(query.id);
    return showPaymentMethods(chatId,data.split('_')[1],lang);
  }
  if(data.startsWith('pay|')){
    await bot.answerCallbackQuery(query.id);
    const [,pid,method]=data.split('|'), w=cryptos.find(c=>c.name===method);
    if(w){
      if(purchaseLogs[0]?.user===chatId) purchaseLogs[0].crypto=method;
      await sendAnimatedMessage(chatId,t.payment_instruction.replace('{method}',method).replace('{address}',w.address),{
        reply_markup:{inline_keyboard:[[{text:t.payment_done,callback_data:`done|${pid}|${method}`}]]},parse_mode:'Markdown'
      });
      if(w.qrFileId) await bot.sendPhoto(chatId,w.qrFileId,{caption:`${method} QR Code`});
    }
    return;
  }
  if(data.startsWith('done|')){
    await bot.answerCallbackQuery(query.id);
    const [,pid,method]=data.split('|');
    users.get(chatId).plan=pid; users.get(chatId).crypto=method;
    return sendAnimatedMessage(chatId,t.ask_screenshot,{parse_mode:'Markdown'});
  }
  if(query.from.id===ADMIN_ID){
    await bot.answerCallbackQuery(query.id);
    if(data==='admin_panel') return bot.sendMessage(chatId,translations.en.admin_panel,{reply_markup:getAdminKeyboard('en')});
    if(data==='admin_logs'){
      const text=purchaseLogs.map(l=>`• ${l.user} — ${l.plan} — ${l.crypto||''} (${l.time})`).join('\n')||'No logs yet';
      return bot.sendMessage(chatId,`📝 *Last 20 Purchases*\n${text}`,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[[{text:t.back,callback_data:'admin_panel'}]]}});
    }
    if(data==='admin_users'){
      return bot.sendMessage(chatId,`👥 *Total Users:* ${users.size}`,{parse_mode:'Markdown',reply_markup:{inline_keyboard:[[{text:t.back,callback_data:'admin_panel'}]]}});
    }
    if(data==='admin_broadcast'){
      await bot.sendMessage(chatId,'📢 Send message or media to broadcast (or /cancel):',{reply_markup:{inline_keyboard:[[{text:'❌ Cancel',callback_data:'admin_panel'}]]}});
      const onB=async m=>{
        if(m.chat.id!==ADMIN_ID) return;
        if(m.text?.toLowerCase()==='/cancel'){bot.removeListener('message',onB);return;}
        let sent=0;
        for(const [uid] of users){
          try{
            if(m.photo) await bot.sendPhoto(uid,m.photo.pop().file_id,{caption:m.caption||''});
            else if(m.video) await bot.sendVideo(uid,m.video.file_id,{caption:m.caption||''});
            else if(m.text) await bot.sendMessage(uid,m.text);
            sent++;
          }catch{}
          await new Promise(r=>setTimeout(r,50));
        }
        await bot.sendMessage(chatId,`✅ Broadcast sent to ${sent}/${users.size}`,{reply_markup:{inline_keyboard:[[{text:t.back,callback_data:'admin_panel'}]]}});
        bot.removeListener('message',onB);
      };
      return bot.on('message',onB);
    }
    if(data==='admin_add_crypto'){
      await bot.sendMessage(chatId,'➕ *Add Crypto*\nPlease send in format:\n`Name,Address`\nThen send QR or `/skipqr`.',{parse_mode:'Markdown'});
      const onA=async m=>{
        if(m.chat.id!==ADMIN_ID) return;
        if(m.text&&m.text.includes(',')){
          const [name,address]=m.text.split(',').map(s=>s.trim());
          if(!name||!address){await bot.sendMessage(chatId,'Invalid format. Use `Name,Address`.',{parse_mode:'Markdown'});return;}
          const tmp={name,address,qrFileId:null};
          await bot.sendMessage(chatId,`Send QR for *${name}* or \`/skipqr\` to finish.`,{parse_mode:'Markdown'});
          const onQ=async msg=>{
            if(msg.chat.id!==ADMIN_ID) return;
            if(msg.text?.toLowerCase()==='/skipqr'){
              cryptos.push(tmp);
              await bot.sendMessage(chatId,`✅ Crypto *${name}* added without QR.`,{parse_mode:'Markdown'});
              bot.removeListener('message',onQ);bot.removeListener('message',onA);
              return;
            }
            if(msg.photo){
              tmp.qrFileId=msg.photo[msg.photo.length-1].file_id;
              cryptos.push(tmp);
              await bot.sendMessage(chatId,`✅ Crypto *${name}* added with QR.`,{parse_mode:'Markdown'});
              bot.removeListener('message',onQ);bot.removeListener('message',onA);
            }
          };
          bot.on('message',onQ);
        }
      };
      return bot.on('message',onA);
    }
    if(data==='admin_remove_crypto'){
      if(!cryptos.length){await bot.sendMessage(chatId,'No cryptos to remove.');return;}
      const names=cryptos.map(c=>c.name).join('\n');
      await bot.sendMessage(chatId,`➖ *Remove Crypto*\nCurrent cryptos:\n${names}\n\nSend exact name to remove.`,{parse_mode:'Markdown'});
      const onR=async m=>{
        if(m.chat.id!==ADMIN_ID) return;
        const idx=cryptos.findIndex(c=>c.name===m.text.trim());
        if(idx===-1){await bot.sendMessage(chatId,`❌ No crypto named "${m.text.trim()}" found.`);return;}
        const rem=cryptos.splice(idx,1)[0];
        await bot.sendMessage(chatId,`✅ Crypto *${rem.name}* removed.`,{parse_mode:'Markdown'});
        bot.removeListener('message',onR);
      };
      return bot.on('message',onR);
    }
    if(data==='admin_add_plan'){
      await bot.sendMessage(chatId,'➕ *Add Plan*\nSend JSON:\n`{"lang":"en","id":"planid","name":"NAME","description":"DESC"}`',{parse_mode:'Markdown'});
      const onAP=async m=>{
        if(m.chat.id!==ADMIN_ID||!m.text) return;
        try{const pl=JSON.parse(m.text);if(!plansData[pl.lang]) plansData[pl.lang]=[];plansData[pl.lang].push(pl);
          await bot.sendMessage(chatId,`✅ Plan *${pl.name}* added.`,{parse_mode:'Markdown'});bot.removeListener('message',onAP);
        }catch{await bot.sendMessage(chatId,'❌ Invalid JSON.');}
      };
      return bot.on('message',onAP);
    }
    if(data==='admin_edit_plan'){
      await bot.sendMessage(chatId,'✏️ *Edit Plan*\nSend JSON:\n`{"lang":"en","id":"planid","name":"New","description":"NewDesc"}`',{parse_mode:'Markdown'});
      const onEP=async m=>{
        if(m.chat.id!==ADMIN_ID||!m.text) return;
        try{const upd=JSON.parse(m.text), arr=plansData[upd.lang]||[], idx=arr.findIndex(p=>p.id===upd.id);
          if(idx<0) throw '';
          Object.assign(arr[idx],upd);
          await bot.sendMessage(chatId,`✅ Plan *${upd.id}* updated.`,{parse_mode:'Markdown'});
          bot.removeListener('message',onEP);
        }catch{await bot.sendMessage(chatId,'❌ Error updating.');}
      };
      return bot.on('message',onEP);
    }
    if(data==='admin_remove_plan'){
      const ids=(plansData.en||[]).map(p=>p.id).join(', ');
      await bot.sendMessage(chatId,`🗑️ *Remove Plan*\nAvailable IDs: ${ids}\nSend ID to remove.`,{parse_mode:'Markdown'});
      const onRP=async m=>{
        if(m.chat.id!==ADMIN_ID||!m.text) return;
        const id=m.text.trim();Object.keys(plansData).forEach(l=>plansData[l]=plansData[l].filter(p=>p.id!==id));
        await bot.sendMessage(chatId,`✅ Plan *${id}* removed.`,{parse_mode:'Markdown'});
        bot.removeListener('message',onRP);
      };
      return bot.on('message',onRP);
    }
    if(data==='admin_assign_plan'){
      await bot.sendMessage(chatId,'🔒 *Assign Plan*\nSend JSON:\n`{"chatId":123456,"planId":"gold"}`',{parse_mode:'Markdown'});
      const onAS=async m=>{
        if(m.chat.id!==ADMIN_ID||!m.text) return;
        try{const {chatId:uid,planId}=JSON.parse(m.text);
          if(!users.has(uid)) users.set(uid,{lang:'en',plan:null,crypto:null});
          users.get(uid).plan=planId;
          await bot.sendMessage(chatId,`✅ Assigned plan *${planId}* to user ${uid}.`,{parse_mode:'Markdown'});
          bot.removeListener('message',onAS);
        }catch{await bot.sendMessage(chatId,'❌ Invalid JSON or chatId not found.');}
      };
      return bot.on('message',onAS);
    }
  }
});

// Handle payment screenshots
bot.on('photo',async(msg)=>{
  const cid=msg.chat.id;if(!users.has(cid)) return;
  const {plan,crypto}=users.get(cid);if(!plan||!crypto) return;
  const f=msg.photo[msg.photo.length-1].file_id;
  await bot.sendPhoto(ADMIN_ID,f,{caption:`📸 Payment proof from @${msg.from.username||msg.from.first_name}\nPlan: ${plan}\nCrypto: ${crypto}`});
  await bot.sendMessage(cid,"✅ Screenshot received. Our team will verify shortly.");
});

// Commands
bot.onText(/\/start/,msg=>sendLanguageMenu(msg.chat.id));
bot.onText(/\/language/,msg=>sendLanguageMenu(msg.chat.id));
bot.onText(/\/help/,msg=>sendHelp(msg.chat.id,users.get(msg.chat.id)?.lang||'en'));
bot.onText(/\/admin/,msg=>{
  if(msg.from.id!==ADMIN_ID) return;
  users.set(msg.chat.id,users.get(msg.chat.id)||{lang:'en',plan:null,crypto:null});
  bot.sendMessage(msg.chat.id,translations.en.admin_panel,{reply_markup:getAdminKeyboard('en')});
});

// Error handling
bot.on('polling_error',err=>console.error(`Polling error: ${err.message}`));

console.log('🚀 Bot is running with full plan management features…');
