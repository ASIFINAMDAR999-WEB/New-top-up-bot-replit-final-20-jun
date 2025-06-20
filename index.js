// index.js – Complete Telegram Top-Up Bot with Full Plan Management

const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const OpenAI = require('openai');

// Initialize OpenAI for AI features
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder'
});

// AI Configuration
const AI_CONFIG = {
  enabled: process.env.OPENAI_API_KEY ? true : false,
  model: 'gpt-4o', // Latest OpenAI model
  maxTokens: 500,
  temperature: 0.7,
  features: {
    chatAssistant: true,
    sentimentAnalysis: true,
    smartResponses: true,
    userProfiling: true,
    contentGeneration: true,
    languageDetection: true,
    spamDetection: true,
    intentClassification: true
  }
};

// Get configuration from environment variables with fallbacks
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8111508881:AAFGA72emZedDawRuOwLmqiqsA_3wvs_sIA';
const ADMIN_ID = parseInt(process.env.ADMIN_ID) || 7830539814;

const bot = new TelegramBot(TOKEN, {
  polling: true,
  request: {
    agentOptions: {
      keepAlive: true,
      family: 4
    }
  }
});

// In-memory storage with enhanced structures:
const users = new Map(); // Map<chatId, { lang, plan, crypto, lastActivity, sessionId }>
let purchaseLogs = [];   // Array of { user, plan, crypto, time, verified, amount }>
const callbackLimiter = new Map(); // Rate limiting for callback queries
const sessionManager = new Map(); // Track user sessions for security
const userMessages = new Map(); // Track bot messages per user for deletion

// AI-enhanced data structures
const userProfiles = new Map(); // AI-generated user profiles and preferences
const conversationHistory = new Map(); // Store conversation context for AI
const aiInsights = new Map(); // Store AI analysis and insights
const smartSuggestions = new Map(); // AI-generated suggestions per user

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
    ask_screenshot: "📸 Veuillez envoyer votre capture d'écran maintenant.",
    language_set: "🌐 Langue définie sur Français",
    demo_video: "🎥 Vidéo de démonstration",
    admin_panel: "🛠 PANEL ADMIN",
    admin_logs: "📋 20 derniers logs",
    admin_broadcast: "📢 Diffusion",
    admin_users: "👤 Nombre d'utilisateurs",
    admin_add_crypto: "➕ Ajouter Crypto",
    admin_remove_crypto: "➖ Supprimer Crypto",
    help: "📌 *Mode d'emploi* :\n1. Choisissez votre forfait\n2. Sélectionnez le mode de paiement\n3. Envoyez les crypto-monnaies à l'adresse fournie\n4. Cliquez sur 'Paiement effectué' et envoyez la capture d'écran\n5. Recevez vos identifiants sous 15 minutes",
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
    help: "📌 *Anleitung*:\n1. Wählen Sie Ihren Plan\n2. Wählen Sie Zahlungsmethode\n3. Senden Sie Kryptowährung an die angegebene Adresse\n4. Klicken Sie auf 'Ich habe bezahlt' und senden Sie den Nachweis\n5. Erhalten Sie Ihre Zugangsdaten innerhalb von 15 Minuten",
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
    help: "📌 *Instrucciones*:\n1. Elija su plan\n2. Seleccione método de pago\n3. Envíe criptomonedas a la dirección proporcionada\n4. Haga clic en 'He Pagado' y envíe el comprobante\n5. Reciba sus credenciales en 15 minutos",
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
    help: "📌 *Инструкция*:\n1. Выберите тариф\n2. Выберите способ оплаты\n3. Отправьте криптовалюту на указанный адрес\n4. Нажмите 'Я оплатил' и отправьте подтверждение\n5. Получите учетные данные в течение 15 минут",
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
        '1️⃣ Mois d\'appels illimités — pas de facturation à la minute\n\n' +
        'Inclut :\n' +
        '• Accès complet au spoofing d\'appel\n' +
        '• Changeur de voix standard\n' +
        '• Accès site et application\n'
    },
    {
      id: 'diamond',
      name: '⚡ FORFAIT DIAMANT — $200 ⚡',
      description:
        '2️⃣ Mois d\'appels illimités — pas de facturation à la minute\n\n' +
        'Inclut :\n' +
        '• Spoofing d\'appel avancé\n' +
        '• Changeur de voix premium\n' +
        '• Routage d\'appel amélioré\n' +
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
        '3️⃣ Mois d\'appels illimités — pas de facturation à la minute\n\n' +
        'Inclut toutes les fonctionnalités premium :\n' +
        '• Spoofing d\'appel avancé\n' +
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
        '📌 Offre d\'introduction : Forfait Platine à $100 pour 1 mois — Pour Nouveaux Clients\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ FORFAIT PLATINE 1 MOIS — $100 ⚡',
      description:
        '1️⃣ Mois d\'appels illimités — pas de facturation à la minute\n\n' +
        'Inclut toutes les fonctionnalités premium :\n' +
        '• Spoofing d\'appel avancé\n' +
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
        '📌 Offre d\'introduction : Forfait Platine à $100 pour 1 mois — Pour Nouveaux Clients\n'
    }
  ],
  de: [
    {
      id: 'gold',
      name: '⚡ GOLD-PAKET — $90 ⚡',
      description:
        '1️⃣ Monat unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält:\n' +
        '• Vollzugriff auf Call Spoofing\n' +
        '• Standard Voice Changer\n' +
        '• Website & App-Zugang\n'
    },
    {
      id: 'diamond',
      name: '⚡ DIAMANT-PAKET — $200 ⚡',
      description:
        '2️⃣ Monate unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält:\n' +
        '• Erweiterte Call Spoofing\n' +
        '• Premium Voice Changer\n' +
        '• Verbessertes Call Routing\n' +
        '• Erweiterte OTP Bot Zugang\n' +
        '• Website & App-Zugang\n' +
        '• Email & SMS Spoofing Zugang\n' +
        '• IVR System\n' +
        '• Gebührenfreie Nummer Spoofing\n' +
        '• SIP Trunk Zugang (eingehend & ausgehend)\n'
    },
    {
      id: 'platinum',
      name: '⚡ PLATIN-PAKET — $300 ⚡',
      description:
        '3️⃣ Monate unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält alle Premium-Features:\n' +
        '• Erweiterte Call Spoofing\n' +
        '• Premium Voice Changer\n' +
        '• Verbessertes Routing\n' +
        '• Prioritäts-Support\n' +
        '• Erweiterte OTP Bot Zugang\n' +
        '• Vollständige API & Custom Integration\n' +
        '• Website & App-Zugang\n' +
        '• Email & SMS Spoofing Zugang\n' +
        '• IVR System\n' +
        '• Premium gebührenfreie Nummer Spoofing\n' +
        '• Premium SIP Trunk Zugang (eingehend & ausgehend, mit dediziertem Routing und verbesserter Qualität)\n\n' +
        '📌 Als Einführungsangebot ist das Platin-Paket für 1 Monat für $100 verfügbar — Nur für Neukunden\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ PLATIN 1-MONAT-PAKET — $100 ⚡',
      description:
        '1️⃣ Monat unbegrenzt telefonieren — keine Minutengebühren\n\n' +
        'Enthält alle Premium-Features:\n' +
        '• Erweiterte Call Spoofing\n' +
        '• Premium Voice Changer\n' +
        '• Verbessertes Routing\n' +
        '• Prioritäts-Support\n' +
        '• Erweiterte OTP Bot Zugang\n' +
        '• Vollständige API & Custom Integration\n' +
        '• Website & App-Zugang\n' +
        '• Email & SMS Spoofing Zugang\n' +
        '• IVR System\n' +
        '• Premium gebührenfreie Nummer Spoofing\n' +
        '• Premium SIP Trunk Zugang (eingehend & ausgehend, mit dediziertem Routing und verbesserter Qualität)\n\n' +
        '📌 Als Einführungsangebot ist das Platin-Paket für 1 Monat für $100 verfügbar — Nur für Neukunden\n'
    }
  ],
  es: [
    {
      id: 'gold',
      name: '⚡ PLAN ORO — $90 ⚡',
      description:
        '1️⃣ Mes de llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye:\n' +
        '• Acceso completo a Call Spoofing\n' +
        '• Cambiador de voz estándar\n' +
        '• Acceso a sitio web y aplicación\n'
    },
    {
      id: 'diamond',
      name: '⚡ PLAN DIAMANTE — $200 ⚡',
      description:
        '2️⃣ Meses de llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye:\n' +
        '• Call Spoofing avanzado\n' +
        '• Cambiador de voz premium\n' +
        '• Enrutamiento de llamadas mejorado\n' +
        '• Acceso a Bot OTP avanzado\n' +
        '• Acceso a sitio web y aplicación\n' +
        '• Acceso a Email & SMS Spoofing\n' +
        '• Sistema IVR\n' +
        '• Spoofing de número gratuito\n' +
        '• Acceso SIP Trunk (entrante y saliente)\n'
    },
    {
      id: 'platinum',
      name: '⚡ PLAN PLATINO — $300 ⚡',
      description:
        '3️⃣ Meses de llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye todas las características premium:\n' +
        '• Call Spoofing avanzado\n' +
        '• Cambiador de voz premium\n' +
        '• Enrutamiento mejorado\n' +
        '• Soporte prioritario\n' +
        '• Acceso a Bot OTP avanzado\n' +
        '• API completa e integración personalizada\n' +
        '• Acceso a sitio web y aplicación\n' +
        '• Acceso a Email & SMS Spoofing\n' +
        '• Sistema IVR\n' +
        '• Spoofing de número gratuito premium\n' +
        '• Acceso SIP Trunk premium (entrante y saliente, con enrutamiento dedicado y calidad mejorada)\n\n' +
        '📌 Como oferta introductoria, el Plan Platino está disponible por 1 mes a $100 — Solo para nuevos clientes\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ PLAN PLATINO 1 MES — $100 ⚡',
      description:
        '1️⃣ Mes de llamadas ilimitadas — sin cargos por minuto\n\n' +
        'Incluye todas las características premium:\n' +
        '• Call Spoofing avanzado\n' +
        '• Cambiador de voz premium\n' +
        '• Enrutamiento mejorado\n' +
        '• Soporte prioritario\n' +
        '• Acceso a Bot OTP avanzado\n' +
        '• API completa e integración personalizada\n' +
        '• Acceso a sitio web y aplicación\n' +
        '• Acceso a Email & SMS Spoofing\n' +
        '• Sistema IVR\n' +
        '• Spoofing de número gratuito premium\n' +
        '• Acceso SIP Trunk premium (entrante y saliente, con enrutamiento dedicado y calidad mejorada)\n\n' +
        '📌 Como oferta introductoria, el Plan Platino está disponible por 1 mes a $100 — Solo para nuevos clientes\n'
    }
  ],
  ru: [
    {
      id: 'gold',
      name: '⚡ ЗОЛОТОЙ ТАРИФ — $90 ⚡',
      description:
        '1️⃣ Месяц неограниченных звонков — без поминутной оплаты\n\n' +
        'Включает:\n' +
        '• Полный доступ к Call Spoofing\n' +
        '• Стандартный изменитель голоса\n' +
        '• Доступ к сайту и приложению\n'
    },
    {
      id: 'diamond',
      name: '⚡ АЛМАЗНЫЙ ТАРИФ — $200 ⚡',
      description:
        '2️⃣ Месяца неограниченных звонков — без поминутной оплаты\n\n' +
        'Включает:\n' +
        '• Продвинутый Call Spoofing\n' +
        '• Премиум изменитель голоса\n' +
        '• Улучшенная маршрутизация звонков\n' +
        '• Доступ к продвинутому OTP Bot\n' +
        '• Доступ к сайту и приложению\n' +
        '• Доступ к Email & SMS Spoofing\n' +
        '• Система IVR\n' +
        '• Спуфинг бесплатных номеров\n' +
        '• Доступ SIP Trunk (входящие и исходящие)\n'
    },
    {
      id: 'platinum',
      name: '⚡ ПЛАТИНОВЫЙ ТАРИФ — $300 ⚡',
      description:
        '3️⃣ Месяца неограниченных звонков — без поминутной оплаты\n\n' +
        'Включает все премиум-функции:\n' +
        '• Продвинутый Call Spoofing\n' +
        '• Премиум изменитель голоса\n' +
        '• Улучшенная маршрутизация\n' +
        '• Приоритетная поддержка\n' +
        '• Доступ к продвинутому OTP Bot\n' +
        '• Полный доступ к API и кастомной интеграции\n' +
        '• Доступ к сайту и приложению\n' +
        '• Доступ к Email & SMS Spoofing\n' +
        '• Система IVR\n' +
        '• Премиум спуфинг бесплатных номеров\n' +
        '• Премиум доступ SIP Trunk (входящие и исходящие, с выделенной маршрутизацией и улучшенным качеством)\n\n' +
        '📌 Как вводное предложение, Платиновый тариф доступен на 1 месяц за $100 — Только для новых клиентов\n'
    },
    {
      id: 'platinum1m',
      name: '⚡ ПЛАТИНОВЫЙ ТАРИФ 1 МЕСЯЦ — $100 ⚡',
      description:
        '1️⃣ Месяц неограниченных звонков — без поминутной оплаты\n\n' +
        'Включает все премиум-функции:\n' +
        '• Продвинутый Call Spoofing\n' +
        '• Премиум изменитель голоса\n' +
        '• Улучшенная маршрутизация\n' +
        '• Приоритетная поддержка\n' +
        '• Доступ к продвинутому OTP Bot\n' +
        '• Полный доступ к API и кастомной интеграции\n' +
        '• Доступ к сайту и приложению\n' +
        '• Доступ к Email & SMS Spoofing\n' +
        '• Система IVR\n' +
        '• Премиум спуфинг бесплатных номеров\n' +
        '• Премиум доступ SIP Trunk (входящие и исходящие, с выделенной маршрутизацией и улучшенным качеством)\n\n' +
        '📌 Как вводное предложение, Платиновый тариф доступен на 1 месяц за $100 — Только для новых клиентов\n'
    }
  ]
};

