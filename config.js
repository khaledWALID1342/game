// ==========================================================================
// ⚙️ THE MASTER CONFIGURATION FILE (V6.0 - AI EDITION)
// ==========================================================================
// الملف ده هو "المخ" اللي بيتحكم في كل أرقام وقواعد اللعبة الأساسية.
// أي تعديل في توازن اللعبة (Balance) بيتم من هنا.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
// استدعينا مكتبة الـ Auth استعداداً لنظام تسجيل الدخول المعقد اللي طلبته 🛡️
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"; 

// ==========================================
// 1. مفاتيح السيرفر (FIREBASE CREDENTIALS) 🔑
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDNRQaZQGXP7UE3GskBaC0tbqEXKNq2oQc",
    authDomain: "world-rockets.firebaseapp.com",
    databaseURL: "https://world-rockets-default-rtdb.firebaseio.com",
    projectId: "world-rockets",
    storageBucket: "world-rockets.firebasestorage.app",
    messagingSenderId: "66034492326",
    appId: "1:66034492326:web:43a9a2932b7e46d7c92567"
};

// تهيئة الاتصال وتصديره لباقي الملفات
export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app); // جاهزين لنظام الدخول الجديد!

// ==========================================
// 2. إعدادات السيرفرات (SERVER NODES) 🌐
// ==========================================
export const SERVERS = {
    mena_1: { id: 'mena_1', name: 'الشرق الأوسط', maxCapacity: 500, status: 'online' },
    eu_1: { id: 'eu_1', name: 'أوروبا المركزي', maxCapacity: 1000, status: 'online' },
    na_1: { id: 'na_1', name: 'أمريكا الشمالية', maxCapacity: 1000, status: 'maintenance' } // سيرفر مقفول للتحديثات
};

// ==========================================
// 3. قواعد اللعبة الأساسية (CORE MECHANICS) 📜
// ==========================================
export const GAME_RULES = {
    startingHealth: 100,
    startingCoins: 250,        // زودنا الفلوس في البداية عشان اللاعب يتحمس
    startingRockets: 3,
    startingEnergy: 100,       // نظام الطاقة الجديد اللي بيمنع السبام
    energyRegenRate: 5,        // اللاعب بيسترجع 5 طاقة كل 10 ثواني
    baseTerritoryRadius: 50000, // 50 كم مساحة احتلال مبدئية
    maxShields: 5,             // أقصى عدد دروع ممكن تشيله
    adminCode: "KHALED_VIP"    // كود الإمبراطور السري 👑
};

// ==========================================
// 4. اقتصاد اللعبة والسوق الأسود (ECONOMY & BLACK MARKET) 🛒
// ==========================================
export const MARKET = {
    weapons: {
        basicRocket: { id: 'basic_rocket', name: 'صاروخ باليستي', cost: 50, damage: 25, type: 'attack' },
        nuke: { id: 'nuke', name: 'قنبلة نووية تكتيكية', cost: 300, damage: 75, type: 'attack' }, // سلاح دمار شامل جديد!
    },
    defenses: {
        energyShield: { id: 'energy_shield', name: 'درع طاقة', cost: 80, blocks: 1, type: 'defense' },
        healBot: { id: 'heal_bot', name: 'روبوت إصلاح (+50%)', cost: 100, heal: 50, type: 'support' }
    },
    upgrades: {
        expandTerritory: { id: 'expand', name: 'توسيع النفوذ (+10كم)', cost: 150, boost: 10000, type: 'upgrade' }
    }
};

// ==========================================
// 5. نظام الذكاء الاصطناعي (AI COMMANDER SETTINGS) 🤖
// ==========================================
export const AI_CONFIG = {
    enabled: true,
    scanRadius: 500000, // الـ AI بيقدر يعمل سكان للأعداء في مسافة 500 كم
    tacticalCooldown: 60000, // الـ AI محتاج دقيقة عشان يجهز تكتيك جديد
    personality: "aggressive", // ممكن نغيرها لـ defensive حسب أسلوب اللاعب مستقبلاً
    responses: {
        welcome: "تم تفعيل أنظمة الذكاء الاصطناعي. بانتظار أوامرك يا قائد.",
        danger: "⚠️ تحذير: رصدنا نشاط معادي بالقرب من حدودنا!",
        victory: "هدف مؤكد. تم مسح العدو من على وجه الخريطة."
    }
};

// ==========================================
// 6. نظام الرتب والألقاب العسكرية (RANKS & PROGRESSION) 🎖️
// ==========================================
export const RANKS = [
    { name: "مجند مستجد", minScore: 0, icon: "🔰", color: "#a4b0be" },
    { name: "قناص محترف", minScore: 300, icon: "🎯", color: "#2ed573" },
    { name: "قائد عمليات", minScore: 1000, icon: "⚔️", color: "#3742fa" },
    { name: "جنرال الحرب", minScore: 2500, icon: "🎖️", color: "#ffa502" },
    { name: "إمبراطور العالم", minScore: 5000, icon: "👑", color: "#ff4757" } // أعلى رتبة!
];

// ==========================================
// 7. نظام الحماية ضد الغش (ANTI-CHEAT) 🛡️
// ==========================================
export const SECURITY = {
    maxClicksPerSecond: 5, // منع برامج الـ Auto-Clicker
    minFlightTime: 2000, // أقل وقت للصاروخ عشان يوصل (عشان مفيش هكر يضرب في ثانية)
};

console.log("🟢 [CONFIG] تم تحميل إعدادات القيادة العليا والذكاء الاصطناعي بنجاح!");
