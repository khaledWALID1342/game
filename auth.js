// ==========================================================================
// 🛡️ THE AUTHENTICATION & BOOT SEQUENCE ENGINE (V6.0)
// ==========================================================================
// هذا الملف مسئول عن: حماية الحسابات، الأنيميشن السينمائي للدخول، وتهيئة اللاعب.

import { db, GAME_RULES, SERVERS } from './config.js';
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================
// 1. تعريف العناصر والصوتيات (DOM & AUDIO)
// ==========================================
const DOM = {
    bootScreen: document.getElementById('boot-screen'),
    loadingScreen: document.getElementById('loading-screen'),
    mainHud: document.getElementById('main-hud'),
    mapWrapper: document.getElementById('map-wrapper'),
    btnInit: document.getElementById('btn-init-uplink'),
    inputName: document.getElementById('commander-name'),
    inputPass: document.getElementById('commander-pass'),
    loadingText: document.getElementById('loading-text'),
    loadingFill: document.getElementById('loading-fill'),
    serverRadios: document.getElementsByName('server')
};

const AUDIO = {
    click: document.getElementById('sfx-ui-click'),
    error: document.getElementById('sfx-error'),
    success: document.getElementById('sfx-success'),
    aiVoice: document.getElementById('sfx-ai-voice'),
    bgm: document.getElementById('bgm-main')
};

// ==========================================
// 2. التهيئة المبدئية والتحقق التلقائي (Auto-Login)
// ==========================================
export function initAuth() {
    console.log("🛡️ [AUTH] نظام الحماية والتشفير يعمل...");
    
    // تشغيل تأثيرات الزرار
    DOM.btnInit.addEventListener('click', handleAuthSequence);
    
    // التحقق لو القائد مسجل دخول قبل كده (لتسريع الدخول)
    const savedId = localStorage.getItem('w_rockets_id');
    const savedServer = localStorage.getItem('w_rockets_server');
    
    if (savedId && savedServer) {
        console.log("🔄 [AUTH] تم العثور على بيانات سابقة، يمكن التخطي لاحقاً...");
        // ممكن نضيف زرار "دخول سريع" هنا في المستقبل
    }
}

// ==========================================
// 3. المحرك الأساسي لتسجيل الدخول (The Core Sequence)
// ==========================================
async function handleAuthSequence() {
    // 1. تشغيل صوت الضغطة وبدء الأنيميشن
    playAudio(AUDIO.click);
    const name = DOM.inputName.value.trim();
    const pass = DOM.inputPass.value.trim();
    
    // تحديد السيرفر المختار
    let selectedServer = "mena_1";
    for (let radio of DOM.serverRadios) {
        if (radio.checked) selectedServer = radio.value;
    }

    // 2. التحقق من المدخلات (Validation)
    if (!name || !pass) {
        playAudio(AUDIO.error);
        showCyberError("خطأ في الإدخال: يجب كتابة كود القائد وكلمة المرور المشفرة!");
        triggerGlitchEffect(DOM.btnInit);
        return;
    }

    // 3. تأثير "فحص البصمة/البيانات" (UI Scanning Effect)
    DOM.btnInit.innerHTML = `<i class="fa-solid fa-radar fa-spin"></i> جاري فحص قاعدة البيانات...`;
    DOM.btnInit.classList.add('scanning');
    DOM.btnInit.disabled = true;

    try {
        // 4. الاتصال بالسيرفر الفعلي (Firebase)
        const playerId = "cmd_" + name.replace(/\s+/g, '_').toLowerCase();
        const playerRef = ref(db, `servers/${selectedServer}/players/${playerId}`);
        const snapshot = await get(playerRef);

        let playerData = null;

        if (snapshot.exists()) {
            // اللاعب موجود: نتحقق من الباسورد
            const dbData = snapshot.val();
            if (dbData.password !== pass) {
                throw new Error("ACCESS_DENIED");
            }
            playerData = dbData;
            console.log("✅ [AUTH] تم التحقق من هوية القائد بنجاح.");
        } else {
            // لاعب جديد: يتم إنشاء بروفايل جديد بناءً على قواعد اللعبة من config.js
            console.log("🆕 [AUTH] قائد جديد... جاري إنشاء ملف عسكري.");
            playerData = {
                id: playerId,
                name: name,
                password: pass, // في الألعاب الحقيقية بنشفرها، بس هنخليها كده للسرعة
                server: selectedServer,
                lat: null, lng: null,
                health: GAME_RULES.startingHealth,
                energy: GAME_RULES.startingEnergy,
                coins: GAME_RULES.startingCoins,
                rockets: GAME_RULES.startingRockets,
                shields: 0,
                score: 0,
                alliance: "مستقل",
                allianceColor: "#" + Math.floor(Math.random()*16777215).toString(16),
                territoryRange: GAME_RULES.baseTerritoryRadius,
                rank: "مجند مستجد",
                joinedAt: Date.now()
            };
            await set(playerRef, playerData);
        }

        // 5. الحفظ في المتصفح والنجاح
        localStorage.setItem('w_rockets_id', playerId);
        localStorage.setItem('w_rockets_server', selectedServer);
        
        playAudio(AUDIO.success);
        DOM.btnInit.innerHTML = `<i class="fa-solid fa-check"></i> تم التصريح!`;
        DOM.btnInit.classList.replace('scanning', 'authorized');

        // 6. تشغيل أنيميشن الدخول السينمائي
        setTimeout(() => triggerCinematicBoot(playerData), 800);

    } catch (error) {
        // فشل الدخول
        playAudio(AUDIO.error);
        DOM.btnInit.disabled = false;
        DOM.btnInit.innerHTML = `<i class="fa-solid fa-fingerprint"></i> تأكيد الهوية وبدء المزامنة`;
        DOM.btnInit.classList.remove('scanning');
        
        if (error.message === "ACCESS_DENIED") {
            showCyberError("تم رفض الوصول: كلمة المرور المشفرة غير متطابقة!");
        } else {
            showCyberError("فشل في الاتصال بالأقمار الصناعية، جرب مرة أخرى.");
            console.error(error);
        }
        triggerGlitchEffect(DOM.btnInit);
    }
}