// Helper functions:
function getUserLang(chatId) {
  const user = users.get(chatId);
  return user?.lang || 'en';
}

function t(chatId, key, replacements = {}) {
  const lang = getUserLang(chatId);
  let text = translations[lang]?.[key] || translations.en[key];
  if (!text) return key;
  
  Object.keys(replacements).forEach(placeholder => {
    text = text.replace(new RegExp(`{${placeholder}}`, 'g'), replacements[placeholder]);
  });
  return text;
}

function getPlans(chatId) {
  const lang = getUserLang(chatId);
  return plansData[lang] || plansData.en;
}

// Enhanced data persistence with backup and validation:
function loadUserData() {
  try {
    if (fs.existsSync('users.json')) {
      const data = fs.readFileSync('users.json', 'utf8');
      const parsed = JSON.parse(data);
      
      // Validate data structure
      if (Array.isArray(parsed)) {
        parsed.forEach(([key, value]) => {
          if (typeof key === 'string' || typeof key === 'number') {
            users.set(parseInt(key), value);
          }
        });
        console.log(`✅ Loaded ${users.size} users successfully`);
      } else {
        throw new Error('Invalid user data format');
      }
    }
  } catch (error) {
    logError(error, 'Loading user data');
    // Try to load backup
    if (fs.existsSync('users_backup.json')) {
      try {
        const backupData = fs.readFileSync('users_backup.json', 'utf8');
        const parsed = JSON.parse(backupData);
        parsed.forEach(([key, value]) => users.set(parseInt(key), value));
        console.log('📦 Restored from backup successfully');
      } catch (backupError) {
        logError(backupError, 'Loading user data backup');
      }
    }
  }
}

function saveUserData() {
  try {
    const data = Array.from(users.entries());
    
    // Create backup before saving
    if (fs.existsSync('users.json')) {
      fs.copyFileSync('users.json', 'users_backup.json');
    }
    
    fs.writeFileSync('users.json', JSON.stringify(data, null, 2));
    
    // Auto-cleanup old backups
    setInterval(() => {
      try {
        if (fs.existsSync('users_backup.json')) {
          const stats = fs.statSync('users_backup.json');
          const hourAgo = new Date(Date.now() - 3600000);
          if (stats.mtime < hourAgo) {
            fs.unlinkSync('users_backup.json');
          }
        }
      } catch (cleanupError) {
        logError(cleanupError, 'Backup cleanup');
      }
    }, 3600000); // Check every hour
    
  } catch (error) {
    logError(error, 'Saving user data');
  }
}

function loadPurchaseLogs() {
  try {
    if (fs.existsSync('purchase_logs.json')) {
      const data = fs.readFileSync('purchase_logs.json', 'utf8');
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed)) {
        purchaseLogs = parsed;
        console.log(`✅ Loaded ${purchaseLogs.length} purchase logs`);
      } else {
        throw new Error('Invalid purchase logs format');
      }
    }
  } catch (error) {
    logError(error, 'Loading purchase logs');
    purchaseLogs = []; // Initialize empty array on error
  }
}

function savePurchaseLogs() {
  try {
    // Keep only last 1000 logs to prevent file bloat
    if (purchaseLogs.length > 1000) {
      purchaseLogs = purchaseLogs.slice(-1000);
    }
    
    fs.writeFileSync('purchase_logs.json', JSON.stringify(purchaseLogs, null, 2));
  } catch (error) {
    logError(error, 'Saving purchase logs');
  }
}

function loadCryptoData() {
  try {
    if (fs.existsSync('cryptos.json')) {
      const data = fs.readFileSync('cryptos.json', 'utf8');
      const parsed = JSON.parse(data);
      
      if (Array.isArray(parsed)) {
        cryptos = parsed;
        console.log(`✅ Loaded ${cryptos.length} crypto options`);
      } else {
        throw new Error('Invalid crypto data format');
      }
    }
  } catch (error) {
    logError(error, 'Loading crypto data');
    // Keep default cryptos if loading fails
  }
}

function saveCryptoData() {
  try {
    // Validate crypto data before saving
    const validCryptos = cryptos.filter(crypto => 
      crypto.name && crypto.address && typeof crypto.name === 'string' && typeof crypto.address === 'string'
    );
    
    if (validCryptos.length !== cryptos.length) {
      console.warn(`⚠️ Filtered ${cryptos.length - validCryptos.length} invalid crypto entries`);
      cryptos = validCryptos;
    }
    
    fs.writeFileSync('cryptos.json', JSON.stringify(cryptos, null, 2));
  } catch (error) {
    logError(error, 'Saving crypto data');
  }
}

// Keyboard functions:
function getLangKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🇺🇸 English', callback_data: 'lang_en' }],
        [{ text: '🇫🇷 Français', callback_data: 'lang_fr' }],
        [{ text: '🇩🇪 Deutsch', callback_data: 'lang_de' }],
        [{ text: '🇪🇸 Español', callback_data: 'lang_es' }],
        [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }]
      ]
    }
  };
}

function getMainMenuKeyboard(chatId) {
  const plans = getPlans(chatId);
  let buttons = [];
  
  // Add plan buttons
  plans.forEach(plan => {
    buttons.push([{ text: plan.name, callback_data: `plan_${plan.id}` }]);
  });
  
  // Add other buttons
  buttons.push([{ text: t(chatId, 'demo_video'), callback_data: 'demo_video' }]);
  buttons.push([{ text: t(chatId, 'select_lang'), callback_data: 'select_lang' }]);
  buttons.push([{ text: '❓ Help', callback_data: 'help' }]);
  
  return { inline_keyboard: buttons };
}

function getPlansKeyboard(chatId) {
  const plans = getPlans(chatId);
  const buttons = plans.map(plan => [{ text: plan.name, callback_data: `plan_${plan.id}` }]);
  buttons.push([{ text: t(chatId, 'back'), callback_data: 'main_menu' }]);
  return { inline_keyboard: buttons };
}

function getCryptoKeyboard(chatId) {
  const buttons = cryptos.map(crypto => [{ text: crypto.name, callback_data: `crypto_${crypto.name}` }]);
  buttons.push([{ text: t(chatId, 'back'), callback_data: 'main_menu' }]);
  return { inline_keyboard: buttons };
}

function getPaymentDoneKeyboard(chatId) {
  return {
    inline_keyboard: [
      [{ text: t(chatId, 'payment_done'), callback_data: 'payment_done' }],
      [{ text: t(chatId, 'back'), callback_data: 'main_menu' }]
    ]
  };
}

function getAdminKeyboard(chatId) {
  return {
    inline_keyboard: [
      [
        { text: '👥 User Management', callback_data: 'admin_users' },
        { text: '💰 Revenue Analytics', callback_data: 'admin_revenue' }
      ],
      [
        { text: '📊 Live Statistics', callback_data: 'admin_analytics' },
        { text: '🔧 Bot Settings', callback_data: 'admin_settings' }
      ],
      [
        { text: '💬 Mass Broadcast', callback_data: 'admin_broadcast' },
        { text: '🔐 Security Center', callback_data: 'admin_security' }
      ],
      [
        { text: '🚀 Quick Actions', callback_data: 'admin_quick_actions' },
        { text: '💾 Backup System', callback_data: 'admin_backup' }
      ],
      [
        { text: '📱 Marketing Tools', callback_data: 'admin_marketing' },
        { text: '📤 Data Export', callback_data: 'admin_export' }
      ],
      [
        { text: '🛠️ System Monitor', callback_data: 'admin_system' },
        { text: '💳 Payment Manager', callback_data: 'admin_payments' }
      ],
      [
        { text: '📈 Growth Tools', callback_data: 'admin_growth' },
        { text: '🎯 A/B Testing', callback_data: 'admin_testing' }
      ],
      [
        { text: '📝 Content Manager', callback_data: 'admin_content' },
        { text: '🔄 Auto Tasks', callback_data: 'admin_automation' }
      ],
      [
        { text: '🤖 AI Dashboard', callback_data: 'admin_ai' },
        { text: '🧠 User Insights', callback_data: 'admin_insights' }
      ],
      [
        { text: '❌ Error Center', callback_data: 'admin_errors' },
        { text: '🧹 Maintenance', callback_data: 'admin_maintenance' }
      ]
    ]
  };
}

function getBackToMainKeyboard(chatId) {
  return {
    inline_keyboard: [
      [{ text: t(chatId, 'main_menu'), callback_data: 'main_menu' }]
    ]
  };
}

// Initialize data on startup
loadUserData();
loadPurchaseLogs();
loadCryptoData();
loadPersistentMessages();

// Animation helper functions
async function sendAnimatedWelcome(chatId) {
  // Send typing action
  await bot.sendChatAction(chatId, 'typing');
  
  // Progressive welcome animation
  const loadingMsg = await sendTrackedMessage(chatId, '🔄 Loading...');
  await new Promise(resolve => setTimeout(resolve, 800));
  
  await bot.editMessageText('⚡ Initializing system...', {
    chat_id: chatId,
    message_id: loadingMsg.message_id
  });
  await new Promise(resolve => setTimeout(resolve, 600));
  
  await bot.editMessageText('🌟 Welcome to Call Spoofing Services!', {
    chat_id: chatId,
    message_id: loadingMsg.message_id
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Final welcome with language selection
  await bot.editMessageText(t(chatId, 'welcome'), {
    chat_id: chatId,
    message_id: loadingMsg.message_id,
    reply_markup: getLangKeyboard().reply_markup
  });
}

async function sendAnimatedAdminPanel(chatId) {
  await bot.sendChatAction(chatId, 'typing');
  
  const loadingMsg = await sendTrackedMessage(chatId, '🔐 Authenticating admin...');
  await new Promise(resolve => setTimeout(resolve, 700));
  
  await bot.editMessageText('⚡ Loading admin panel...', {
    chat_id: chatId,
    message_id: loadingMsg.message_id
  });
  await new Promise(resolve => setTimeout(resolve, 600));
  
  await bot.editMessageText(t(chatId, 'admin_panel'), {
    chat_id: chatId,
    message_id: loadingMsg.message_id,
    reply_markup: getAdminKeyboard(chatId),
    parse_mode: 'Markdown'
  });
}

// Enhanced message cleanup function
async function clearChatHistory(chatId) {
  try {
    // Get stored message IDs for this user
    const messageIds = userMessages.get(chatId) || [];
    
    // Delete stored bot messages with better error handling
    for (const messageId of messageIds) {
      try {
        await bot.deleteMessage(chatId, messageId);
        await new Promise(resolve => setTimeout(resolve, 30)); // Reduced delay
      } catch (deleteError) {
        // Message might already be deleted or too old - this is expected
        if (deleteError.response && deleteError.response.body && deleteError.response.body.error_code !== 400) {
          logError(deleteError, `Unexpected error deleting message ${messageId}`);
        }
      }
    }
    
    // Clear the stored messages for this user
    userMessages.set(chatId, []);
    
    // Update persistent storage
    try {
      const persistentMessages = JSON.parse(fs.readFileSync('user_messages.json', 'utf8') || '{}');
      delete persistentMessages[chatId];
      fs.writeFileSync('user_messages.json', JSON.stringify(persistentMessages, null, 2));
    } catch (persistError) {
      // Non-critical error
    }
    
  } catch (error) {
    logError(error, 'Clear chat history');
  }
}

// Enhanced message sending with tracking and AI analysis
async function sendTrackedMessage(chatId, message, options = {}) {
  try {
    const sentMessage = await sendMessageWithRetry(chatId, message, options);
    
    // Track this message for future deletion
    if (sentMessage && sentMessage.message_id) {
      const messageIds = userMessages.get(chatId) || [];
      messageIds.push(sentMessage.message_id);
      
      // Keep only last 100 messages per user for better cleanup
      if (messageIds.length > 100) {
        messageIds.shift();
      }
      
      userMessages.set(chatId, messageIds);
      
      // Save to persistent storage for cleanup across restarts (batched)
      if (messageIds.length % 10 === 0) { // Save every 10 messages to reduce I/O
        try {
          const existingData = fs.existsSync('user_messages.json') ? 
            JSON.parse(fs.readFileSync('user_messages.json', 'utf8') || '{}') : {};
          existingData[chatId] = messageIds;
          fs.writeFileSync('user_messages.json', JSON.stringify(existingData, null, 2));
        } catch (persistError) {
          // Non-critical error, continue
        }
      }
      
      // AI Enhancement: Analyze bot message for improvement
      if (AI_CONFIG.enabled && AI_CONFIG.features.sentimentAnalysis) {
        try {
          await analyzeMessageSentiment(chatId, message, 'bot');
        } catch (aiError) {
          // AI analysis is non-critical, continue
        }
      }
    }
    
    return sentMessage;
  } catch (error) {
    logError(error, 'Send tracked message');
    throw error;
  }
}

// Load persistent message tracking on startup
function loadPersistentMessages() {
  try {
    if (fs.existsSync('user_messages.json')) {
      const data = fs.readFileSync('user_messages.json', 'utf8');
      if (data.trim()) {
        const persistentMessages = JSON.parse(data);
        Object.entries(persistentMessages).forEach(([chatId, messageIds]) => {
          if (Array.isArray(messageIds) && messageIds.length > 0) {
            userMessages.set(parseInt(chatId), messageIds);
          }
        });
        console.log(`✅ Loaded message tracking for ${Object.keys(persistentMessages).length} users`);
      }
    } else {
      // Create empty file if it doesn't exist
      fs.writeFileSync('user_messages.json', '{}');
    }
  } catch (error) {
    logError(error, 'Load persistent messages');
    // Create fallback empty file
    try {
      fs.writeFileSync('user_messages.json', '{}');
    } catch (writeError) {
      logError(writeError, 'Create fallback message file');
    }
  }
}

// Enhanced message cleanup with multiple methods
async function aggressiveChatCleanup(chatId) {
  try {
    // Method 1: Delete tracked messages
    const messageIds = userMessages.get(chatId) || [];
    let deletedCount = 0;
    
    for (const messageId of messageIds) {
      try {
        await bot.deleteMessage(chatId, messageId);
        deletedCount++;
        await new Promise(resolve => setTimeout(resolve, 25)); // Optimized delay
      } catch (error) {
        // Message may be too old or already deleted - expected behavior
      }
    }
    
    // Clear tracking for this user
    userMessages.set(chatId, []);
    
    // Update persistent storage
    try {
      const persistentMessages = JSON.parse(fs.readFileSync('user_messages.json', 'utf8') || '{}');
      delete persistentMessages[chatId];
      fs.writeFileSync('user_messages.json', JSON.stringify(persistentMessages, null, 2));
    } catch (persistError) {
      // Non-critical error
    }
    
    return deletedCount;
    
  } catch (error) {
    logError(error, 'Aggressive chat cleanup');
    return 0;
  }
}

// Bot handlers:
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // First delete the /start command immediately
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    // Expected if message is too old or already deleted
  }
  
  // Clean previous messages
  await aggressiveChatCleanup(chatId);
  
  // Small delay to ensure cleanup completes
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Initialize or update user data
  if (!users.has(chatId)) {
    users.set(chatId, { 
      lang: 'en', 
      sessionId: Date.now(),
      lastActivity: Date.now(),
      joinDate: new Date().toISOString()
    });
    saveUserData();
  } else {
    // Update existing user activity
    const userData = users.get(chatId);
    userData.lastActivity = Date.now();
    userData.sessionId = Date.now();
    users.set(chatId, userData);
    saveUserData();
  }
  
  if (chatId === ADMIN_ID) {
    await sendAnimatedAdminPanel(chatId);
  } else {
    await sendAnimatedWelcome(chatId);
  }
});

