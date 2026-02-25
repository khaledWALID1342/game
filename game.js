// ==========================================================================
// 🚀 WORLD ROCKETS GAME - CORE ENGINE (V2.0 PRO)
// ==========================================================================

// 1. استدعاء مكاتب Firebase (النسخة الحديثة ES6 عن طريق الـ CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase, ref, onValue, set, update, get, child, push } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================================================
// ⚠️ إعدادات السيرفر (FIREBASE CONFIG) الخاصة بيك ⚠️
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDNRQaZQGXP7UE3GskBaC0tbqEXKNq2oQc",
    authDomain: "world-rockets.firebaseapp.com",
    databaseURL: "https://world-rockets-default-rtdb.firebaseio.com", // ده ضروري جداً عشان الداتابيز تشتغل
    projectId: "world-rockets",
    storageBucket: "world-rockets.firebasestorage.app",
    messagingSenderId: "66034492326",
    appId: "1:66034492326:web:43a9a2932b7e46d7c92567",
    measurementId: "G-XVGLN0KZ0Y"
};

// تهيئة السيرفر والتحليلات وقاعدة البيانات
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// ==========================================================================
// 2. إعدادات اللعبة والخريطة الأساسية (GAME STATE & MAP)
// ==========================================================================
let currentPlayer = null;
let playersData = {}; // تخزين بيانات كل اللاعبين
let markers = {}; // تخزين أيقونات الخريطة

// تهيئة خريطة Leaflet (Dark Mode)
const map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap & CARTO',
    maxZoom: 19
}).addTo(map);

// إخفاء شاشة التحميل بعد ما الخريطة تحمل
setTimeout(() => {
    document.getElementById('loading-screen').classList.remove('active');
}, 1500);

// ==========================================================================
// 3. نظام الصوتيات (AUDIO SYSTEM)
// ==========================================================================
const sounds = {
    launch: document.getElementById('sfx-launch'),
    explosion: document.getElementById('sfx-explosion'),
    coin: document.getElementById('sfx-coin')
};
function playSound(type) {
    if (sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].play().catch(e => console.log("الصوت مقفول من المتصفح"));
    }
}

// ==========================================================================
// 4. الاتصال المباشر بالسيرفر (REAL-TIME SYNC)
// ==========================================================================
const playersRef = ref(db, 'players/');

// استماع لحظي لأي تغيير في السيرفر (حد دخل، حد انضرب، حد اشترى)
onValue(playersRef, (snapshot) => {
    if (snapshot.exists()) {
        playersData = snapshot.val();
        updateMapMarkers();
        updateLeaderboard();
        
        // تحديث واجهة اللاعب لو كان مسجل دخول
        if (currentPlayer && playersData[currentPlayer.id]) {
            currentPlayer = playersData[currentPlayer.id];
            updateHUD();
            checkDeath();
        }
    }
});