// ==========================================
// 4. الأنيميشن السينمائي الخارق (Cinematic Transition) 🎬
// ==========================================
function triggerCinematicBoot(playerData) {
    // إخفاء شاشة البوت وإظهار شاشة تحميل الذكاء الاصطناعي
    DOM.bootScreen.classList.remove('active');
    DOM.bootScreen.classList.add('hidden');
    
    DOM.loadingScreen.classList.remove('hidden');
    DOM.loadingScreen.classList.add('active');

    // تشغيل صوت الذكاء الاصطناعي والمزيكا
    playAudio(AUDIO.aiVoice);
    AUDIO.bgm.volume = 0.3;
    AUDIO.bgm.play().catch(e => console.log("المتصفح يمنع التشغيل التلقائي"));

    // تأثير كتابة النصوص كأن الـ AI بيشتغل (Typing Effect)
    const bootSteps = [
        "جاري فك تشفير الخرائط التكتيكية...",
        "تهيئة نظام الرادار المتقدم...",
        "تفعيل بروتوكولات الذكاء الاصطناعي...",
        "جاري مزامنة ترسانة الصواريخ...",
        `مرحباً بعودتك، قائد ${playerData.name}... النظام جاهز!`
    ];

    let stepIndex = 0;
    DOM.loadingFill.style.width = "0%";

    const interval = setInterval(() => {
        if (stepIndex < bootSteps.length) {
            // تأثير الكتابة
            DOM.loadingText.innerText = bootSteps[stepIndex];
            // تزويد شريط التحميل
            DOM.loadingFill.style.width = `${(stepIndex + 1) * 20}%`;
            playAudio(AUDIO.click); // صوت تكة مع كل خطوة
            stepIndex++;
        } else {
            clearInterval(interval);
            // الانتهاء من التحميل وبدء اللعبة الفعلية
            setTimeout(() => finalizeBootSequence(playerData), 1000);
        }
    }, 800); // 800 ملي ثانية بين كل رسالة
}

function finalizeBootSequence(playerData) {
    // إخفاء التحميل
    DOM.loadingScreen.classList.remove('active');
    DOM.loadingScreen.classList.add('hidden');

    // إظهار واجهة اللعب والخريطة
    DOM.mainHud.classList.remove('hidden');
    DOM.mainHud.classList.add('active-hud');
    DOM.mapWrapper.classList.add('active-map');

    // 🔥 إرسال إشارة (Custom Event) لملف game.js عشان يبدأ يشغل الخريطة
    // ده قمة الاحتراف في الـ Modular Programming!
    const authCompleteEvent = new CustomEvent('CommanderAuthorized', { 
        detail: { player: playerData } 
    });
    window.dispatchEvent(authCompleteEvent);
    
    console.log("🚀 [AUTH] تم تسليم القيادة لملف اللعبة الرئيسي.");
}

// ==========================================
// 5. تأثيرات بصرية وصوتية مساعدة (Helpers) 🪄
// ==========================================
function playAudio(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(() => {}); // نتجاهل خطأ المتصفح لو منع الصوت
    }
}

function showCyberError(msg) {
    Swal.fire({
        title: '⚠️ اختراق فاشل',
        text: msg,
        background: 'rgba(20, 10, 10, 0.95)',
        color: '#ff4757',
        confirmButtonColor: '#ff4757',
        customClass: { popup: 'cyber-popup-error' }
    });
}

function triggerGlitchEffect(element) {
    element.classList.add('glitch-active');
    setTimeout(() => element.classList.remove('glitch-active'), 400);
}