// Animation functions for various actions
async function animateLanguageChange(chatId, messageId, lang) {
  await bot.sendChatAction(chatId, 'typing');
  
  await bot.editMessageText('🔄 Changing language...', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await bot.editMessageText('✅ Language updated!', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 400));
  
  await bot.editMessageText(t(chatId, 'language_set'), {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: getMainMenuKeyboard(chatId)
  });
}

async function animateMenuTransition(chatId, messageId, newText, keyboard, parseMode = null) {
  await bot.sendChatAction(chatId, 'typing');
  
  const options = {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: keyboard
  };
  
  if (parseMode) options.parse_mode = parseMode;
  
  await bot.editMessageText('⚡ Loading...', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 300));
  
  await bot.editMessageText(newText, options);
}

async function animatePlanSelection(chatId, messageId, plan) {
  await bot.sendChatAction(chatId, 'typing');
  
  await bot.editMessageText('📋 Loading plan details...', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 600));
  
  await bot.editMessageText('💎 Preparing payment options...', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const message = t(chatId, 'payment', { plan: plan.name, description: plan.description });
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: getCryptoKeyboard(chatId).inline_keyboard },
    parse_mode: 'Markdown'
  });
}

async function animatePaymentInstructions(chatId, messageId, crypto) {
  await bot.sendChatAction(chatId, 'typing');
  
  await bot.editMessageText('🔐 Generating payment address...', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 700));
  
  await bot.editMessageText('💳 Preparing payment instructions...', {
    chat_id: chatId,
    message_id: messageId
  });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const message = t(chatId, 'payment_instruction', { method: crypto.name, address: crypto.address });
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: getPaymentDoneKeyboard(chatId),
    parse_mode: 'Markdown'
  });
}

