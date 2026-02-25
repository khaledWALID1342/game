// ==========================================================================
// 🚀 WORLD ROCKETS GAME - CORE ENGINE (V2.0 PRO)
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getDatabase, ref, onValue, set, update, get, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ==========================================================================
// ⚠️ إعدادات السيرفر (FIREBASE CONFIG) ⚠️
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDNRQaZQGXP7UE3GskBaC0tbqEXKNq2oQc",
    authDomain: "world-rockets.firebaseapp.com",
    databaseURL: "https://world-rockets-default-rtdb.firebaseio.com", 
    projectId: "world-rockets",
    storageBucket: "world-rockets.firebasestorage.app",
    messagingSenderId: "66034492326",
    appId: "1:66034492326:web:43a9a2932b7e46d7c92567",
    measurementId: "G-XVGLN0KZ0Y"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getDatabase(app);

// ==========================================================================
// إعدادات اللعبة والخريطة الأساسية 
// ==========================================================================
let currentPlayer = null;
let playersData = {}; 
let markers = {}; 
let currentLang = 'ar'; // لغة اللعبة الافتراضية

const map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© OpenStreetMap & CARTO',
    maxZoom: 19
}).addTo(map);

setTimeout(() => {
    document.getElementById('loading-screen').classList.remove('active');
}, 1500);

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
// الاتصال المباشر بالسيرفر 
// ==========================================================================
const playersRef = ref(db, 'players/');

onValue(playersRef, (snapshot) => {
    if (snapshot.exists()) {
        playersData = snapshot.val();
        updateMapMarkers();
        updateLeaderboard();
        
        if (currentPlayer && playersData[currentPlayer.id]) {
            currentPlayer = playersData[currentPlayer.id];
            updateHUD();
            checkDeath();
        }
    }
});

function updateMapMarkers() {
    for (let id in markers) {
        if (!playersData[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }
    }

    for (let id in playersData) {
        let p = playersData[id];
        if (!p.lat || !p.lng || p.health <= 0) continue; 

        let isMe = (currentPlayer && currentPlayer.id === id);
        let iconColor = p.health > 50 ? '#2ed573' : (p.health > 20 ? '#ffa502' : '#ff4757');
        
        // لو الصحة 1000 (God Mode)، نغير اللون للذهبي
        if(p.health > 100) iconColor = 'gold';

        let markerHtml = `
            <div style="
                background: ${iconColor}; 
                width: 20px; height: 20px; 
                border-radius: 50%; 
                border: 3px solid ${isMe ? '#fff' : '#000'};
                box-shadow: 0 0 15px ${iconColor};
                display: flex; justify-content: center; align-items: center;
                color: ${p.health > 100 ? '#000' : 'white'}; font-weight: bold; font-size: 8px;
            ">${p.health > 100 ? '👑' : p.health}</div>
        `;

        let customIcon = L.divIcon({ className: 'custom-div-icon', html: markerHtml, iconSize: [20, 20], iconAnchor: [10, 10] });

        if (markers[id]) {
            markers[id].setLatLng([p.lat, p.lng]);
            markers[id].setIcon(customIcon);
        } else {
            let m = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(map);
            m.bindPopup(`<b>${isMe ? '🛡️ قاعدتك' : '🎯 ' + p.name}</b><br>❤️ الصحة: ${p.health}%<br>🛡️ دروع: ${p.shields}`);
            
            m.on('click', () => {
                if (!isMe && currentPlayer) prepareAttack(p);
            });
            markers[id] = m;
        }
    }
}

// ==========================================================================
// ميكانيكا اللعب والتسجيل 
// ==========================================================================
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

    let playerId = "player_" + name.replace(/\s+/g, '_').toLowerCase();

    const userRef = ref(db, `players/${playerId}`);
    get(userRef).then((snapshot) => {
        if (snapshot.exists()) {
            currentPlayer = snapshot.val(); 
            Swal.fire({ title: 'أهلاً بعودتك أيها القائد!', icon: 'success', toast: true, position: 'top', timer: 2000, showConfirmButton: false});
        } else {
            currentPlayer = {
                id: playerId, name: name, lat: null, lng: null,
                health: 100, shields: 0, coins: 50, rockets: 2,
                score: 0, lastCoinTime: 0
            };
            set(userRef, currentPlayer);
            Swal.fire('تم التسجيل!', 'حدد موقع قاعدتك الآن من الخريطة.', 'info');
        }
        updateHUD();
        
        // السطر السحري لحل مشكلة كراش الخريطة
        setTimeout(() => { map.invalidateSize(); }, 500);
    });
});

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