// ==========================================================================
// 5. نظام الخريطة والرسم (MAP RENDERING)
// ==========================================================================
function updateMapMarkers() {
    // مسح اللاعبين اللي ماتوا أو خرجوا
    for (let id in markers) {
        if (!playersData[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    }

    // رسم أو تحديث اللاعبين الحاليين
    for (let id in playersData) {
        let p = playersData[id];
        if (!p.lat || !p.lng || p.health <= 0) continue; // لو ميت مبيترسمش

        let isMe = (currentPlayer && currentPlayer.id === id);
        
        // شكل الأيقونة بناءً على الصحة
        let iconColor = p.health > 50 ? '#2ed573' : (p.health > 20 ? '#ffa502' : '#ff4757');
        let markerHtml = `
            <div style="
                background: ${iconColor}; 
                width: 20px; height: 20px; 
                border-radius: 50%; 
                border: 3px solid ${isMe ? '#fff' : '#000'};
                box-shadow: 0 0 15px ${iconColor};
                display: flex; justify-content: center; align-items: center;
                color: white; font-weight: bold; font-size: 10px;
            ">${p.health}</div>
        `;

        let customIcon = L.divIcon({ className: 'custom-div-icon', html: markerHtml, iconSize: [20, 20], iconAnchor: [10, 10] });

        if (markers[id]) {
            // تحديث مكان وأيقونة اللاعب الموجود
            markers[id].setLatLng([p.lat, p.lng]);
            markers[id].setIcon(customIcon);
        } else {
            // إضافة لاعب جديد للخريطة
            let m = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(map);
            m.bindPopup(`<b>${isMe ? '🛡️ قاعدتك' : '🎯 ' + p.name}</b><br>❤️ الصحة: ${p.health}%<br>🛡️ دروع: ${p.shields}`);
            
            // نظام الاستهداف
            m.on('click', () => {
                if (!isMe && currentPlayer) prepareAttack(p);
            });
            markers[id] = m;
        }
    }
}

// ==========================================================================
// 6. ميكانيكا اللعب الأساسية (CORE MECHANICS)
// ==========================================================================

// تسجيل الدخول (AUTH)
document.getElementById('btn-auth').addEventListener('click', async () => {
    const { value: name } = await Swal.fire({
        title: 'القيادة العامة',
        input: 'text',
        inputPlaceholder: 'أدخل كود القائد (اسمك)...',
        background: 'var(--bg-panel)', color: '#fff',
        confirmButtonColor: 'var(--primary-glow)',
        allowOutsideClick: false
    });

    if (!name || name.trim() === '') return;

    // بنعمل ID مميز لكل لاعب بناءً على اسمه عشان يفضل ثابت
    let playerId = "player_" + name.replace(/\s+/g, '_').toLowerCase();

    const userRef = ref(db, `players/${playerId}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            currentPlayer = snapshot.val(); // لاعب قديم
            Swal.fire({ title: 'أهلاً بعودتك أيها القائد!', icon: 'success', toast: true, position: 'top', timer: 2000, showConfirmButton: false});
        } else {
            // لاعب جديد
            currentPlayer = {
                id: playerId, name: name, lat: null, lng: null,
                health: 100, shields: 0, coins: 50, rockets: 2,
                score: 0, lastCoinTime: 0
            };
            set(userRef, currentPlayer);
            Swal.fire('تم التسجيل!', 'حدد موقع قاعدتك الآن من الخريطة.', 'info');
        }
        updateHUD();
    });
});

// تحديد الموقع (LOCATE)
document.getElementById('btn-locate').addEventListener('click', () => {
    if (!currentPlayer) return Swal.fire('خطأ', 'سجل دخول أولاً', 'error');
    if (currentPlayer.health <= 0) return Swal.fire('قاعدتك مدمرة', 'ادفع 100 كوينز لإعادة البناء!', 'error');

    Swal.fire({ title: 'نشر القاعدة', text: 'اضغط على أي مكان في الخريطة لتأسيس قاعدتك العسكرية', icon: 'info', toast: true, position: 'top'});
    
    map.once('click', (e) => {
        update(ref(db, `players/${currentPlayer.id}`), {
            lat: e.latlng.lat,
            lng: e.latlng.lng
        });
        Swal.fire({title: 'تم تمركز القاعدة', icon: 'success', toast: true, timer: 1500, showConfirmButton: false});
    });
});

// نظام الكوينز والـ Cooldown (ECONOMY)
document.getElementById('btn-collect-coins').addEventListener('click', () => {
    if (!currentPlayer) return;
    
    let now = Date.now();
    let cooldown = 3600000; // ساعة كاملة
    let timePassed = now - currentPlayer.lastCoinTime;

    if (timePassed < cooldown) {
        let minsLeft = Math.ceil((cooldown - timePassed) / 60000);
        return Swal.fire('الموارد غير جاهزة', `انتظر ${minsLeft} دقيقة لتجميع الموارد مرة أخرى.`, 'warning');
    }

    playSound('coin');
    update(ref(db, `players/${currentPlayer.id}`), {
        coins: currentPlayer.coins + 20,
        lastCoinTime: now
    });
    Swal.fire({title: '+20 Coins', icon: 'success', toast: true, position: 'bottom-end', timer: 1500, showConfirmButton: false});
});

// المتجر والسوق الأسود (SHOP)
document.getElementById('btn-shop').addEventListener('click', async () => {
    if (!currentPlayer) return;
    
    const { value: item } = await Swal.fire({
        title: 'السوق الأسود 🛒',
        input: 'radio',
        inputOptions: {
            'rocket': '🚀 صاروخ باليستي (50 Coins)',
            'shield': '🛡️ درع طاقة (80 Coins)',
            'heal': '🛠️ إصلاح القاعدة +50% (100 Coins)'
        },
        inputValidator: (value) => { if (!value) return 'لازم تختار حاجة!' },
        background: 'var(--bg-panel)', color: '#fff', confirmButtonColor: 'var(--accent-gold)'
    });

    if (item) {
        let cost = item === 'rocket' ? 50 : item === 'shield' ? 80 : 100;
        if (currentPlayer.coins >= cost) {
            let updates = { coins: currentPlayer.coins - cost };
            if (item === 'rocket') updates.rockets = currentPlayer.rockets + 1;
            if (item === 'shield') updates.shields = currentPlayer.shields + 1;
            if (item === 'heal') updates.health = Math.min(100, currentPlayer.health + 50); // ماكسيموم 100
            
            update(ref(db, `players/${currentPlayer.id}`), updates);
            playSound('coin');
            Swal.fire({title: 'تم الشراء بنجاح', icon: 'success', toast: true, timer: 1500, showConfirmButton: false});
        } else {
            Swal.fire('رصيد غير كافي', 'روح جمع كوينز الأول يا بطل!', 'error');
        }
    }
});

// ==========================================================================
// 7. نظام الحروب والصواريخ المعقد (COMBAT SYSTEM)
// ==========================================================================
function prepareAttack(targetData) {
    if (currentPlayer.rockets <= 0) return Swal.fire('لا يوجد ذخيرة', 'اشتري صواريخ من السوق الأسود', 'error');
    if (!currentPlayer.lat) return Swal.fire('خطأ', 'لازم تحدد موقع قاعدتك الأول عشان تضرب', 'error');

    Swal.fire({
        title: `تأكيد الإطلاق على ${targetData.name}؟`,
        text: 'سيتم استهلاك 1 صاروخ',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: '🚀 إطلاق!',
        cancelButtonText: 'إلغاء',
        background: 'var(--bg-panel)', color: '#fff', confirmButtonColor: 'var(--primary-glow)'
    }).then((result) => {
        if (result.isConfirmed) executeAttack(targetData);
    });
}

function executeAttack(targetData) {
    playSound('launch');
    
    // 1. خصم الصاروخ من المهاجم
    update(ref(db, `players/${currentPlayer.id}`), { rockets: currentPlayer.rockets - 1 });

    // 2. حساب المسافة لتحديد وقت وصول الصاروخ (معادلة هندسية)
    let startLatLng = L.latLng(currentPlayer.lat, currentPlayer.lng);
    let endLatLng = L.latLng(targetData.lat, targetData.lng);
    let distance = startLatLng.distanceTo(endLatLng); // المسافة بالمتر
    let flightTime = Math.min(10000, Math.max(2000, distance / 1000)); // من ثانيتين لـ 10 ثواني كحد أقصى

    // 3. أنيميشن الصاروخ على الخريطة
    animateRocketFlight(startLatLng, endLatLng, flightTime);

    // 4. تنفيذ الضرر بعد وصول الصاروخ
    setTimeout(() => {
        playSound('explosion');
        // جلب بيانات الهدف الحديثة (عشان ممكن يكون اشترى درع وهو طاير!)
        get(ref(db, `players/${targetData.id}`)).then((snap) => {
            if (snap.exists()) {
                let currentTarget = snap.val();
                if (currentTarget.health <= 0) return; // مات خلاص

                let updates = {};
                let killMsg = '';

                // نظام صد الدروع
                if (currentTarget.shields > 0) {
                    updates.shields = currentTarget.shields - 1;
                    killMsg = `🛡️ ${targetData.name} صد صاروخ من ${currentPlayer.name}!`;
                } else {
                    updates.health = currentTarget.health - 25; // الصاروخ بينقص 25
                    if (updates.health <= 0) {
                        updates.health = 0;
                        killMsg = `☠️ ${currentPlayer.name} دمر قاعدة ${targetData.name} تماماً!`;
                        // زيادة السكور للمهاجم
                        update(ref(db, `players/${currentPlayer.id}`), { score: currentPlayer.score + 100 });
                    } else {
                        killMsg = `💥 ${currentPlayer.name} ضرب ${targetData.name} مباشر!`;
                        update(ref(db, `players/${currentPlayer.id}`), { score: currentPlayer.score + 20 });
                    }
                }

                update(ref(db, `players/${targetData.id}`), updates);
                broadcastKillFeed(killMsg);
            }
        });
    }, flightTime);
}

// دالة أنيميشن الصاروخ (بتعمل خط بيتحرك)
function animateRocketFlight(start, end, duration) {
    let rocketIcon = L.divIcon({ className: 'rocket-fly', html: '🚀', iconSize: [30, 30] });
    let flyingMarker = L.marker(start, { icon: rocketIcon, zIndexOffset: 1000 }).addTo(map);
    
    let startTime = performance.now();
    
    function animate(currentTime) {
        let elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / duration, 1); // من 0 لـ 1

        // Interpolation (حساب النقطة الحالية بين البداية والنهاية)
        let currentLat = start.lat + (end.lat - start.lat) * progress;
        let currentLng = start.lng + (end.lng - start.lng) * progress;
        
        flyingMarker.setLatLng([currentLat, currentLng]);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            map.removeLayer(flyingMarker); // يختفي لما يوصل
            // تأثير انفجار مكانه
            let exp = L.marker(end, { icon: L.divIcon({html: '💥', iconSize:[40,40]}) }).addTo(map);
            setTimeout(() => map.removeLayer(exp), 1000);
        }
    }
    requestAnimationFrame(animate);
}

// ==========================================================================
// 8. واجهة المستخدم والتحديثات (UI UPDATES & KILL FEED)
// ==========================================================================
function updateHUD() {
    if (!currentPlayer) return;
    document.getElementById('hud-health').innerText = currentPlayer.health + '%';
    document.getElementById('hud-shield').innerText = currentPlayer.shields;
    document.getElementById('hud-coins').innerText = currentPlayer.coins;
    document.getElementById('hud-rockets').innerText = currentPlayer.rockets;

    // تغيير لون الصحة لو بتموت
    let healthColor = currentPlayer.health > 50 ? 'var(--health-green)' : 'var(--primary-glow)';
    document.querySelector('.stat-badge.health').style.color = healthColor;
    document.querySelector('.stat-badge.health span').style.textShadow = `0 0 8px ${healthColor}`;
}

function updateLeaderboard() {
    let list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    // ترتيب اللاعبين بالسكور
    let sortedPlayers = Object.values(playersData)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // أول 10 بس

    sortedPlayers.forEach((p, index) => {
        let rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        let status = p.health <= 0 ? '☠️' : '';
        list.innerHTML += `
            <div class="leaderboard-item ${rankClass}">
                <div class="player-info">
                    <strong>#${index + 1} ${p.name}</strong> ${status}
                </div>
                <div class="player-score">⭐ ${p.score}</div>
            </div>
        `;
    });
}

function broadcastKillFeed(msg) {
    // بيبعت الإشعار لكل الناس عن طريق إضافة مؤقتة في الداتابيز
    let newMsgRef = push(ref(db, 'killfeed'));
    set(newMsgRef, { text: msg, time: Date.now() });
}

// استقبال الإشعارات الحية
onValue(ref(db, 'killfeed'), (snapshot) => {
    if (snapshot.exists()) {
        let feedBox = document.getElementById('kill-feed');
        feedBox.innerHTML = ''; // بننظف القديم
        let allMsgs = snapshot.val();
        
        // عرض أحدث 3 إشعارات فقط من آخر 10 ثواني
        let recentMsgs = Object.values(allMsgs)
            .filter(m => Date.now() - m.time < 10000)
            .sort((a, b) => b.time - a.time)
            .slice(0, 3);

        recentMsgs.forEach(m => {
            let el = document.createElement('div');
            el.className = 'kill-msg';
            el.innerHTML = m.text;
            feedBox.appendChild(el);
        });
    }
});

function checkDeath() {
    if (currentPlayer && currentPlayer.health <= 0) {
        Swal.fire({
            title: 'قاعدتك اتدمرت! ☠️',
            text: 'لقد تم محوك من الخريطة.',
            icon: 'error',
            confirmButtonText: 'إعادة بناء القاعدة (100 Coins)',
            background: 'var(--bg-panel)', color: '#fff'
        }).then((result) => {
            if (result.isConfirmed) {
                if (currentPlayer.coins >= 100) {
                    update(ref(db, `players/${currentPlayer.id}`), { health: 100, coins: currentPlayer.coins - 100 });
                } else {
                    Swal.fire('فشلت الإنعاش', 'معاكش كوينز كفاية، جمع كوينز وارجع تاني.', 'warning');
                }
            }
        });
    }
}