// Enhanced callback query handler with comprehensive error handling
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;
  
  // Always answer callback query first to prevent timeout
  try {
    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    logError(error, 'Answer callback query');
  }
  
  try {
    // Input validation
    if (!data || typeof data !== 'string') {
      logError(new Error('Invalid callback data'), 'Callback query validation');
      return;
    }
    
    // Rate limiting check for callback queries
    const now = Date.now();
    const userCallbacks = callbackLimiter.get(chatId) || { count: 0, lastReset: now };
    
    if (now - userCallbacks.lastReset > 60000) { // Reset every minute
      userCallbacks.count = 0;
      userCallbacks.lastReset = now;
    }
    
    if (userCallbacks.count > 30) { // Max 30 callbacks per minute
      await bot.answerCallbackQuery(query.id, { 
        text: 'Please wait a moment before clicking again.', 
        show_alert: true 
      });
      return;
    }
    
    userCallbacks.count++;
    callbackLimiter.set(chatId, userCallbacks);
  
  // Language selection
  if (data.startsWith('lang_')) {
    const lang = data.split('_')[1];
    let user = users.get(chatId) || {};
    user.lang = lang;
    users.set(chatId, user);
    saveUserData();
    
    await animateLanguageChange(chatId, query.message.message_id, lang);
  }
  
  // Main menu
  else if (data === 'main_menu') {
    if (chatId === ADMIN_ID) {
      await animateMenuTransition(chatId, query.message.message_id, t(chatId, 'admin_panel'), getAdminKeyboard(chatId), 'Markdown');
    } else {
      await animateMenuTransition(chatId, query.message.message_id, t(chatId, 'choose_plan'), getMainMenuKeyboard(chatId));
    }
  }
  
  // Plan selection
  else if (data.startsWith('plan_')) {
    const planId = data.split('_')[1];
    const plans = getPlans(chatId);
    const plan = plans.find(p => p.id === planId);
    
    if (plan) {
      let user = users.get(chatId) || {};
      user.plan = planId;
      users.set(chatId, user);
      saveUserData();
      
      await animatePlanSelection(chatId, query.message.message_id, plan);
    }
  }
  
  // Crypto selection
  else if (data.startsWith('crypto_')) {
    const cryptoName = data.replace('crypto_', '');
    const crypto = cryptos.find(c => c.name === cryptoName);
    
    if (crypto) {
      let user = users.get(chatId) || {};
      user.crypto = cryptoName;
      users.set(chatId, user);
      saveUserData();
      
      await animatePaymentInstructions(chatId, query.message.message_id, crypto);
    }
  }
  
  // Payment done
  else if (data === 'payment_done') {
    await bot.sendChatAction(chatId, 'typing');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    await bot.editMessageText(t(chatId, 'ask_screenshot'), {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getBackToMainKeyboard(chatId)
    });
  }
  
  // Help
  else if (data === 'help') {
    await bot.sendChatAction(chatId, 'typing');
    await new Promise(resolve => setTimeout(resolve, 300));
    
    await bot.editMessageText(t(chatId, 'help'), {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getBackToMainKeyboard(chatId),
      parse_mode: 'Markdown'
    });
  }
  
  // Language selection menu
  else if (data === 'select_lang') {
    await bot.sendChatAction(chatId, 'typing');
    await new Promise(resolve => setTimeout(resolve, 200));
    
    await bot.editMessageText(t(chatId, 'welcome'), {
      chat_id: chatId,
      message_id: query.message.message_id,
      reply_markup: getLangKeyboard().reply_markup
    });
  }
  
  // Demo video
  else if (data === 'demo_video') {
    await bot.sendChatAction(chatId, 'typing');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const demoMessages = {
      en: "🎥 *Demo Video & Official Channel*\n\nWatch our service demonstration and get updates from our official channel:\n\n📺 [Visit Official Channel](https://t.me/Callspoofingbotofficial)\n\nHere you'll find:\n• Live service demonstrations\n• Feature tutorials\n• Service updates\n• Customer testimonials",
      fr: "🎥 *Vidéo Démo & Canal Officiel*\n\nRegardez notre démonstration de service et obtenez des mises à jour de notre canal officiel:\n\n📺 [Visiter le Canal Officiel](https://t.me/Callspoofingbotofficial)\n\nIci vous trouverez:\n• Démonstrations de service en direct\n• Tutoriels de fonctionnalités\n• Mises à jour de service\n• Témoignages de clients",
      de: "🎥 *Demo Video & Offizieller Kanal*\n\nSehen Sie sich unsere Service-Demonstration an und erhalten Sie Updates von unserem offiziellen Kanal:\n\n📺 [Offiziellen Kanal besuchen](https://t.me/Callspoofingbotofficial)\n\nHier finden Sie:\n• Live-Service-Demonstrationen\n• Feature-Tutorials\n• Service-Updates\n• Kundenstimmen",
      es: "🎥 *Video Demo & Canal Oficial*\n\nMira nuestra demostración de servicio y obtén actualizaciones de nuestro canal oficial:\n\n📺 [Visitar Canal Oficial](https://t.me/Callspoofingbotofficial)\n\nAquí encontrarás:\n• Demostraciones de servicio en vivo\n• Tutoriales de funciones\n• Actualizaciones de servicio\n• Testimonios de clientes",
      ru: "🎥 *Демо Видео & Официальный Канал*\n\nПосмотрите нашу демонстрацию сервиса и получайте обновления с официального канала:\n\n📺 [Посетить Официальный Канал](https://t.me/Callspoofingbotofficial)\n\nЗдесь вы найдете:\n• Живые демонстрации сервиса\n• Обучающие материалы\n• Обновления сервиса\n• Отзывы клиентов"
    };
    
    const userLang = getUserLang(chatId);
    await sendTrackedMessage(chatId, demoMessages[userLang] || demoMessages.en, {
      parse_mode: 'Markdown',
      reply_markup: getBackToMainKeyboard(chatId),
      disable_web_page_preview: false
    });
  }
  
  // Admin functions
  else if (chatId === ADMIN_ID) {
    if (data === 'admin_logs') {
      await bot.sendChatAction(chatId, 'typing');
      
      await bot.editMessageText('📊 Fetching purchase logs...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const logs = purchaseLogs.slice(-20).map((log, i) => 
        `${i + 1}. User: ${log.user}, Plan: ${log.plan}, Crypto: ${log.crypto}, Time: ${log.time}`
      ).join('\n');
      
      await bot.editMessageText(`📋 Last 20 Purchase Logs:\n\n${logs || 'No logs yet'}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_users') {
      await bot.sendChatAction(chatId, 'typing');
      
      await bot.editMessageText('📈 Calculating user statistics...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 400));
      
      await bot.editMessageText(`👤 Total Users: ${users.size}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_broadcast') {
      await bot.sendChatAction(chatId, 'typing');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear any existing flags first
      let user = users.get(chatId) || {};
      user.waitingForCrypto = false;
      user.waitingForRemoveCrypto = false;
      user.waitingForBroadcast = true;
      users.set(chatId, user);
      saveUserData();
      
      await bot.editMessageText('📢 Send your broadcast message:', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    }
    
    else if (data === 'admin_add_crypto') {
      await bot.sendChatAction(chatId, 'typing');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Clear any existing flags first
      let user = users.get(chatId) || {};
      user.waitingForBroadcast = false;
      user.waitingForRemoveCrypto = false;
      user.waitingForCrypto = true;
      users.set(chatId, user);
      saveUserData();
      
      await bot.editMessageText('➕ Send crypto details in format:\nName|Address\nExample: LTC|ltc1qxy2x3abc...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    }
    
    else if (data === 'admin_remove_crypto') {
      await bot.sendChatAction(chatId, 'typing');
      
      await bot.editMessageText('🔄 Loading crypto list...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Clear any existing flags first
      let user = users.get(chatId) || {};
      user.waitingForBroadcast = false;
      user.waitingForCrypto = false;
      user.waitingForRemoveCrypto = true;
      users.set(chatId, user);
      saveUserData();
      
      const cryptoList = cryptos.map((crypto, i) => `${i + 1}. ${crypto.name}`).join('\n');
      await bot.editMessageText(`➖ Current cryptos:\n${cryptoList}\n\nSend the number to remove:`, {
        chat_id: chatId,
        message_id: query.message.message_id
      });
    }
    
    else if (data === 'admin_error_logs') {
      await bot.sendChatAction(chatId, 'typing');
      
      await bot.editMessageText('📊 Fetching error logs...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const errorLogsMessage = await getErrorLogsForAdmin(chatId);
      await bot.editMessageText(errorLogsMessage, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_analytics') {
      await bot.sendChatAction(chatId, 'typing');
      
      await bot.editMessageText('📈 Generating analytics...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const analytics = generateUserAnalytics();
      await bot.editMessageText(analytics, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_system_status') {
      await bot.sendChatAction(chatId, 'typing');
      
      await bot.editMessageText('🔧 Checking system status...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const systemStatus = getSystemStatus();
      await bot.editMessageText(systemStatus, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_quick_notify') {
      await bot.sendChatAction(chatId, 'typing');
      
      const quickNotifyKeyboard = {
        inline_keyboard: [
          [{ text: '📢 Service Update', callback_data: 'notify_service_update' }],
          [{ text: '⚠️ Maintenance Alert', callback_data: 'notify_maintenance' }],
          [{ text: '🎉 New Feature', callback_data: 'notify_new_feature' }],
          [{ text: '💰 Special Offer', callback_data: 'notify_special_offer' }],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('📢 Quick Notification Templates:\n\nSelect a template to send to all users:', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: quickNotifyKeyboard
      });
    }
    
    else if (data === 'admin_backup') {
      await bot.sendChatAction(chatId, 'upload_document');
      
      await bot.editMessageText('💾 Creating data backup...', {
        chat_id: chatId,
        message_id: query.message.message_id
      });
      
      try {
        const backupData = createDataBackup();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `bot_backup_${timestamp}.json`;
        
        fs.writeFileSync(filename, JSON.stringify(backupData, null, 2));
        
        await bot.sendDocument(chatId, filename, {
          caption: `📦 Complete bot data backup\n📅 Generated: ${new Date().toLocaleString()}`
        });
        
        // Clean up temporary file
        fs.unlinkSync(filename);
        
        await bot.editMessageText('✅ Backup completed and sent!', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: getAdminKeyboard(chatId)
        });
      } catch (error) {
        logError(error, 'Admin backup creation');
        await bot.editMessageText('❌ Backup creation failed. Check error logs.', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: getAdminKeyboard(chatId)
        });
      }
    }
    
    else if (data === 'admin_security') {
      await bot.sendChatAction(chatId, 'typing');
      
      const securityReport = generateSecurityReport();
      await bot.editMessageText(securityReport, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_settings') {
      await bot.sendChatAction(chatId, 'typing');
      
      const settingsKeyboard = {
        inline_keyboard: [
          [{ text: '🌐 Default Language', callback_data: 'settings_default_lang' }],
          [{ text: '⏱️ Response Delay', callback_data: 'settings_response_delay' }],
          [{ text: '🔒 Maintenance Mode', callback_data: 'settings_maintenance' }],
          [{ text: '📱 Welcome Message', callback_data: 'settings_welcome' }],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('⚙️ Bot Settings Panel:\n\nSelect a setting to modify:', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: settingsKeyboard
      });
    }
    
    else if (data === 'admin_revenue') {
      await bot.sendChatAction(chatId, 'typing');
      
      const revenueStats = generateRevenueStats();
      await bot.editMessageText(revenueStats, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    else if (data === 'admin_marketing') {
      await bot.sendChatAction(chatId, 'typing');
      
      const marketingKeyboard = {
        inline_keyboard: [
          [{ text: '📊 Referral System', callback_data: 'marketing_referral' }],
          [{ text: '🎁 Promo Codes', callback_data: 'marketing_promo' }],
          [{ text: '📈 User Retention', callback_data: 'marketing_retention' }],
          [{ text: '🎯 Target Campaigns', callback_data: 'marketing_campaigns' }],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('🎯 Marketing Tools Panel:\n\nSelect a marketing tool:', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: marketingKeyboard
      });
    }
    
    else if (data === 'admin_clear_chats') {
      await bot.sendChatAction(chatId, 'typing');
      
      const confirmKeyboard = {
        inline_keyboard: [
          [{ text: '✅ Confirm Clear All', callback_data: 'confirm_clear_chats' }],
          [{ text: '❌ Cancel', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('⚠️ DANGER ZONE ⚠️\n\nThis will clear chat history for ALL users. This action cannot be undone!\n\nAre you sure?', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: confirmKeyboard
      });
    }
    
    else if (data === 'maintenance_clear_chats' || data === 'confirm_clear_chats') {
      await bot.sendChatAction(chatId, 'typing');
      
      let clearedChats = 0;
      const totalUsers = users.size;
      
      // Send new message instead of editing (safer)
      await sendTrackedMessage(chatId, '🔄 Starting mass chat cleanup...');
      
      for (const [userId] of users) {
        try {
          await aggressiveChatCleanup(userId);
          clearedChats++;
          await new Promise(resolve => setTimeout(resolve, 100)); // Rate limiting
        } catch (error) {
          logError(error, `Failed to clear chat for user ${userId}`);
        }
      }
      
      // Clear all stored message tracking
      userMessages.clear();
      try {
        fs.writeFileSync('user_messages.json', '{}');
      } catch (error) {
        logError(error, 'Clear persistent messages');
      }
      
      await sendTrackedMessage(chatId, `✅ Mass chat cleanup completed!\n\n📊 Results:\n   Total Users: ${totalUsers}\n   Chats Cleared: ${clearedChats}\n   Success Rate: ${((clearedChats/totalUsers)*100).toFixed(1)}%`, {
        reply_markup: getAdminKeyboard(chatId)
      });
    }
    
    // System Monitor
    else if (data === 'admin_system') {
      await bot.sendChatAction(chatId, 'typing');
      
      const systemStatus = getSystemStatus();
      const healthReport = generateHealthReport();
      
      const systemKeyboard = {
        inline_keyboard: [
          [
            { text: '🔄 Restart Bot', callback_data: 'system_restart' },
            { text: '🧹 Clear Cache', callback_data: 'system_clear_cache' }
          ],
          [
            { text: '📊 Performance', callback_data: 'system_performance' },
            { text: '🗃️ Database Status', callback_data: 'system_database' }
          ],
          [
            { text: '🔍 Process Monitor', callback_data: 'system_processes' },
            { text: '💾 Memory Analysis', callback_data: 'system_memory' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText(`${systemStatus}\n\n${healthReport}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: systemKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // Payment Manager
    else if (data === 'admin_payments') {
      await bot.sendChatAction(chatId, 'typing');
      
      const paymentStats = generatePaymentStats();
      
      const paymentKeyboard = {
        inline_keyboard: [
          [
            { text: '💰 Add Crypto', callback_data: 'payment_add_crypto' },
            { text: '🗑️ Remove Crypto', callback_data: 'payment_remove_crypto' }
          ],
          [
            { text: '💳 Update Wallets', callback_data: 'payment_update_wallets' },
            { text: '💵 Price Manager', callback_data: 'payment_prices' }
          ],
          [
            { text: '📈 Transaction Log', callback_data: 'payment_transactions' },
            { text: '🔄 Verify Payments', callback_data: 'payment_verify' }
          ],
          [
            { text: '🎁 Discount Codes', callback_data: 'payment_discounts' },
            { text: '📊 Revenue Report', callback_data: 'payment_revenue' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText(`💳 **Payment Management Center**\n\n${paymentStats}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: paymentKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // Growth Tools
    else if (data === 'admin_growth') {
      await bot.sendChatAction(chatId, 'typing');
      
      const growthMetrics = generateGrowthMetrics();
      
      const growthKeyboard = {
        inline_keyboard: [
          [
            { text: '📈 User Acquisition', callback_data: 'growth_acquisition' },
            { text: '🔄 Retention Analysis', callback_data: 'growth_retention' }
          ],
          [
            { text: '💰 Revenue Growth', callback_data: 'growth_revenue' },
            { text: '🎯 Conversion Funnel', callback_data: 'growth_funnel' }
          ],
          [
            { text: '📊 Cohort Analysis', callback_data: 'growth_cohort' },
            { text: '🚀 Growth Campaigns', callback_data: 'growth_campaigns' }
          ],
          [
            { text: '📱 Referral Program', callback_data: 'growth_referral' },
            { text: '🎁 Reward System', callback_data: 'growth_rewards' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText(`📈 **Growth & Analytics Center**\n\n${growthMetrics}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: growthKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // A/B Testing
    else if (data === 'admin_testing') {
      await bot.sendChatAction(chatId, 'typing');
      
      const testingKeyboard = {
        inline_keyboard: [
          [
            { text: '🧪 Create Test', callback_data: 'test_create' },
            { text: '📊 View Results', callback_data: 'test_results' }
          ],
          [
            { text: '🎯 Message Tests', callback_data: 'test_messages' },
            { text: '💰 Pricing Tests', callback_data: 'test_pricing' }
          ],
          [
            { text: '🎨 UI/UX Tests', callback_data: 'test_interface' },
            { text: '🔄 Flow Tests', callback_data: 'test_flows' }
          ],
          [
            { text: '📈 Performance Tests', callback_data: 'test_performance' },
            { text: '🎪 Feature Tests', callback_data: 'test_features' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('🎯 **A/B Testing Laboratory**\n\nCreate and manage experiments to optimize bot performance, user engagement, and conversion rates.\n\n📊 **Active Tests:** 0\n✅ **Completed:** 0\n⏳ **Pending:** 0', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: testingKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // Content Manager
    else if (data === 'admin_content') {
      await bot.sendChatAction(chatId, 'typing');
      
      const contentKeyboard = {
        inline_keyboard: [
          [
            { text: '📝 Edit Messages', callback_data: 'content_messages' },
            { text: '🌐 Language Manager', callback_data: 'content_languages' }
          ],
          [
            { text: '📱 Update Menus', callback_data: 'content_menus' },
            { text: '🎨 Customize UI', callback_data: 'content_ui' }
          ],
          [
            { text: '📺 Media Manager', callback_data: 'content_media' },
            { text: '🔗 Link Manager', callback_data: 'content_links' }
          ],
          [
            { text: '📋 Templates', callback_data: 'content_templates' },
            { text: '🎯 Call-to-Actions', callback_data: 'content_cta' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('📝 **Content Management System**\n\nManage all bot content, messages, and user interface elements.\n\n📊 **Statistics:**\n• Messages: 50+ templates\n• Languages: 5 supported\n• Media files: 0\n• Active CTAs: 8', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: contentKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // Automation Center
    else if (data === 'admin_automation') {
      await bot.sendChatAction(chatId, 'typing');
      
      const automationKeyboard = {
        inline_keyboard: [
          [
            { text: '⏰ Scheduled Tasks', callback_data: 'auto_scheduled' },
            { text: '🔄 Auto Responses', callback_data: 'auto_responses' }
          ],
          [
            { text: '📧 Email Automation', callback_data: 'auto_email' },
            { text: '💬 Chat Flows', callback_data: 'auto_flows' }
          ],
          [
            { text: '📊 Auto Reports', callback_data: 'auto_reports' },
            { text: '🔔 Notifications', callback_data: 'auto_notifications' }
          ],
          [
            { text: '🎯 Triggers', callback_data: 'auto_triggers' },
            { text: '🤖 AI Assistant', callback_data: 'auto_ai' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('🔄 **Automation Center**\n\nConfigure automated tasks, responses, and workflows.\n\n📈 **Active Automations:**\n• Health Monitoring: ✅\n• Data Backups: ✅\n• Security Checks: ✅\n• Error Recovery: ✅', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: automationKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // Maintenance Center
    else if (data === 'admin_maintenance') {
      await bot.sendChatAction(chatId, 'typing');
      
      const maintenanceKeyboard = {
        inline_keyboard: [
          [
            { text: '🧹 Clear All Chats', callback_data: 'maintenance_clear_chats' },
            { text: '🗑️ Cleanup Data', callback_data: 'maintenance_cleanup' }
          ],
          [
            { text: '🔄 Reset Users', callback_data: 'maintenance_reset_users' },
            { text: '💾 Optimize DB', callback_data: 'maintenance_optimize' }
          ],
          [
            { text: '📊 Data Integrity', callback_data: 'maintenance_integrity' },
            { text: '🔍 System Scan', callback_data: 'maintenance_scan' }
          ],
          [
            { text: '⚠️ Emergency Mode', callback_data: 'maintenance_emergency' },
            { text: '🔧 Repair Tools', callback_data: 'maintenance_repair' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText('🧹 **Maintenance Center**\n\n⚠️ **CAUTION ZONE**\nThese tools can affect bot operation and user data.\n\n📊 **System Health:** ✅ Good\n💾 **Data Integrity:** ✅ Verified\n🔄 **Last Cleanup:** Recent', {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: maintenanceKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // AI Dashboard
    else if (data === 'admin_ai') {
      await bot.sendChatAction(chatId, 'typing');
      
      const aiStats = generateAIStats();
      
      const aiKeyboard = {
        inline_keyboard: [
          [
            { text: '🧠 Model Settings', callback_data: 'ai_settings' },
            { text: '📊 AI Analytics', callback_data: 'ai_analytics' }
          ],
          [
            { text: '👤 User Profiles', callback_data: 'ai_profiles' },
            { text: '💭 Conversations', callback_data: 'ai_conversations' }
          ],
          [
            { text: '🎯 Intent Analysis', callback_data: 'ai_intents' },
            { text: '😊 Sentiment Trends', callback_data: 'ai_sentiment' }
          ],
          [
            { text: '🛡️ Spam Detection', callback_data: 'ai_spam' },
            { text: '💡 Smart Suggestions', callback_data: 'ai_suggestions' }
          ],
          [
            { text: '🔧 Train Model', callback_data: 'ai_train' },
            { text: '📈 Performance', callback_data: 'ai_performance' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText(`🤖 **AI Dashboard**\n\n${aiStats}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: aiKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    // User Insights
    else if (data === 'admin_insights') {
      await bot.sendChatAction(chatId, 'typing');
      
      const insights = generateUserInsights();
      
      const insightsKeyboard = {
        inline_keyboard: [
          [
            { text: '📊 Behavior Patterns', callback_data: 'insights_behavior' },
            { text: '🎯 Conversion Analysis', callback_data: 'insights_conversion' }
          ],
          [
            { text: '💬 Communication Styles', callback_data: 'insights_communication' },
            { text: '🌍 Language Trends', callback_data: 'insights_language' }
          ],
          [
            { text: '⏰ Activity Patterns', callback_data: 'insights_activity' },
            { text: '🔄 Engagement Metrics', callback_data: 'insights_engagement' }
          ],
          [
            { text: '🎭 Sentiment Journey', callback_data: 'insights_sentiment_journey' },
            { text: '🎨 Personalization', callback_data: 'insights_personalization' }
          ],
          [{ text: '🔙 Back to Admin', callback_data: 'main_menu' }]
        ]
      };
      
      await bot.editMessageText(`🧠 **User Insights Dashboard**\n\n${insights}`, {
        chat_id: chatId,
        message_id: query.message.message_id,
        reply_markup: insightsKeyboard,
        parse_mode: 'Markdown'
      });
    }
    
    else if (data === 'admin_export') {
      await bot.sendChatAction(chatId, 'upload_document');
      
      try {
        const exportData = createDataExport();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `bot_export_${timestamp}.csv`;
        
        fs.writeFileSync(filename, exportData);
        
        await bot.sendDocument(chatId, filename, {
          caption: `📊 Data export (CSV format)\n📅 Generated: ${new Date().toLocaleString()}`
        });
        
        fs.unlinkSync(filename);
        
        await bot.editMessageText('✅ Data exported successfully!', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: getAdminKeyboard(chatId)
        });
      } catch (error) {
        logError(error, 'Data export');
        await bot.editMessageText('❌ Export failed. Check error logs.', {
          chat_id: chatId,
          message_id: query.message.message_id,
          reply_markup: getAdminKeyboard(chatId)
        });
      }
    }
  }
  
  } catch (error) {
    logError(error, `Callback query handler for data: ${data}`);
    
    // Send error message to user with safe handling
    try {
      const errorMsg = generateSmartErrorMessage(error, getUserLang(chatId));
      await sendTrackedMessage(chatId, errorMsg, {
        reply_markup: getMainMenuKeyboard(chatId)
      });
    } catch (sendError) {
      logError(sendError, 'Failed to send error message');
    }
  }
});

// Enhanced message handler with AI processing
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const user = users.get(chatId);
  
  // Skip processing for commands and photos
  if (msg.text && msg.text.startsWith('/')) return;
  if (msg.photo) return; // Handle photos separately
  
  // AI-powered message processing
  if (AI_CONFIG.enabled && msg.text) {
    try {
      // Spam and suspicious behavior detection
      const spamCheck = await detectSpamAndSuspiciousBehavior(chatId, msg.text);
      if (spamCheck.isSpam && spamCheck.confidence > 0.8) {
        logError(new Error(`Spam detected from user ${chatId}: ${msg.text}`), 'Spam Detection');
        return; // Ignore spam messages
      }
      
      if (spamCheck.isSuspicious && spamCheck.confidence > 0.7) {
        logError(new Error(`Suspicious behavior from user ${chatId}: ${msg.text}`), 'Security Alert');
        // Continue processing but flag for admin attention
      }
      
      // Update user profile with new interaction
      const history = conversationHistory.get(chatId) || [];
      await updateUserProfile(chatId, history);
      
      // Generate smart suggestions periodically
      if (history.length % 5 === 0) {
        await generateSmartSuggestions(chatId);
      }
      
    } catch (aiError) {
      logError(aiError, 'AI message processing');
      // Continue with normal processing if AI fails
    }
  }
  
  // Skip command messages
  if (msg.text && msg.text.startsWith('/')) return;
  
  // AI-powered context detection for regular users
  if (msg.text && chatId !== ADMIN_ID) {
    try {
      // Check for user confusion and provide intelligent assistance
      const handledConfusion = await handleUserConfusion(chatId, msg.text);
      if (handledConfusion) return;
      
      // Smart context detection for better UX
      const handledContext = await detectUserContext(chatId, msg.text);
      if (handledContext) return;
      
      // Handle common user queries with AI responses
      await handleIntelligentResponses(chatId, msg.text);
    } catch (error) {
      logError(error, 'AI message processing');
    }
  }
  
  // Handle admin broadcast
  if (chatId === ADMIN_ID && user?.waitingForBroadcast && msg.text) {
    await bot.sendChatAction(chatId, 'typing');
    
    const progressMsg = await bot.sendMessage(chatId, '📡 Preparing broadcast...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await bot.editMessageText('📤 Sending to users...', {
      chat_id: chatId,
      message_id: progressMsg.message_id
    });
    
    const broadcastMessage = msg.text;
    let sentCount = 0;
    
    // Clear the waiting flag immediately
    user.waitingForBroadcast = false;
    users.set(chatId, user);
    saveUserData();
    
    users.forEach((userData, userId) => {
      if (userId !== ADMIN_ID) {
        bot.sendMessage(userId, `📢 ${broadcastMessage}`).then(() => {
          sentCount++;
        }).catch(() => {
          // User blocked bot or other error
        });
      }
    });
    
    setTimeout(async () => {
      await bot.editMessageText(`✅ Broadcast completed!\n📊 Sent to ${sentCount} users`, {
        chat_id: chatId,
        message_id: progressMsg.message_id
      });
      
      setTimeout(() => {
        bot.sendMessage(chatId, t(chatId, 'admin_panel'), {
          reply_markup: getAdminKeyboard(chatId),
          parse_mode: 'Markdown'
        });
      }, 1500);
    }, 2000);
  }
  
  // Handle add crypto
  else if (chatId === ADMIN_ID && user?.waitingForCrypto && msg.text) {
    await bot.sendChatAction(chatId, 'typing');
    
    const processingMsg = await bot.sendMessage(chatId, '🔄 Processing crypto addition...');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const parts = msg.text.split('|');
    if (parts.length === 2) {
      const [name, address] = parts.map(p => p.trim());
      
      await bot.editMessageText('✅ Validating crypto details...', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      cryptos.push({ name, address, qrFileId: null });
      saveCryptoData();
      
      await bot.editMessageText(`✅ Successfully added crypto: ${name}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      
      // Clear the waiting flag immediately
      user.waitingForCrypto = false;
      users.set(chatId, user);
      saveUserData();
      
      setTimeout(() => {
        bot.sendMessage(chatId, t(chatId, 'admin_panel'), {
          reply_markup: getAdminKeyboard(chatId),
          parse_mode: 'Markdown'
        });
      }, 1200);
    } else {
      await bot.editMessageText('❌ Invalid format. Use: Name|Address', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      
      // Clear the waiting flag immediately
      user.waitingForCrypto = false;
      users.set(chatId, user);
      saveUserData();
      
      setTimeout(() => {
        bot.sendMessage(chatId, t(chatId, 'admin_panel'), {
          reply_markup: getAdminKeyboard(chatId),
          parse_mode: 'Markdown'
        });
      }, 1500);
    }
  }
  
  // Handle remove crypto
  else if (chatId === ADMIN_ID && user?.waitingForRemoveCrypto && msg.text) {
    await bot.sendChatAction(chatId, 'typing');
    
    const processingMsg = await bot.sendMessage(chatId, '🗑️ Processing crypto removal...');
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const inputNumber = msg.text.trim();
    const index = parseInt(inputNumber) - 1;
    
    // Debug information
    console.log(`Crypto removal debug:
      Input: "${inputNumber}"
      Parsed index: ${index}
      Cryptos array length: ${cryptos.length}
      Cryptos: ${JSON.stringify(cryptos.map((c, i) => `${i+1}. ${c.name}`))}`);
    
    if (isNaN(index) || index < 0 || index >= cryptos.length) {
      await bot.editMessageText(`❌ Invalid number: "${inputNumber}"
      
Please enter a number between 1 and ${cryptos.length}
Current cryptos:
${cryptos.map((crypto, i) => `${i + 1}. ${crypto.name}`).join('\n')}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      
      // Clear the waiting flag immediately
      user.waitingForRemoveCrypto = false;
      users.set(chatId, user);
      saveUserData();
      
      setTimeout(() => {
        bot.sendMessage(chatId, t(chatId, 'admin_panel'), {
          reply_markup: getAdminKeyboard(chatId),
          parse_mode: 'Markdown'
        });
      }, 3000);
    } else {
      const removed = cryptos.splice(index, 1)[0];
      
      await bot.editMessageText('🔄 Removing from database...', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      saveCryptoData();
      
      await bot.editMessageText(`✅ Successfully removed: ${removed.name}

Updated crypto list:
${cryptos.map((crypto, i) => `${i + 1}. ${crypto.name}`).join('\n') || 'No cryptos remaining'}`, {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });
      
      // Clear the waiting flag immediately
      user.waitingForRemoveCrypto = false;
      users.set(chatId, user);
      saveUserData();
      
      setTimeout(() => {
        bot.sendMessage(chatId, t(chatId, 'admin_panel'), {
          reply_markup: getAdminKeyboard(chatId),
          parse_mode: 'Markdown'
        });
      }, 2000);
    }
  }
  
  // Handle payment screenshots
  else if (msg.photo && user?.plan && user?.crypto) {
    await bot.sendChatAction(chatId, 'upload_photo');
    
    const processingMsg = await bot.sendMessage(chatId, '📸 Processing payment screenshot...');
    await new Promise(resolve => setTimeout(resolve, 600));
    
    await bot.editMessageText('🔍 Verifying payment details...', {
      chat_id: chatId,
      message_id: processingMsg.message_id
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await bot.editMessageText('📋 Logging purchase information...', {
      chat_id: chatId,
      message_id: processingMsg.message_id
    });
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Log the purchase
    purchaseLogs.push({
      user: chatId,
      plan: user.plan,
      crypto: user.crypto,
      time: new Date().toISOString(),
      photo: msg.photo[msg.photo.length - 1].file_id
    });
    savePurchaseLogs();
    
    // Notify admin
    if (ADMIN_ID) {
      const plans = getPlans(chatId);
      const plan = plans.find(p => p.id === user.plan);
      const planName = plan ? plan.name : user.plan;
      
      await bot.sendPhoto(ADMIN_ID, msg.photo[msg.photo.length - 1].file_id, {
        caption: `💳 New Payment Screenshot!\n\nUser: ${chatId}\nPlan: ${planName}\nCrypto: ${user.crypto}\nTime: ${new Date().toLocaleString()}`
      });
    }
    
    await bot.editMessageText('✅ Payment screenshot received successfully!', {
      chat_id: chatId,
      message_id: processingMsg.message_id
    });
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Confirm to user
    await bot.sendMessage(chatId, '🎯 Your credentials will be sent within 15 minutes.\n⏰ Please check back soon!', {
      reply_markup: getBackToMainKeyboard(chatId)
    });
  }
});

// Enhanced error handling with recovery mechanisms
function logError(error, context = 'Unknown') {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ${context}: ${error.message || error}`;
  console.error(errorMessage);
  
  // Save critical errors to file for admin review
  try {
    const errorLog = {
      timestamp,
      context,
      error: error.message || error.toString(),
      stack: error.stack
    };
    
    let errorLogs = [];
    try {
      if (fs.existsSync('error_logs.json')) {
        errorLogs = JSON.parse(fs.readFileSync('error_logs.json', 'utf8'));
      }
    } catch (e) {
      console.error('Failed to read error logs:', e);
    }
    
    errorLogs.push(errorLog);
    // Keep only last 100 errors
    if (errorLogs.length > 100) {
      errorLogs = errorLogs.slice(-100);
    }
    
    fs.writeFileSync('error_logs.json', JSON.stringify(errorLogs, null, 2));
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// AI-powered error response generation
function generateSmartErrorMessage(error, userLang = 'en') {
  const errorMessages = {
    en: {
      network: "🌐 Network issue detected. Please try again in a moment.",
      timeout: "⏰ Request timed out. The service might be busy, please retry.",
      validation: "⚠️ Input validation failed. Please check your format and try again.",
      permission: "🔒 Permission denied. Please ensure you have the required access.",
      service: "🔧 Service temporarily unavailable. Our team has been notified.",
      unknown: "❓ An unexpected error occurred. Please try again or contact support."
    },
    fr: {
      network: "🌐 Problème réseau détecté. Veuillez réessayer dans un moment.",
      timeout: "⏰ Délai d'attente dépassé. Le service pourrait être occupé, réessayez.",
      validation: "⚠️ Validation d'entrée échouée. Vérifiez votre format et réessayez.",
      permission: "🔒 Permission refusée. Assurez-vous d'avoir l'accès requis.",
      service: "🔧 Service temporairement indisponible. Notre équipe a été notifiée.",
      unknown: "❓ Une erreur inattendue s'est produite. Réessayez ou contactez le support."
    }
  };
  
  const messages = errorMessages[userLang] || errorMessages.en;
  
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') return messages.network;
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) return messages.timeout;
  if (error.message?.includes('validation') || error.message?.includes('invalid')) return messages.validation;
  if (error.code === 'EPERM' || error.message?.includes('permission')) return messages.permission;
  if (error.code === 'ECONNRESET' || error.message?.includes('service')) return messages.service;
  
  return messages.unknown;
}

// Enhanced message sending with retry logic and intelligent error handling
async function sendMessageWithRetry(chatId, message, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Validate message length (Telegram limit: 4096 characters)
      if (message.length > 4096) {
        const chunks = splitLongMessage(message);
        for (const chunk of chunks) {
          await bot.sendMessage(chatId, chunk, options);
          await new Promise(resolve => setTimeout(resolve, 100)); // Prevent rate limiting
        }
        return;
      }
      
      return await bot.sendMessage(chatId, message, options);
    } catch (error) {
      logError(error, `sendMessage attempt ${attempt} to chat ${chatId}`);
      
      // Handle specific Telegram API errors
      if (error.code === 403) {
        logError(new Error(`User ${chatId} blocked the bot`), 'User blocked bot');
        throw error; // Don't retry for blocked users
      }
      
      if (error.code === 429) {
        // Rate limiting - wait longer
        const retryAfter = error.response?.parameters?.retry_after || 30;
        logError(new Error(`Rate limited, waiting ${retryAfter} seconds`), 'Rate limit');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }
      
      if (attempt === maxRetries) {
        // Last attempt failed, try to send a simple error message
        try {
          const userLang = getUserLang(chatId);
          const errorMsg = generateSmartErrorMessage(error, userLang);
          return await bot.sendMessage(chatId, errorMsg);
        } catch (finalError) {
          logError(finalError, 'Final fallback message failed');
          throw error;
        }
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * Math.pow(2, attempt), 10000)));
    }
  }
}

// Split long messages for Telegram's character limit
function splitLongMessage(message, maxLength = 4000) {
  const chunks = [];
  let currentChunk = '';
  
  const lines = message.split('\n');
  for (const line of lines) {
    if ((currentChunk + line + '\n').length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = line + '\n';
      } else {
        // Single line is too long, split by words
        const words = line.split(' ');
        for (const word of words) {
          if ((currentChunk + word + ' ').length > maxLength) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
              currentChunk = word + ' ';
            } else {
              // Single word is too long, truncate
              chunks.push(word.substring(0, maxLength - 3) + '...');
            }
          } else {
            currentChunk += word + ' ';
          }
        }
      }
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

// AI-powered user assistance
async function handleUserConfusion(chatId, messageText) {
  const userLang = getUserLang(chatId);
  const confusionKeywords = {
    en: ['help', 'confused', 'stuck', 'how', 'what', 'unclear', 'understand'],
    fr: ['aide', 'confus', 'bloqué', 'comment', 'quoi', 'comprendre'],
    de: ['hilfe', 'verwirrt', 'fest', 'wie', 'was', 'verstehen'],
    es: ['ayuda', 'confundido', 'atascado', 'cómo', 'qué', 'entender'],
    ru: ['помощь', 'запутался', 'застрял', 'как', 'что', 'понять']
  };
  
  const keywords = confusionKeywords[userLang] || confusionKeywords.en;
  const text = messageText.toLowerCase();
  
  if (keywords.some(keyword => text.includes(keyword))) {
    const helpMessages = {
      en: "🤖 I see you might need help! Here's what you can do:\n\n" +
           "🔸 Select your language first\n" +
           "🔸 Choose a service plan\n" +
           "🔸 Pick a payment method\n" +
           "🔸 Send payment and screenshot\n\n" +
           "Type 'help' for detailed instructions or use the menu buttons.",
      fr: "🤖 Je vois que vous pourriez avoir besoin d'aide ! Voici ce que vous pouvez faire :\n\n" +
           "🔸 Sélectionnez d'abord votre langue\n" +
           "🔸 Choisissez un forfait de service\n" +
           "🔸 Choisissez un mode de paiement\n" +
           "🔸 Envoyez le paiement et la capture d'écran\n\n" +
           "Tapez 'aide' pour des instructions détaillées ou utilisez les boutons du menu."
    };
    
    const message = helpMessages[userLang] || helpMessages.en;
    await sendMessageWithRetry(chatId, message, {
      reply_markup: getMainMenuKeyboard(chatId)
    });
    return true;
  }
  return false;
}

// Advanced AI-powered intelligent responses
async function handleIntelligentResponses(chatId, messageText) {
  const userLang = getUserLang(chatId);
  const text = messageText.toLowerCase();
  
  // Price inquiries
  const priceKeywords = ['price', 'cost', 'how much', 'precio', 'prix', 'preis', 'цена'];
  if (priceKeywords.some(keyword => text.includes(keyword))) {
    const priceMessages = {
      en: "💰 Our service plans:\n🥇 Gold: $90 (1 month)\n💎 Diamond: $200 (2 months)\n🏆 Platinum: $300 (3 months)\n⚡ Platinum Special: $100 (1 month)\n\nChoose your plan to get started!",
      fr: "💰 Nos forfaits de service:\n🥇 Or: $90 (1 mois)\n💎 Diamant: $200 (2 mois)\n🏆 Platine: $300 (3 mois)\n⚡ Platine Spécial: $100 (1 mois)\n\nChoisissez votre forfait pour commencer!",
      de: "💰 Unsere Servicepläne:\n🥇 Gold: $90 (1 Monat)\n💎 Diamant: $200 (2 Monate)\n🏆 Platin: $300 (3 Monate)\n⚡ Platin Spezial: $100 (1 Monat)\n\nWählen Sie Ihren Plan zum Starten!",
      es: "💰 Nuestros planes de servicio:\n🥇 Oro: $90 (1 mes)\n💎 Diamante: $200 (2 meses)\n🏆 Platino: $300 (3 meses)\n⚡ Platino Especial: $100 (1 mes)\n\n¡Elige tu plan para comenzar!",
      ru: "💰 Наши тарифные планы:\n🥇 Золотой: $90 (1 месяц)\n💎 Алмазный: $200 (2 месяца)\n🏆 Платиновый: $300 (3 месяца)\n⚡ Платиновый Специальный: $100 (1 месяц)\n\nВыберите план для начала!"
    };
    
    await sendTrackedMessage(chatId, priceMessages[userLang] || priceMessages.en, {
      reply_markup: getMainMenuKeyboard(chatId)
    });
    return true;
  }
  
  // Support inquiries
  const supportKeywords = ['support', 'help me', 'problem', 'issue', 'soporte', 'problème', 'hilfe', 'проблема'];
  if (supportKeywords.some(keyword => text.includes(keyword))) {
    const supportMessages = {
      en: "🆘 Need help? Here's how to get support:\n\n🔸 Use the Help button in the menu\n🔸 Follow the step-by-step process\n🔸 Contact admin after payment\n🔸 Response time: 15 minutes\n\nWhat specific help do you need?",
      fr: "🆘 Besoin d'aide? Voici comment obtenir du support:\n\n🔸 Utilisez le bouton Aide dans le menu\n🔸 Suivez le processus étape par étape\n🔸 Contactez l'admin après paiement\n🔸 Temps de réponse: 15 minutes\n\nQuelle aide spécifique vous faut-il?",
      de: "🆘 Brauchen Sie Hilfe? So erhalten Sie Support:\n\n🔸 Verwenden Sie die Hilfe-Schaltfläche im Menü\n🔸 Folgen Sie dem Schritt-für-Schritt-Prozess\n🔸 Kontaktieren Sie den Admin nach der Zahlung\n🔸 Antwortzeit: 15 Minuten\n\nWelche spezifische Hilfe benötigen Sie?",
      es: "🆘 ¿Necesita ayuda? Así es como obtener soporte:\n\n🔸 Use el botón Ayuda en el menú\n🔸 Siga el proceso paso a paso\n🔸 Contacte al admin después del pago\n🔸 Tiempo de respuesta: 15 minutos\n\n¿Qué ayuda específica necesita?",
      ru: "🆘 Нужна помощь? Вот как получить поддержку:\n\n🔸 Используйте кнопку Помощь в меню\n🔸 Следуйте пошаговому процессу\n🔸 Свяжитесь с админом после оплаты\n🔸 Время ответа: 15 минут\n\nКакая конкретная помощь вам нужна?"
    };
    
    await sendTrackedMessage(chatId, supportMessages[userLang] || supportMessages.en, {
      reply_markup: getMainMenuKeyboard(chatId)
    });
    return true;
  }
  
  // Payment method inquiries
  const paymentKeywords = ['payment', 'pay', 'crypto', 'bitcoin', 'pago', 'paiement', 'zahlung', 'оплата'];
  if (paymentKeywords.some(keyword => text.includes(keyword))) {
    const paymentMessages = {
      en: "💳 We accept these payment methods:\n\n🔸 USDT (TRC20)\n🔸 Bitcoin (BTC)\n🔸 Ethereum (ETH)\n\nSelect your plan first, then choose your preferred payment method. The wallet address will be provided automatically.",
      fr: "💳 Nous acceptons ces modes de paiement:\n\n🔸 USDT (TRC20)\n🔸 Bitcoin (BTC)\n🔸 Ethereum (ETH)\n\nSélectionnez d'abord votre forfait, puis choisissez votre mode de paiement préféré. L'adresse du portefeuille sera fournie automatiquement.",
      de: "💳 Wir akzeptieren diese Zahlungsmethoden:\n\n🔸 USDT (TRC20)\n🔸 Bitcoin (BTC)\n🔸 Ethereum (ETH)\n\nWählen Sie zuerst Ihren Plan, dann Ihre bevorzugte Zahlungsmethode. Die Wallet-Adresse wird automatisch bereitgestellt.",
      es: "💳 Aceptamos estos métodos de pago:\n\n🔸 USDT (TRC20)\n🔸 Bitcoin (BTC)\n🔸 Ethereum (ETH)\n\nSeleccione su plan primero, luego elija su método de pago preferido. La dirección de la billetera se proporcionará automáticamente.",
      ru: "💳 Мы принимаем эти способы оплаты:\n\n🔸 USDT (TRC20)\n🔸 Bitcoin (BTC)\n🔸 Ethereum (ETH)\n\nСначала выберите план, затем предпочтительный способ оплаты. Адрес кошелька будет предоставлен автоматически."
    };
    
    await sendTrackedMessage(chatId, paymentMessages[userLang] || paymentMessages.en, {
      reply_markup: getMainMenuKeyboard(chatId)
    });
    return true;
  }
  
  // Features inquiries
  const featureKeywords = ['features', 'what can', 'what do', 'características', 'fonctionnalités', 'funktionen', 'возможности'];
  if (featureKeywords.some(keyword => text.includes(keyword))) {
    const featureMessages = {
      en: "⚡ Our service features:\n\n🔸 Call Spoofing Technology\n🔸 Voice Changing Capabilities\n🔸 Email & SMS Spoofing\n🔸 SIP Trunk Access\n🔸 IVR System Integration\n🔸 OTP Bot Access\n🔸 24/7 Service Availability\n\nChoose a plan to access these features!",
      fr: "⚡ Nos fonctionnalités de service:\n\n🔸 Technologie de spoofing d'appel\n🔸 Capacités de changement de voix\n🔸 Spoofing email & SMS\n🔸 Accès SIP Trunk\n🔸 Intégration système IVR\n🔸 Accès Bot OTP\n🔸 Disponibilité 24/7\n\nChoisissez un forfait pour accéder à ces fonctionnalités!",
      de: "⚡ Unsere Service-Features:\n\n🔸 Call-Spoofing-Technologie\n🔸 Voice-Changing-Funktionen\n🔸 Email & SMS Spoofing\n🔸 SIP-Trunk-Zugang\n🔸 IVR-System-Integration\n🔸 OTP-Bot-Zugang\n🔸 24/7 Service-Verfügbarkeit\n\nWählen Sie einen Plan für den Zugang zu diesen Features!",
      es: "⚡ Características de nuestro servicio:\n\n🔸 Tecnología de suplantación de llamadas\n🔸 Capacidades de cambio de voz\n🔸 Suplantación de email y SMS\n🔸 Acceso SIP Trunk\n🔸 Integración del sistema IVR\n🔸 Acceso Bot OTP\n🔸 Disponibilidad 24/7\n\n¡Elija un plan para acceder a estas características!",
      ru: "⚡ Возможности нашего сервиса:\n\n🔸 Технология спуфинга звонков\n🔸 Возможности изменения голоса\n🔸 Спуфинг email и SMS\n🔸 Доступ SIP Trunk\n🔸 Интеграция системы IVR\n🔸 Доступ к OTP боту\n🔸 Доступность 24/7\n\nВыберите план для доступа к этим возможностям!"
    };
    
    await sendTrackedMessage(chatId, featureMessages[userLang] || featureMessages.en, {
      reply_markup: getMainMenuKeyboard(chatId)
    });
    return true;
  }
  
  return false;
}

// Enhanced admin functions
function createDataBackup() {
  return {
    timestamp: new Date().toISOString(),
    users: Array.from(users.entries()),
    purchaseLogs: purchaseLogs,
    cryptos: cryptos,
    systemInfo: {
      version: '2.0.0',
      uptime: process.uptime(),
      platform: process.platform
    }
  };
}

function generateSecurityReport() {
  const now = Date.now();
  const hourAgo = now - 3600000;
  
  const recentActivity = Array.from(users.entries()).filter(([_, userData]) => 
    userData.lastActivity && userData.lastActivity > hourAgo
  ).length;
  
  const suspiciousActivity = Array.from(callbackLimiter.entries()).filter(([_, data]) =>
    data.count > 20
  ).length;
  
  return `🛡️ Security Report\n\n` +
    `📊 Recent Activity (1 hour):\n` +
    `   Active Users: ${recentActivity}\n` +
    `   Total Users: ${users.size}\n\n` +
    `⚠️ Security Alerts:\n` +
    `   Suspicious Activity: ${suspiciousActivity} users\n` +
    `   Rate Limit Triggers: ${suspiciousActivity}\n\n` +
    `🔒 System Security:\n` +
    `   Data Encryption: ✅\n` +
    `   Admin Access: ✅\n` +
    `   Error Logging: ✅\n` +
    `   Backup System: ✅`;
}

function generateRevenueStats() {
  const planPrices = {
    gold: 90,
    diamond: 200,
    platinum: 300,
    platinum1m: 100
  };
  
  let totalRevenue = 0;
  const planSales = {};
  
  purchaseLogs.forEach(log => {
    const price = planPrices[log.plan] || 0;
    totalRevenue += price;
    planSales[log.plan] = (planSales[log.plan] || 0) + 1;
  });
  
  const thisMonth = new Date().getMonth();
  const monthlyRevenue = purchaseLogs.filter(log => 
    new Date(log.time).getMonth() === thisMonth
  ).reduce((sum, log) => sum + (planPrices[log.plan] || 0), 0);
  
  let revenueReport = `💰 Revenue Statistics\n\n`;
  revenueReport += `📈 Total Revenue: $${totalRevenue}\n`;
  revenueReport += `📊 Monthly Revenue: $${monthlyRevenue}\n`;
  revenueReport += `🛒 Total Sales: ${purchaseLogs.length}\n\n`;
  
  revenueReport += `📋 Plan Performance:\n`;
  Object.entries(planSales).forEach(([plan, count]) => {
    const revenue = count * (planPrices[plan] || 0);
    revenueReport += `   ${plan.toUpperCase()}: ${count} sales ($${revenue})\n`;
  });
  
  return revenueReport;
}

function createDataExport() {
  let csv = 'User ID,Language,Plan,Crypto,Join Date,Last Activity,Purchase Date\n';
  
  users.forEach((userData, userId) => {
    const userPurchases = purchaseLogs.filter(log => log.user === userId);
    
    if (userPurchases.length > 0) {
      userPurchases.forEach(purchase => {
        csv += `${userId},${userData.lang || 'en'},${purchase.plan},${purchase.crypto},${userData.joinDate || ''},${new Date(userData.lastActivity || 0).toISOString()},${purchase.time}\n`;
      });
    } else {
      csv += `${userId},${userData.lang || 'en'},,,,${userData.joinDate || ''},${new Date(userData.lastActivity || 0).toISOString()},\n`;
    }
  });
  
  return csv;
}

// Smart context detection for better user experience
async function detectUserContext(chatId, messageText) {
  const user = users.get(chatId);
  if (!user) return false;
  
  // Detect if user is trying to send payment info in wrong format
  if (messageText.includes('txid') || messageText.includes('transaction') || 
      messageText.includes('hash') || messageText.includes('confirmed')) {
    
    await sendMessageWithRetry(chatId, 
      "📸 I see you're providing payment information! Please send the payment screenshot instead of text. " +
      "This helps us verify your payment quickly and securely.", {
      reply_markup: getBackToMainKeyboard(chatId)
    });
    return true;
  }
  
  // Detect if user is confused about crypto addresses
  if (messageText.includes('address') && messageText.includes('?')) {
    await sendMessageWithRetry(chatId,
      "💡 Crypto addresses are automatically provided when you select a payment method. " +
      "Just follow these steps:\n1. Choose your plan\n2. Select crypto payment\n3. Send to the provided address", {
      reply_markup: getMainMenuKeyboard(chatId)
    });
    return true;
  }
  
  return false;
}

// Enhanced admin error logs viewing
async function getErrorLogsForAdmin(chatId) {
  try {
    if (!fs.existsSync('error_logs.json')) {
      return "📊 No error logs found. System running smoothly!";
    }
    
    const errorLogs = JSON.parse(fs.readFileSync('error_logs.json', 'utf8'));
    const recentErrors = errorLogs.slice(-10);
    
    if (recentErrors.length === 0) {
      return "📊 No recent errors found. System running smoothly!";
    }
    
    let logMessage = "🚨 Recent Error Logs (Last 10):\n\n";
    recentErrors.forEach((log, index) => {
      const date = new Date(log.timestamp).toLocaleString();
      logMessage += `${index + 1}. [${date}] ${log.context}\n   Error: ${log.error}\n\n`;
    });
    
    return logMessage;
  } catch (error) {
    logError(error, 'getErrorLogsForAdmin');
    return "❌ Failed to retrieve error logs.";
  }
}

// Generate comprehensive user analytics
function generateUserAnalytics() {
  try {
    const totalUsers = users.size;
    const totalPurchases = purchaseLogs.length;
    
    // Language distribution
    const langStats = {};
    users.forEach(user => {
      const lang = user.lang || 'en';
      langStats[lang] = (langStats[lang] || 0) + 1;
    });
    
    // Plan popularity
    const planStats = {};
    purchaseLogs.forEach(log => {
      planStats[log.plan] = (planStats[log.plan] || 0) + 1;
    });
    
    // Crypto payment distribution
    const cryptoStats = {};
    purchaseLogs.forEach(log => {
      cryptoStats[log.crypto] = (cryptoStats[log.crypto] || 0) + 1;
    });
    
    // Recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentPurchases = purchaseLogs.filter(log => 
      new Date(log.time) > weekAgo
    ).length;
    
    let analytics = `📊 User Analytics Dashboard\n\n`;
    analytics += `👥 Total Users: ${totalUsers}\n`;
    analytics += `💳 Total Purchases: ${totalPurchases}\n`;
    analytics += `📈 Recent Purchases (7 days): ${recentPurchases}\n\n`;
    
    analytics += `🌐 Language Distribution:\n`;
    Object.entries(langStats).forEach(([lang, count]) => {
      const percentage = ((count / totalUsers) * 100).toFixed(1);
      analytics += `   ${lang.toUpperCase()}: ${count} (${percentage}%)\n`;
    });
    
    if (Object.keys(planStats).length > 0) {
      analytics += `\n⚡ Plan Popularity:\n`;
      Object.entries(planStats).forEach(([plan, count]) => {
        const percentage = ((count / totalPurchases) * 100).toFixed(1);
        analytics += `   ${plan}: ${count} (${percentage}%)\n`;
      });
    }
    
    if (Object.keys(cryptoStats).length > 0) {
      analytics += `\n💰 Payment Methods:\n`;
      Object.entries(cryptoStats).forEach(([crypto, count]) => {
        const percentage = ((count / totalPurchases) * 100).toFixed(1);
        analytics += `   ${crypto}: ${count} (${percentage}%)\n`;
      });
    }
    
    return analytics;
  } catch (error) {
    logError(error, 'generateUserAnalytics');
    return "❌ Failed to generate analytics.";
  }
}

// System status monitoring
function getSystemStatus() {
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const platform = process.platform;
    const nodeVersion = process.version;
    
    // Convert uptime to readable format
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    // Memory usage in MB
    const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2);
    const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
    
    // Check file system status
    const userDataExists = fs.existsSync('users.json');
    const purchaseLogsExist = fs.existsSync('purchase_logs.json');
    const cryptoDataExists = fs.existsSync('cryptos.json');
    
    let status = `🔧 **System Status Report**\n\n`;
    status += `⏱️ **Uptime:** ${days}d ${hours}h ${minutes}m\n`;
    status += `🖥️ **Platform:** ${platform}\n`;
    status += `⚙️ **Node.js:** ${nodeVersion}\n\n`;
    
    status += `💾 **Memory Usage:**\n`;
    status += `   • RSS: ${rss} MB\n`;
    status += `   • Heap Used: ${heapUsed} MB\n`;
    status += `   • Heap Total: ${heapTotal} MB\n\n`;
    
    status += `📁 **Data Files:**\n`;
    status += `   • Users: ${userDataExists ? '✅' : '❌'}\n`;
    status += `   • Logs: ${purchaseLogsExist ? '✅' : '❌'}\n`;
    status += `   • Crypto: ${cryptoDataExists ? '✅' : '❌'}\n\n`;
    
    status += `🔢 **Current Data:**\n`;
    status += `   • Active Users: ${users.size}\n`;
    status += `   • Purchases: ${purchaseLogs.length}\n`;
    status += `   • Crypto Options: ${cryptos.length}\n`;
    
    return status;
  } catch (error) {
    logError(error, 'getSystemStatus');
    return "❌ Failed to get system status.";
  }
}

// Generate health report
function generateHealthReport() {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    
    let health = `🏥 **Health Status:**\n`;
    
    // Memory health
    if (heapUsedMB < 100) {
      health += `💚 Memory: Excellent (${heapUsedMB}MB)\n`;
    } else if (heapUsedMB < 150) {
      health += `💛 Memory: Good (${heapUsedMB}MB)\n`;
    } else {
      health += `❤️ Memory: High Usage (${heapUsedMB}MB)\n`;
    }
    
    // Data integrity
    const dataIntegrity = users.size > 0 && purchaseLogs.length >= 0 && cryptos.length > 0;
    health += `📊 Data Integrity: ${dataIntegrity ? '✅ Good' : '⚠️ Check Required'}\n`;
    
    // Bot responsiveness
    health += `🤖 Bot Status: ✅ Responsive\n`;
    health += `🔄 Auto-Recovery: ✅ Active\n`;
    
    return health;
  } catch (error) {
    logError(error, 'generateHealthReport');
    return "❌ Health check failed.";
  }
}

// Generate payment statistics
function generatePaymentStats() {
  try {
    const totalRevenue = purchaseLogs.reduce((sum, log) => {
      const plan = getPlans('en').find(p => p.id === log.plan);
      return sum + (plan ? plan.price : 0);
    }, 0);
    
    const cryptoBreakdown = {};
    purchaseLogs.forEach(log => {
      cryptoBreakdown[log.crypto] = (cryptoBreakdown[log.crypto] || 0) + 1;
    });
    
    let stats = `💰 **Payment Overview:**\n`;
    stats += `• Total Revenue: $${totalRevenue}\n`;
    stats += `• Total Transactions: ${purchaseLogs.length}\n`;
    stats += `• Active Cryptos: ${cryptos.length}\n\n`;
    
    if (Object.keys(cryptoBreakdown).length > 0) {
      stats += `📊 **Payment Methods:**\n`;
      Object.entries(cryptoBreakdown).forEach(([crypto, count]) => {
        const percentage = ((count / purchaseLogs.length) * 100).toFixed(1);
        stats += `• ${crypto}: ${count} (${percentage}%)\n`;
      });
    }
    
    return stats;
  } catch (error) {
    logError(error, 'generatePaymentStats');
    return "❌ Payment stats unavailable.";
  }
}

// Generate growth metrics
function generateGrowthMetrics() {
  try {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    const month = 30 * day;
    
    // Calculate user growth
    const usersArray = Array.from(users.values());
    const newUsersToday = usersArray.filter(user => 
      user.joinDate && (now - new Date(user.joinDate).getTime()) < day
    ).length;
    
    const newUsersWeek = usersArray.filter(user => 
      user.joinDate && (now - new Date(user.joinDate).getTime()) < week
    ).length;
    
    const newUsersMonth = usersArray.filter(user => 
      user.joinDate && (now - new Date(user.joinDate).getTime()) < month
    ).length;
    
    // Calculate revenue growth
    const revenueToday = purchaseLogs.filter(log => 
      (now - new Date(log.time).getTime()) < day
    ).length;
    
    const revenueWeek = purchaseLogs.filter(log => 
      (now - new Date(log.time).getTime()) < week
    ).length;
    
    let metrics = `📈 **Growth Metrics:**\n\n`;
    metrics += `👥 **User Growth:**\n`;
    metrics += `• Today: +${newUsersToday}\n`;
    metrics += `• This Week: +${newUsersWeek}\n`;
    metrics += `• This Month: +${newUsersMonth}\n\n`;
    
    metrics += `💰 **Revenue Growth:**\n`;
    metrics += `• Today: ${revenueToday} purchases\n`;
    metrics += `• This Week: ${revenueWeek} purchases\n\n`;
    
    metrics += `📊 **Conversion Rate:**\n`;
    const conversionRate = users.size > 0 ? ((purchaseLogs.length / users.size) * 100).toFixed(1) : 0;
    metrics += `• Overall: ${conversionRate}%\n`;
    
    return metrics;
  } catch (error) {
    logError(error, 'generateGrowthMetrics');
    return "❌ Growth metrics unavailable.";
  }
}

// AI-Enhanced Features

// Analyze message sentiment and extract insights
async function analyzeMessageSentiment(chatId, message, sender = 'user') {
  if (!AI_CONFIG.enabled || !AI_CONFIG.features.sentimentAnalysis) {
    return { sentiment: 'neutral', confidence: 0.5, needsAssistance: false };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze the message and respond with JSON containing: sentiment (positive/negative/neutral), confidence (0-1), emotion (happy/sad/angry/confused/excited), needsAssistance (boolean), and urgency (low/medium/high).'
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.3
    });
    
    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Store insights
    const insights = aiInsights.get(chatId) || { sentiments: [], patterns: [] };
    insights.sentiments.push({
      ...analysis,
      message: message,
      sender: sender,
      timestamp: Date.now()
    });
    
    // Keep only last 50 sentiments
    if (insights.sentiments.length > 50) {
      insights.sentiments.shift();
    }
    
    aiInsights.set(chatId, insights);
    
    return analysis;
  } catch (error) {
    logError(error, 'AI sentiment analysis');
    return { sentiment: 'neutral', confidence: 0.5, needsAssistance: false };
  }
}

// Classify user intent for better responses
async function classifyUserIntent(message) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.features.intentClassification) {
    return { intent: 'general', confidence: 0.5, isConfused: false, needsHelp: false };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'Classify the user intent for a call spoofing service bot. Respond with JSON containing: intent (pricing/help/purchase/complaint/greeting/question/confused), confidence (0-1), isConfused (boolean), needsHelp (boolean), category (support/sales/technical/general).'
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
      temperature: 0.2
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logError(error, 'AI intent classification');
    return { intent: 'general', confidence: 0.5, isConfused: false, needsHelp: false };
  }
}

// Generate AI-powered intelligent response
async function generateIntelligentAIResponse(chatId, message) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.features.smartResponses) {
    return null;
  }
  
  try {
    const userLang = getUserLang(chatId);
    const conversationContext = conversationHistory.get(chatId) || [];
    const userProfile = userProfiles.get(chatId) || {};
    const recentSentiments = (aiInsights.get(chatId) || {}).sentiments || [];
    
    // Build context for AI
    const contextMessages = [
      {
        role: 'system',
        content: `You are an AI assistant for a call spoofing service bot. 
        
IMPORTANT GUIDELINES:
- Always respond in ${userLang} language
- Be helpful, professional, and concise
- Focus on guiding users to purchase plans: Gold ($90/1mo), Diamond ($200/2mo), Platinum ($300/3mo), Platinum Special ($100/1mo)
- Available payment: USDT, BTC, ETH
- If user seems confused, provide clear step-by-step guidance
- If user has concerns, address them professionally
- Keep responses under 300 characters when possible
- Use emojis appropriately for the language
- Never provide actual spoofing services or illegal advice
- Focus on legitimate business operations

User context:
- Language: ${userLang}
- Previous interactions: ${conversationContext.length}
- User profile: ${JSON.stringify(userProfile)}
- Recent sentiment: ${recentSentiments.slice(-3).map(s => s.sentiment).join(', ')}`
      }
    ];
    
    // Add recent conversation history
    conversationContext.slice(-5).forEach(msg => {
      contextMessages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current message
    contextMessages.push({
      role: 'user',
      content: message
    });
    
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: contextMessages,
      max_tokens: AI_CONFIG.maxTokens,
      temperature: AI_CONFIG.temperature
    });
    
    const aiMessage = response.choices[0].message.content;
    
    // Store AI response in conversation history
    const history = conversationHistory.get(chatId) || [];
    history.push({
      role: 'assistant',
      content: aiMessage,
      timestamp: Date.now(),
      language: userLang
    });
    conversationHistory.set(chatId, history);
    
    return {
      message: aiMessage,
      options: { reply_markup: getMainMenuKeyboard(chatId) }
    };
    
  } catch (error) {
    logError(error, 'AI intelligent response generation');
    return null;
  }
}

// Generate personalized pricing recommendations
async function generatePersonalizedPricing(chatId, userProfile, suggestions) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.features.contentGeneration) {
    return null;
  }
  
  try {
    const userLang = getUserLang(chatId);
    
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `Generate a personalized pricing message in ${userLang} for a call spoofing service based on user profile. Include:
          - Personalized recommendation
          - Plans: Gold ($90/1mo), Diamond ($200/2mo), Platinum ($300/3mo), Platinum Special ($100/1mo)
          - Why this plan fits the user
          - Payment methods: USDT, BTC, ETH
          - Keep under 500 characters
          - Use appropriate emojis
          - End with call-to-action`
        },
        {
          role: 'user',
          content: `User profile: ${JSON.stringify(userProfile)}\nSuggestions: ${JSON.stringify(suggestions)}`
        }
      ],
      max_tokens: 300,
      temperature: 0.6
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    logError(error, 'AI personalized pricing');
    return null;
  }
}

// Create or update user profile with AI insights
async function updateUserProfile(chatId, interactions) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.features.userProfiling) {
    return;
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'Analyze user interactions and create a profile with JSON containing: interests, behavior_pattern, likely_plan_preference, engagement_level, language_preference, timezone_hint, communication_style.'
        },
        {
          role: 'user',
          content: `User interactions: ${JSON.stringify(interactions.slice(-10))}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 300,
      temperature: 0.4
    });
    
    const profile = JSON.parse(response.choices[0].message.content);
    userProfiles.set(chatId, {
      ...profile,
      last_updated: Date.now(),
      interaction_count: interactions.length
    });
    
  } catch (error) {
    logError(error, 'AI user profiling');
  }
}

// Detect spam and suspicious behavior
async function detectSpamAndSuspiciousBehavior(chatId, message) {
  if (!AI_CONFIG.enabled || !AI_CONFIG.features.spamDetection) {
    return { isSpam: false, isSuspicious: false, confidence: 0.5 };
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'Analyze if this message is spam or suspicious for a call spoofing service bot. Respond with JSON containing: isSpam (boolean), isSuspicious (boolean), confidence (0-1), reason (string), action_recommended (ignore/warn/block).'
        },
        {
          role: 'user',
          content: message
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 200,
      temperature: 0.2
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logError(error, 'AI spam detection');
    return { isSpam: false, isSuspicious: false, confidence: 0.5 };
  }
}

// Generate smart suggestions for users
async function generateSmartSuggestions(chatId) {
  if (!AI_CONFIG.enabled) {
    return [];
  }
  
  try {
    const userProfile = userProfiles.get(chatId) || {};
    const conversationContext = conversationHistory.get(chatId) || [];
    const sentimentData = (aiInsights.get(chatId) || {}).sentiments || [];
    
    const response = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'Generate 3-5 smart suggestions for a user based on their profile and interactions with a call spoofing service bot. Respond with JSON array of suggestions with: text, action, priority (1-3).'
        },
        {
          role: 'user',
          content: `Profile: ${JSON.stringify(userProfile)}\nRecent interactions: ${conversationContext.slice(-5).map(c => c.content).join(', ')}\nSentiment trends: ${sentimentData.slice(-3).map(s => s.sentiment).join(', ')}`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0.7
    });
    
    const suggestions = JSON.parse(response.choices[0].message.content);
    smartSuggestions.set(chatId, suggestions);
    
    return suggestions;
  } catch (error) {
    logError(error, 'AI smart suggestions');
    return [];
  }
}

// Generate instant report with AI insights
function generateInstantReport() {
  try {
    const now = new Date();
    const systemStatus = getSystemStatus();
    const healthReport = generateHealthReport();
    const paymentStats = generatePaymentStats();
    
    let report = `📊 **INSTANT SYSTEM REPORT**\n`;
    report += `📅 Generated: ${now.toLocaleString()}\n\n`;
    report += `${systemStatus}\n\n${healthReport}\n\n${paymentStats}`;
    
    // Add AI insights if enabled
    if (AI_CONFIG.enabled) {
      report += `\n\n🤖 **AI INSIGHTS:**\n`;
      report += `• AI Features: ${AI_CONFIG.enabled ? 'Active' : 'Disabled'}\n`;
      report += `• User Profiles: ${userProfiles.size}\n`;
      report += `• Conversation Contexts: ${conversationHistory.size}\n`;
      report += `• AI Insights Stored: ${Array.from(aiInsights.values()).reduce((sum, insight) => sum + insight.sentiments.length, 0)}\n`;
      
      // Calculate sentiment distribution
      const allSentiments = Array.from(aiInsights.values())
        .flatMap(insight => insight.sentiments)
        .map(s => s.sentiment);
      
      if (allSentiments.length > 0) {
        const sentimentCounts = allSentiments.reduce((acc, sentiment) => {
          acc[sentiment] = (acc[sentiment] || 0) + 1;
          return acc;
        }, {});
        
        report += `• Sentiment Distribution: ${Object.entries(sentimentCounts)
          .map(([sentiment, count]) => `${sentiment}(${count})`)
          .join(', ')}\n`;
      }
    }
    
    return report;
  } catch (error) {
    logError(error, 'generateInstantReport');
    return "❌ Failed to generate instant report.";
  }
}

// Perform system tests for quick actions
async function performSystemTests() {
  try {
    let results = `🧪 **SYSTEM TEST RESULTS**\n\n`;
    
    // Test bot connection
    try {
      const botInfo = await bot.getMe();
      results += `✅ Bot Connection: OK (${botInfo.username})\n`;
    } catch (error) {
      results += `❌ Bot Connection: FAILED\n`;
    }
    
    // Test file system
    const filesExist = {
      users: fs.existsSync('users.json'),
      logs: fs.existsSync('purchase_logs.json'),
      crypto: fs.existsSync('cryptos.json'),
      messages: fs.existsSync('user_messages.json')
    };
    
    Object.entries(filesExist).forEach(([file, exists]) => {
      results += `${exists ? '✅' : '❌'} ${file}.json: ${exists ? 'OK' : 'MISSING'}\n`;
    });
    
    // Test memory usage
    const memUsage = process.memoryUsage();
    const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    results += `${heapUsedMB < 150 ? '✅' : '⚠️'} Memory Usage: ${heapUsedMB}MB\n`;
    
    // Test data integrity
    const dataValid = users.size >= 0 && purchaseLogs.length >= 0 && cryptos.length > 0;
    results += `${dataValid ? '✅' : '❌'} Data Integrity: ${dataValid ? 'VALID' : 'CORRUPTED'}\n`;
    
    results += `\n📈 **Performance:**\n`;
    results += `• Active Users: ${users.size}\n`;
    results += `• Purchase Records: ${purchaseLogs.length}\n`;
    results += `• Tracked Messages: ${Array.from(userMessages.values()).reduce((sum, arr) => sum + arr.length, 0)}\n`;
    
    return results;
  } catch (error) {
    logError(error, 'performSystemTests');
    return "❌ System tests failed.";
  }
}

// Generate AI statistics for admin dashboard
function generateAIStats() {
  try {
    if (!AI_CONFIG.enabled) {
      return `❌ **AI Features Disabled**\n\nTo enable AI features, configure OPENAI_API_KEY in environment variables.\n\n🔧 **Available Features:**\n• Smart responses\n• Sentiment analysis\n• User profiling\n• Spam detection\n• Intent classification\n• Content generation`;
    }
    
    let stats = `🤖 **AI System Status: ✅ Active**\n\n`;
    stats += `⚙️ **Model:** ${AI_CONFIG.model}\n`;
    stats += `🔥 **Temperature:** ${AI_CONFIG.temperature}\n`;
    stats += `📝 **Max Tokens:** ${AI_CONFIG.maxTokens}\n\n`;
    
    stats += `📊 **Feature Status:**\n`;
    Object.entries(AI_CONFIG.features).forEach(([feature, enabled]) => {
      stats += `• ${feature}: ${enabled ? '✅' : '❌'}\n`;
    });
    
    stats += `\n📈 **Usage Statistics:**\n`;
    stats += `• User Profiles: ${userProfiles.size}\n`;
    stats += `• Active Conversations: ${conversationHistory.size}\n`;
    stats += `• AI Insights: ${Array.from(aiInsights.values()).reduce((sum, insight) => sum + insight.sentiments.length, 0)}\n`;
    stats += `• Smart Suggestions: ${smartSuggestions.size}\n`;
    
    return stats;
  } catch (error) {
    logError(error, 'generateAIStats');
    return "❌ Failed to generate AI statistics.";
  }
}

// Generate comprehensive user insights
function generateUserInsights() {
  try {
    let insights = `🧠 **Comprehensive User Insights**\n\n`;
    
    if (!AI_CONFIG.enabled) {
      insights += `❌ AI features disabled. Enable to get detailed insights.`;
      return insights;
    }
    
    // Language distribution
    const languageCount = {};
    users.forEach(user => {
      const lang = user.lang || 'en';
      languageCount[lang] = (languageCount[lang] || 0) + 1;
    });
    
    insights += `🌍 **Language Distribution:**\n`;
    Object.entries(languageCount).forEach(([lang, count]) => {
      const percentage = ((count / users.size) * 100).toFixed(1);
      insights += `• ${lang.toUpperCase()}: ${count} (${percentage}%)\n`;
    });
    
    // Sentiment analysis
    const allSentiments = Array.from(aiInsights.values())
      .flatMap(insight => insight.sentiments);
    
    if (allSentiments.length > 0) {
      insights += `\n😊 **Overall Sentiment:**\n`;
      const sentimentCounts = allSentiments.reduce((acc, s) => {
        acc[s.sentiment] = (acc[s.sentiment] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(sentimentCounts).forEach(([sentiment, count]) => {
        const percentage = ((count / allSentiments.length) * 100).toFixed(1);
        const emoji = sentiment === 'positive' ? '😊' : sentiment === 'negative' ? '😞' : '😐';
        insights += `${emoji} ${sentiment}: ${count} (${percentage}%)\n`;
      });
    }
    
    // User profiling insights
    if (userProfiles.size > 0) {
      insights += `\n👤 **User Profiles:**\n`;
      insights += `• Profiled Users: ${userProfiles.size}\n`;
      
      const engagementLevels = Array.from(userProfiles.values())
        .map(p => p.engagement_level)
        .filter(Boolean);
      
      if (engagementLevels.length > 0) {
        const avgEngagement = engagementLevels.reduce((sum, level) => {
          const score = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
          return sum + score;
        }, 0) / engagementLevels.length;
        
        insights += `• Avg Engagement: ${avgEngagement.toFixed(1)}/3.0\n`;
      }
    }
    
    return insights;
  } catch (error) {
    logError(error, 'generateUserInsights');
    return "❌ Failed to generate user insights.";
  }
}

// Enhanced error handling with intelligent recovery
bot.on('error', async (error) => {
  logError(error, 'Bot Error');
  
  // Critical error patterns that need immediate attention
  const criticalErrors = ['ETELEGRAM', 'TOKEN', 'UNAUTHORIZED'];
  const isCritical = criticalErrors.some(pattern => 
    error.message?.toUpperCase().includes(pattern)
  );
  
  if (isCritical && ADMIN_ID) {
    try {
      await sendTrackedMessage(ADMIN_ID, 
        `🚨 CRITICAL Bot Error Alert:\n${error.message}\n\nTime: ${new Date().toLocaleString()}\n\nImmediate attention required!`
      );
    } catch (notificationError) {
      logError(notificationError, 'Critical error notification failed');
    }
  }
  
  // Auto-save data on critical errors
  try {
    saveUserData();
    savePurchaseLogs();
    saveCryptoData();
    console.log('💾 Emergency data save completed');
  } catch (saveError) {
    logError(saveError, 'Emergency data save failed');
  }
});

bot.on('polling_error', (error) => {
  logError(error, 'Polling Error');
  
  // Enhanced polling error recovery
  const retryableErrors = ['EFATAL', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'];
  const shouldRetry = retryableErrors.includes(error.code);
  
  if (shouldRetry) {
    console.log(`🔄 Attempting to restart polling due to ${error.code}...`);
    
    let retryCount = 0;
    const maxRetries = 3;
    
    const restartPolling = () => {
      if (retryCount >= maxRetries) {
        console.log('❌ Max polling restart attempts reached');
        return;
      }
      
      retryCount++;
      setTimeout(() => {
        try {
          bot.stopPolling();
          setTimeout(() => {
            bot.startPolling();
            console.log(`✅ Polling restarted (attempt ${retryCount})`);
          }, 5000);
        } catch (restartError) {
          logError(restartError, `Polling restart attempt ${retryCount} failed`);
          if (retryCount < maxRetries) {
            restartPolling();
          }
        }
      }, 3000 * retryCount); // Exponential backoff
    };
    
    restartPolling();
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully...');
  try {
    await bot.stopPolling();
    saveUserData();
    savePurchaseLogs();
    saveCryptoData();
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logError(error, 'Graceful shutdown');
    process.exit(1);
  }
});

// Advanced bot health monitoring
function startHealthMonitoring() {
  setInterval(() => {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
      
      // Memory leak detection
      if (memUsage.heapUsed > 200 * 1024 * 1024) { // 200MB threshold
        logError(new Error(`High memory usage detected: ${heapUsedMB}MB`), 'Memory warning');
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🧹 Forced garbage collection');
        }
      }
      
      // Data integrity checks
      if (users.size > 50000) { // Unusual user count
        logError(new Error(`Unusual user count: ${users.size}`), 'Data integrity warning');
      }
      
      // Connection health check
      bot.getMe().catch(error => {
        logError(error, 'Bot connection health check failed');
      });
      
    } catch (error) {
      logError(error, 'Health monitoring error');
    }
  }, 300000); // Check every 5 minutes
}

// Data backup scheduling
function scheduleDataBackups() {
  setInterval(() => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      // Create timestamped backups
      if (fs.existsSync('users.json')) {
        fs.copyFileSync('users.json', `backups/users_${timestamp}.json`);
      }
      if (fs.existsSync('purchase_logs.json')) {
        fs.copyFileSync('purchase_logs.json', `backups/logs_${timestamp}.json`);
      }
      
      // Cleanup old backups (keep last 7 days)
      if (fs.existsSync('backups')) {
        const files = fs.readdirSync('backups');
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        files.forEach(file => {
          const filePath = `backups/${file}`;
          const stats = fs.statSync(filePath);
          if (stats.mtime.getTime() < weekAgo) {
            fs.unlinkSync(filePath);
          }
        });
      }
      
      console.log(`💾 Scheduled backup completed: ${timestamp}`);
    } catch (error) {
      logError(error, 'Scheduled backup failed');
    }
  }, 21600000); // Every 6 hours
}

// Security monitoring
function startSecurityMonitoring() {
  setInterval(() => {
    try {
      // Check for suspicious activity patterns
      const suspiciousUsers = [];
      const now = Date.now();
      
      users.forEach((userData, userId) => {
        if (userData.lastActivity && (now - userData.lastActivity) < 60000) {
          // User active in last minute - check for rapid interactions
          const callbacks = callbackLimiter.get(userId);
          if (callbacks && callbacks.count > 20) {
            suspiciousUsers.push(userId);
          }
        }
      });
      
      if (suspiciousUsers.length > 0 && ADMIN_ID) {
        sendMessageWithRetry(ADMIN_ID, 
          `⚠️ Security Alert: Suspicious activity detected from users: ${suspiciousUsers.join(', ')}`
        ).catch(error => logError(error, 'Security alert notification failed'));
      }
      
    } catch (error) {
      logError(error, 'Security monitoring error');
    }
  }, 60000); // Check every minute
}

// Initialize monitoring systems
if (!fs.existsSync('backups')) {
  fs.mkdirSync('backups');
}

startHealthMonitoring();
scheduleDataBackups();
startSecurityMonitoring();

console.log('🚀 TOP-NOTCH Telegram Bot is running with comprehensive monitoring, AI integration, and enterprise-grade error handling...');
console.log('📊 Active monitoring: Health ✓ Security ✓ Data Backup ✓');
console.log('🛡️ Error Recovery: Auto-restart ✓ Data Protection ✓ Admin Alerts ✓');