document.getElementById('btn-collect-coins').addEventListener('click', () => {
    if (!currentPlayer) return Swal.fire('خطأ', 'سجل دخول الأول يا بطل!', 'error');
    
    let now = Date.now();
    let cooldown = 3600000; 
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

// ==========================================================================
// نظام السوق الأسود المتطور 
// ==========================================================================
document.getElementById('btn-shop').addEventListener('click', () => {
    if (!currentPlayer) return Swal.fire('خطأ', 'سجل دخول الأول يا بطل!', 'error');
    
    Swal.fire({
        title: 'السوق الأسود 🛒',
        html: `
            <div style="display:flex; flex-direction:column; gap:15px; margin-top: 10px;">
                <button id="buy-rocket" class="btn-glow" style="width:100%; padding:15px; border-color:var(--primary-glow); font-size:1.1rem;">
                    🚀 صاروخ باليستي <br><span style="color:#ff4757; font-size:0.9rem;">السعر: 50 Coins</span>
                </button>
                <button id="buy-shield" class="btn-glow" style="width:100%; padding:15px; border-color:var(--shield-blue); font-size:1.1rem;">
                    🛡️ درع طاقة <br><span style="color:#70a1ff; font-size:0.9rem;">السعر: 80 Coins</span>
                </button>
                <button id="buy-heal" class="btn-glow" style="width:100%; padding:15px; border-color:var(--health-green); font-size:1.1rem;">
                    🛠️ إصلاح القاعدة +50% <br><span style="color:#2ed573; font-size:0.9rem;">السعر: 100 Coins</span>
                </button>
            </div>
        `,
        background: 'var(--bg-panel)', color: '#fff',
        showConfirmButton: false, showCloseButton: true,
        didOpen: () => {
            document.getElementById('buy-rocket').addEventListener('click', () => handlePurchase('rocket', 50));
            document.getElementById('buy-shield').addEventListener('click', () => handlePurchase('shield', 80));
            document.getElementById('buy-heal').addEventListener('click', () => handlePurchase('heal', 100));
        }
    });
});

function handlePurchase(item, cost) {
    if (currentPlayer.coins >= cost) {
        let updates = { coins: currentPlayer.coins - cost };
        if (item === 'rocket') updates.rockets = currentPlayer.rockets + 1;
        if (item === 'shield') updates.shields = currentPlayer.shields + 1;
        if (item === 'heal') updates.health = Math.min(100, currentPlayer.health + 50); 
        // الماكسيموم 100، إلا لو كان مفعل God Mode هيحتفظ بصحته
        if (currentPlayer.health > 100) updates.health = currentPlayer.health; 
        
        update(ref(db, `players/${currentPlayer.id}`), updates);
        playSound('coin');
        Swal.fire({title: 'تم الشراء بنجاح! 💸', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false});
    } else {
        Swal.fire('رصيد غير كافي', 'محتاج تجمع Coins أكتر عشان تشتري ده!', 'error');
    }
}

// ==========================================================================
// نظام الإعدادات وحذف الحساب والأدمن ⚙️
// ==========================================================================
document.getElementById('btn-settings').addEventListener('click', () => {
    Swal.fire({
        title: 'الإعدادات ⚙️',
        html: `
            <div style="display:flex; flex-direction:column; gap:10px;">
                <button id="toggle-lang" class="btn-glow" style="border-color:var(--shield-blue);">🌍 تغيير اللغة (AR/EN)</button>
                <button id="admin-code" class="btn-glow" style="border-color:var(--accent-gold);">🤫 إدخال كود سري</button>
                <button id="delete-acc" class="btn-glow" style="border-color:#ff4757; color:#ff4757;">🗑️ حذف حسابي نهائياً</button>
            </div>
        `,
        background: 'var(--bg-panel)', color: '#fff',
        showConfirmButton: false, showCloseButton: true,
        didOpen: () => {
            // 1. تغيير اللغة (تأثير بصري بسيط حالياً)
            document.getElementById('toggle-lang').addEventListener('click', () => {
                currentLang = currentLang === 'ar' ? 'en' : 'ar';
                document.querySelector('.logo').innerHTML = currentLang === 'en' ? '<i class="fa-solid fa-earth-americas"></i> World Rockets' : '<i class="fa-solid fa-earth-americas"></i> حروب الصواريخ';
                Swal.fire('تم', 'تم تغيير لغة الواجهة (ميزة تجريبية)', 'success');
            });

            // 2. كود الأدمن السري (إمبراطور الخريطة)
            document.getElementById('admin-code').addEventListener('click', async () => {
                const { value: code } = await Swal.fire({
                    title: 'كود الإدارة', input: 'password', background: 'var(--bg-panel)', color: '#fff'
                });
                if(code === 'KHALED_VIP') {
                    if(!currentPlayer) return Swal.fire('خطأ', 'سجل دخول الأول', 'error');
                    update(ref(db, `players/${currentPlayer.id}`), {
                        coins: 99999, rockets: 999, shields: 100, health: 1000 // God Mode
                    });
                    broadcastKillFeed("👑 الإمبراطور القائد وصل الخريطة، استعدوا للدمار!");
                    Swal.fire('تم التفعيل', 'أهلاً بك يا زعيم 😈 الخريطة كلها بتاعتك.', 'success');
                } else if(code) {
                    Swal.fire('كود خاطئ', 'حاول تلعب بشرف يا بطل 😂', 'error');
                }
            });

            // 3. حذف الحساب نهائياً
            document.getElementById('delete-acc').addEventListener('click', () => {
                if(!currentPlayer) return Swal.fire('خطأ', 'أنت لم تسجل دخولك بعد', 'error');
                Swal.fire({
                    title: 'متأكد؟', text: "كل إنجازاتك وقاعدتك هتتمسح!", icon: 'warning',
                    showCancelButton: true, confirmButtonColor: '#ff4757', confirmButtonText: 'نعم، احذف حسابي', cancelButtonText: 'إلغاء',
                    background: 'var(--bg-panel)', color: '#fff'
                }).then((result) => {
                    if (result.isConfirmed) {
                        remove(ref(db, `players/${currentPlayer.id}`));
                        currentPlayer = null;
                        Swal.fire({title: 'تم الحذف', icon: 'success', timer: 1500}).then(() => {
                            window.location.reload(); // تحديث الصفحة
                        });
                    }
                });
            });
        }
    });
});

// ==========================================================================
// نظام الحروب والصواريخ والأنيميشن الذكي 
// ==========================================================================
function prepareAttack(targetData) {
    if (currentPlayer.rockets <= 0) return Swal.fire('لا يوجد ذخيرة', 'اشتري صواريخ من السوق الأسود', 'error');
    if (!currentPlayer.lat) return Swal.fire('خطأ', 'لازم تحدد موقع قاعدتك الأول عشان تضرب', 'error');

    Swal.fire({
        title: `تأكيد الإطلاق على ${targetData.name}؟`, text: 'سيتم استهلاك 1 صاروخ', icon: 'warning',
        showCancelButton: true, confirmButtonText: '🚀 إطلاق!', cancelButtonText: 'إلغاء',
        background: 'var(--bg-panel)', color: '#fff', confirmButtonColor: 'var(--primary-glow)'
    }).then((result) => {
        if (result.isConfirmed) executeAttack(targetData);
    });
}

function executeAttack(targetData) {
    playSound('launch');
    update(ref(db, `players/${currentPlayer.id}`), { rockets: currentPlayer.rockets - 1 });

    let startLatLng = L.latLng(currentPlayer.lat, currentPlayer.lng);
    let endLatLng = L.latLng(targetData.lat, targetData.lng);
    let distance = startLatLng.distanceTo(endLatLng); 
    let flightTime = Math.min(10000, Math.max(2000, distance / 1000)); 

    animateRocketFlight(startLatLng, endLatLng, flightTime);

    setTimeout(() => {
        playSound('explosion');
        get(ref(db, `players/${targetData.id}`)).then((snap) => {
            if (snap.exists()) {
                let currentTarget = snap.val();
                if (currentTarget.health <= 0) return; 

                let updates = {};
                let killMsg = '';

                if (currentTarget.shields > 0) {
                    updates.shields = currentTarget.shields - 1;
                    killMsg = `🛡️ ${targetData.name} صد صاروخ من ${currentPlayer.name}!`;
                } else {
                    updates.health = currentTarget.health - 25; 
                    if (updates.health <= 0) {
                        updates.health = 0;
                        killMsg = `☠️ ${currentPlayer.name} دمر قاعدة ${targetData.name} تماماً!`;
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

// الأنيميشن الذكي (الصاروخ بيلف وشه للهدف)
function animateRocketFlight(start, end, duration) {
    let p1 = map.latLngToContainerPoint(start);
    let p2 = map.latLngToContainerPoint(end);
    let angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 45; 

    let rocketIcon = L.divIcon({ 
        className: 'rocket-fly', 
        html: `<div style="transform: rotate(${angle}deg); font-size: 25px; filter: drop-shadow(0 0 10px red);">🚀</div>`, 
        iconSize: [30, 30] 
    });
    
    let flyingMarker = L.marker(start, { icon: rocketIcon, zIndexOffset: 1000 }).addTo(map);
    let startTime = performance.now();
    
    function animate(currentTime) {
        let elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / duration, 1); 

        let currentLat = start.lat + (end.lat - start.lat) * progress;
        let currentLng = start.lng + (end.lng - start.lng) * progress;
        
        flyingMarker.setLatLng([currentLat, currentLng]);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            map.removeLayer(flyingMarker); 
            let exp = L.marker(end, { icon: L.divIcon({html: '<div style="font-size:40px; animation: pulseGlow 0.5s;">💥</div>', iconSize:[40,40]}) }).addTo(map);
            setTimeout(() => map.removeLayer(exp), 1000);
        }
    }
    requestAnimationFrame(animate);
}

// ==========================================================================
// واجهة المستخدم والتحديثات
// ==========================================================================
function updateHUD() {
    if (!currentPlayer) return;
    document.getElementById('hud-health').innerText = (currentPlayer.health > 100 ? 'GOD' : currentPlayer.health + '%');
    document.getElementById('hud-shield').innerText = currentPlayer.shields;
    document.getElementById('hud-coins').innerText = currentPlayer.coins;
    document.getElementById('hud-rockets').innerText = currentPlayer.rockets;

    let healthColor = currentPlayer.health > 50 ? 'var(--health-green)' : 'var(--primary-glow)';
    if(currentPlayer.health > 100) healthColor = 'gold'; // لون الأدمن
    document.querySelector('.stat-badge.health').style.color = healthColor;
    document.querySelector('.stat-badge.health span').style.textShadow = `0 0 8px ${healthColor}`;
}

function updateLeaderboard() {
    let list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    let sortedPlayers = Object.values(playersData)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); 

    sortedPlayers.forEach((p, index) => {
        let rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';
        let status = p.health <= 0 ? '☠️' : (p.health > 100 ? '👑' : '');
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

// زرار تصغير وتكبير قائمة القادة
document.querySelector('.panel-title').addEventListener('click', () => {
    document.getElementById('leaderboard-panel').classList.toggle('collapsed');
});
document.getElementById('leaderboard-panel').classList.add('collapsed');

function broadcastKillFeed(msg) {
    let newMsgRef = push(ref(db, 'killfeed'));
    set(newMsgRef, { text: msg, time: Date.now() });
}

onValue(ref(db, 'killfeed'), (snapshot) => {
    if (snapshot.exists()) {
        let feedBox = document.getElementById('kill-feed');
        feedBox.innerHTML = ''; 
        let allMsgs = snapshot.val();
        
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
            title: 'قاعدتك اتدمرت! ☠️', text: 'لقد تم محوك من الخريطة.', icon: 'error',
            confirmButtonText: 'إعادة بناء القاعدة (100 Coins)',
            background: 'var(--bg-panel)', color: '#fff', allowOutsideClick: false
        }).then((result) => {
            if (result.isConfirmed) {
                if (currentPlayer.coins >= 100) {
                    update(ref(db, `players/${currentPlayer.id}`), { health: 100, coins: currentPlayer.coins - 100 });
                } else {
                    Swal.fire('فشلت الإنعاش', 'معاكش كوينز كفاية، استنى وجمع كوينز أو ابدأ من جديد.', 'warning');
                }
            }
        });
    }
}
