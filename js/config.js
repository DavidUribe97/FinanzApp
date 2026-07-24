export const CATS_KEY = 'finanzas_categories';
export const STORAGE_KEY = 'finanzas_data';
export const BUDGET_KEY = 'finanzas_budgets';
export const THEME_KEY = 'finanzas_theme';
export const MODE_KEY = 'finanzas_mode';
export const LAST_CAT_KEY = 'finanzas_last_cat';
export const ROOM_KEY = 'finanzas_room';
export const MEMBERS_KEY = 'finanzas_members';
export const ACCOUNTS_KEY = 'finanzas_accounts';

export const DEFAULT_MEMBERS = { yo: 'Él', pareja: 'Ella', compartido: 'Compartido 👥' };
export const DEFAULT_ACCOUNTS = {
  yo: ['Bancolombia', 'Nequi', 'Efectivo'],
  pareja: ['Bancolombia', 'Daviplata', 'Efectivo'],
  compartido: ['Bancolombia', 'Efectivo']
};
export const CASH_ACCOUNTS = ['efectivo', 'cash', 'efec', 'billete', 'plata'];

/**
 * Firebase API Key — PÚBLICA por diseño de Firebase.
 * La seguridad real vive en Firestore Security Rules,
 * no en ocultar esta key. NO restringir por HTTP referrer
 * (rompe Auth anónimo). Ver LEEME.md sección "Seguridad".
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBI4ZQJU2N7Tqht9eCLt1YXzMEbpV6-L7Q",
  authDomain: "presupuesto-cddeb.firebaseapp.com",
  projectId: "presupuesto-cddeb",
  storageBucket: "presupuesto-cddeb.firebasestorage.app",
  messagingSenderId: "561524123795",
  appId: "1:561524123795:web:89df1890188e42aef98566"
};

export const MAX_AMOUNT = 999999999;
export const MAX_DESC_LENGTH = 100;
export const ANIMATION_STEPS = 20;
export const ANIMATION_INTERVAL_MS = 20;
export const CHART_COLORS = ['#00d4aa','#ff4d6d','#f5c842','#4f8ef7','#a855f7','#f97316','#06b6d4','#e11d48','#84cc16','#d946ef','#14b8a6','#f43f5e','#8b5cf6'];
export const FIRESTORE_COLLECTION = 'rooms';
export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export const DEFAULT_CATEGORIES = {
  ingreso: [
    { name: 'Salario', emoji: '💼', subcats: [{ name: 'Sueldo base', emoji: '📄' }, { name: 'Horas extra', emoji: '⏰' }, { name: 'Bonos', emoji: '🎁' }, { name: 'Primas', emoji: '🏅' }] },
    { name: 'Freelance', emoji: '💻', subcats: [{ name: 'Proyectos', emoji: '📋' }, { name: 'Consultoría', emoji: '🤝' }, { name: 'Comisiones', emoji: '📊' }] },
    { name: 'Inversión', emoji: '📈', subcats: [{ name: 'Dividendos', emoji: '💵' }, { name: 'Intereses', emoji: '📉' }, { name: 'Cripto', emoji: '₿' }, { name: 'Acciones', emoji: '🏢' }] },
    { name: 'Arriendo recibido', emoji: '🏘️', subcats: [] },
    { name: 'Otros ingresos', emoji: '💰', subcats: [{ name: 'Ventas', emoji: '🛍️' }, { name: 'Reembolsos', emoji: '↩️' }, { name: 'Regalos', emoji: '🎀' }, { name: 'Premios', emoji: '🏆' }] }
  ],
  gasto: [
    { name: 'Vivienda', emoji: '🏠', subcats: [{ name: 'Arriendo', emoji: '🔑' }, { name: 'Hipoteca', emoji: '🏦' }, { name: 'Mantenimiento', emoji: '🔧' }, { name: 'Seguro', emoji: '🛡️' }] },
    { name: 'Alimentación', emoji: '🍕', subcats: [{ name: 'Mercado', emoji: '🛒' }, { name: 'Comidas fuera', emoji: '🍽️' }, { name: 'Domicilios', emoji: '📦' }, { name: 'Café', emoji: '☕' }] },
    { name: 'Transporte', emoji: '🚌', subcats: [{ name: 'Gasolina', emoji: '⛽' }, { name: 'Taxi/Uber', emoji: '🚕' }, { name: 'Parqueadero', emoji: '🅿️' }, { name: 'Pasaje bus', emoji: '🎫' }, { name: 'Peajes', emoji: '🛣️' }] },
    { name: 'Salud', emoji: '💊', subcats: [{ name: 'Seguro', emoji: '🛡️' }, { name: 'Citas médicas', emoji: '🏥' }, { name: 'Medicinas', emoji: '💊' }, { name: 'Gimnasio', emoji: '🏋️' }] },
    { name: 'Educación', emoji: '📚', subcats: [{ name: 'Cursos', emoji: '📖' }, { name: 'Libros', emoji: '📕' }, { name: 'Universidad', emoji: '🎓' }, { name: 'Suscripciones', emoji: '📰' }] },
    { name: 'Entretenimiento', emoji: '🎮', subcats: [{ name: 'Streaming', emoji: '📺' }, { name: 'Cine', emoji: '🎬' }, { name: 'Música', emoji: '🎵' }, { name: 'Juegos', emoji: '🎲' }, { name: 'Eventos', emoji: '🎉' }] },
    { name: 'Ropa', emoji: '👕', subcats: [{ name: 'Ropa', emoji: '👕' }, { name: 'Zapatos', emoji: '👟' }, { name: 'Accesorios', emoji: '⌚' }] },
    { name: 'Servicios públicos', emoji: '💡', subcats: [{ name: 'Energía', emoji: '⚡' }, { name: 'Agua', emoji: '💧' }, { name: 'Gas', emoji: '🔥' }, { name: 'Internet', emoji: '🌐' }, { name: 'Celular', emoji: '📱' }] },
    { name: 'Deudas/créditos', emoji: '💳', subcats: [{ name: 'Tarjeta crédito', emoji: '💳' }, { name: 'Préstamo', emoji: '🏧' }, { name: 'Cuota vehículo', emoji: '🚗' }] },
    { name: 'Ahorro', emoji: '🐷', subcats: [{ name: 'Fondo emergencia', emoji: '🆘' }, { name: 'Meta vacaciones', emoji: '✈️' }, { name: 'Inversión', emoji: '📈' }] },
    { name: 'Otros gastos', emoji: '📦', subcats: [{ name: 'Suscripciones', emoji: '🔄' }, { name: 'Impuestos', emoji: '🧾' }, { name: 'Multas', emoji: '🚨' }, { name: 'Servicios', emoji: '🛠️' }] }
  ]
};

export const MEMBER_COLORS = [
  { bg: 'rgba(79,142,247,0.15)', text: 'var(--accent-blue)' },
  { bg: 'rgba(245,200,66,0.15)', text: 'var(--accent-gold)' },
  { bg: 'rgba(0,212,170,0.15)', text: 'var(--accent-green)' },
  { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
  { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },
  { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4' },
  { bg: 'rgba(225,29,72,0.15)', text: '#e11d48' },
  { bg: 'rgba(132,204,22,0.15)', text: '#84cc16' },
  { bg: 'rgba(217,70,239,0.15)', text: '#d946ef' },
  { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },
];

export const EMOJIS = [
  '🍕','🥩','🥗','🥦','🍎','🥑','🍞','🧀','🥤','☕','🍷',
  '🍺','🍹','🥂','🍸','🧊','🍜','🍝','🍣','🍱','🥟','🍪',
  '🧁','🍩','🍫','🍿','🥜','🌰','🥛','🧃','🥃','🍶','🍵',
  '🏠','🏢','🛋️','🛏️','🚿','🧹','🔧','💡','🔌',
  '🚌','🚗','🚕','✈️','🚂','🛵','⛽','🅿️','🚲',
  '🚁','🛴','🚀','🚢','🛻','🚃','🚟','⛵',
  '💊','🏥','🩺','🧬','🦷','👁️','💪','🧠',
  '🦴','🫀','🫁','🩸','🧫','🩹','🩼','🦻',
  '📚','📖','🎓','✏️','📝','💻','🖥️','📱','⌨️',
  '🖨️','🖱️','💾','💿','📀','📷','🎥','📹','📼',
  '🎮','🎬','🎵','🎧','📺','🎤','🎸','🎳','🎯',
  '🎲','♟️','🧩','🎭','🎨','🎼','🎹','🥁',
  '🎪','🎠','🎡','🎢','🎟️','🎫','🏆','🥇','🥈','🥉',
  '🪀','🪁','🕹️','🎰','🧿',
  '👕','👖','👗','👟','🧢','💍','⌚','👜',
  '👔','👘','🩳','🩲','🧣','🧤','🧥','🧦',
  '👑','👒','🎩','⛑️','💎','👝','👛','🕶️',
  '🐷','💰','💳','📈','🏦','📊','💎','🏆',
  '💵','💶','💷','💴','🪙','🧾','💹','📉',
  '📦','🛒','🎁','📮','📋','📌','✂️','🖍️',
  '🗂️','📎','📍','📏','📐','🔒','🔓','🔑',
  '💼','👔','📞','📨','🤝','📅','🗓️','📇',
  '📃','📜','📄','📑','🔖','🏷️','📪','📫',
  '🏘️','🌳','🐾','🌸','🌞','🌙','⭐','🌈',
  '🌻','🌺','🌷','🌹','🌿','🍀','🌵','🌴','🪴',
  '🎂','🎉','🎊','🎀','🕯️','🧸','📸',
  '🎈','🎁','🎗️','🎟️','🎃','🎄','🎆','🎇',
  '🏋️','⚽','🏀','🎾','🏃','🧘','⛰️','🏖️',
  '⚾','🏐','🏈','🏉','🎱','🤿','🥊','🥋',
  '🚴','🤸','🤼','🤽','🏊','🎿','⛷️','🏂',
  '🐶','🐱','🐰','🦊','🐻','🐼','🐨','🦁',
  '🐮','🐷','🐸','🐵','🦄','🐴','🦎','🐢',
  '🐙','🦑','🦐','🦞','🐟','🐠','🐡','🐬',
  '🦋','🐝','🐞','🐜','🦗','🐛','🐌','🐚',
  '🦉','🦅','🦜','🦩','🐧','🐤','🦆','🕊️',
  '🚽','🧻','🪥','🧴','🪒','💄','🛁','🧽',
  '🪣','🧹','🧺','🧼','🪤','🪞','🪟','🛏️',
  '🔪','🍴','🥄','🏺','🫖','☕','🍶','🥣',
];
