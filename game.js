// ==========================================================================
// 🕹️ THE MASTER GAME CONTROLLER (V6.5 - THE CINEMATIC MAESTRO)
// ==========================================================================
// العقل المدبر للعبة مع إضافة الكاميرا السينمائية ومعالجة ثغرات الأداء.

import { initAuth } from './auth.js';
import { NetCode } from './network.js';
import { UI } from './ui.js';
import { VFX } from './effects.js';
import { MARKET } from './config.js';

class GameController {
    constructor() {
        this.map = null;
        this.markers = {};        // تخزين أيقونات اللاعبين (Markers)
        this.territories = {};    // تخزين دوائر النفوذ (Circles)
        this.playersData = {};    // الذاكرة المؤقتة لبيانات اللاعبين
        
        // حالات اللعبة (Game States)
        this.isDeploying = false; 
        this.isTargeting = false; 
    }

    // ==========================================
    // 1. الإقلاع المبدئي (System Boot)
    // ==========================================
    boot() {
        console.log("🕹️ [GAME] نظام التحكم المركزي جاهز. في انتظار الهوية...");
        
        initAuth();

        window.addEventListener('CommanderAuthorized', (e) => {
            const myPlayer = e.detail.player;
            this.startGame(myPlayer);
        });
    }

    // ==========================================
    // 2. تشغيل المحركات وبناء العالم (World Building)
    // ==========================================
    startGame(myPlayer) {
        this.initTacticalMap();
        UI.init();
        VFX.init(this.map);
        NetCode.init(myPlayer); 
        this.bindGlobalEvents();
        
        console.log("🌍 [GAME] تم بناء العالم والمحركات تعمل بأقصى طاقة!");
    }

    initTacticalMap() {
        this.map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            maxBounds: [[-90, -180], [90, 180]],
            maxBoundsViscosity: 1.0,
            zoomSnap: 0.5
        }).setView([20, 0], 3);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 12, minZoom: 2
        }).addTo(this.map);

        this.map.on('click', (e) => this.handleMapClick(e.latlng));

        // 🛠️ الإصلاح السحري: إجبار الخريطة على أخذ مقاس الشاشة كاملة لتجنب الشاشة السوداء
        setTimeout(() => { this.map.invalidateSize(); }, 1500);
    }

    // ==========================================
    // 3. إدارة الأحداث والعمليات التكتيكية
    // ==========================================
    bindGlobalEvents() {
        window.addEventListener('Sync:MapUpdated', (e) => {
            this.playersData = e.detail;
            this.renderWorld();
        });

        window.addEventListener('UI:ActionLocate', () => {
            if (NetCode.currentPlayer.health <= 0) {
                return Swal.fire('قاعدة مدمرة', 'أنت ميت! قم بإصلاح قاعدتك أولاً.', 'error');
            }
            this.isDeploying = true;
            document.getElementById('map-wrapper').style.cursor = 'crosshair';
            
            // إضافة تأثير بصري للرادار عند طلب التمركز
            window.dispatchEvent(new CustomEvent('AI:TriggerRadarScan'));

            Swal.fire({
                title: 'تحديد الموقع 📍', text: 'اضغط على أي مكان استراتيجي في الخريطة لنشر قاعدتك.',
                icon: 'info', toast: true, position: 'top', showConfirmButton: false, timer: 3000
            });
        });

        window.addEventListener('Combat:MissileLaunched', (e) => {
            const { attackerId, targetId, weaponType } = e.detail;
            this.routeMissile(attackerId, targetId, weaponType);
        });
    }

    // ==========================================
    // 4. رسم العالم باحترافية (World Rendering) 🗺️
    // ==========================================
    renderWorld() {
        for (let id in this.markers) {
            if (!this.playersData[id] || this.playersData[id].status === 'offline') {
                this.map.removeLayer(this.markers[id]);
                if (this.territories[id]) this.map.removeLayer(this.territories[id]);
                delete this.markers[id];
                delete this.territories[id];
            }
        }

        for (let id in this.playersData) {
            const p = this.playersData[id];
            if (!p.lat || p.status === 'offline' || p.health <= 0) continue;

            const isMe = (NetCode.currentPlayer && NetCode.currentPlayer.id === id);
            const myAlliance = NetCode.currentPlayer ? NetCode.currentPlayer.alliance : "مستقل";
            const isAlly = (!isMe && myAlliance !== "مستقل" && p.alliance === myAlliance);

            // 1. رسم دوائر النفوذ
            const currentRadius = p.territoryRange + (p.score * 10);
            if (this.territories[id]) {
                this.territories[id].setLatLng([p.lat, p.lng]);
                this.territories[id].setRadius(currentRadius);
            } else {
                this.territories[id] = L.circle([p.lat, p.lng], {
                    color: p.allianceColor,
                    fillColor: p.allianceColor,
                    fillOpacity: isMe ? 0.15 : 0.05, 
                    weight: isMe ? 2 : 1,
                    radius: currentRadius
                }).addTo(this.map);
            }

            // 2. تصميم الأيقونة المتطورة 
            let iconGlow = p.health > 50 ? 'var(--neon-green)' : (p.health > 20 ? 'var(--neon-gold)' : 'var(--neon-red)');
            if (p.health > 100) iconGlow = '#fff'; 
            
            // إضافة أنيميشن "نبض" لقاعدتك إنت بس عشان تكون مميزة
            const pulseClass = isMe ? 'pulse-me' : '';

            const markerHtml = `
                <div class="tactical-marker ${isMe ? 'is-me' : ''} ${isAlly ? 'is-ally' : ''} ${pulseClass}" 
                     style="border-color: ${p.allianceColor}; box-shadow: 0 0 15px ${iconGlow}; background: rgba(0,0,0,0.8); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                    ${isMe ? '🛡️' : (isAlly ? '🤝' : '🎯')}
                </div>
            `;
            const customIcon = L.divIcon({ className: 'clear-icon', html: markerHtml, iconSize: [30, 30], iconAnchor: [15, 15] });

            if (this.markers[id]) {
                this.markers[id].setLatLng([p.lat, p.lng]);
                this.markers[id].setIcon(customIcon);
            } else {
                this.markers[id] = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(this.map);
                this.markers[id].on('click', () => this.handleTargetSelection(p, isMe, isAlly));
            }
        }
    }

    // ==========================================
    // 5. التفاعلات الميكانيكية (Mechanics Logic) ⚙️
    // ==========================================
    handleMapClick(latlng) {
        if (this.isDeploying) {
            NetCode.deployBase(latlng.lat, latlng.lng);
            this.isDeploying = false;
            document.getElementById('map-wrapper').style.cursor = 'default';
            
            // 🎥 الكاميرا السينمائية: زووم ناعم على قاعدتك بعد نشرها
            this.map.flyTo(latlng, 6, {
                animate: true,
                duration: 1.5 // ثانية ونصف من الطيران السينمائي
            });
            
            const sfx = document.getElementById('sfx-ui-click');
            if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }
            
            Swal.fire({ title: 'تمركز ناجح!', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
        }
    }

    async handleTargetSelection(targetPlayer, isMe, isAlly) {
        // 🛡️ حماية: منع فتح شاشة الهجوم أثناء محاولة اللاعب نشر قاعدته
        if (this.isDeploying) return;

        if (isMe) {
            Swal.fire('قاعدتك المركزية', `الدرع: ${targetPlayer.shields} | الموارد: ${targetPlayer.coins}`, 'info');
            return;
        }

        if (isAlly) {
            Swal.fire(`حليف: ${targetPlayer.name}`, 'لا يمكنك قصف حلفائك!', 'info');
            return;
        }

        const { value: action } = await Swal.fire({
            title: `استهداف: ${targetPlayer.name}`,
            html: `
                <div style="font-size: 0.9rem; margin-bottom: 15px; color: var(--neon-gold);">
                    النفوذ: ${Math.round(targetPlayer.territoryRange/1000)}كم | التحالف: ${targetPlayer.alliance}
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="atk-basic" class="cyber-button" style="border-color: var(--neon-blue);">🚀 صاروخ (50)</button>
                    <button id="atk-nuke" class="cyber-button" style="border-color: var(--neon-red);">☢️ نووي (300)</button>
                </div>
            `,
            background: 'var(--panel-bg)', color: '#fff',
            showConfirmButton: false, showCloseButton: true,
            didOpen: () => {
                document.getElementById('atk-basic').addEventListener('click', () => {
                    Swal.close(); this.confirmAttack(targetPlayer, 'basicRocket');
                });
                document.getElementById('atk-nuke').addEventListener('click', () => {
                    Swal.close(); this.confirmAttack(targetPlayer, 'nuke');
                });
            }
        });
    }

    confirmAttack(targetPlayer, weaponKey) {
        // حماية: التأكد من أن القائد حي يرزق قبل إعطاء أمر الهجوم
        if (NetCode.currentPlayer.health <= 0) {
            return Swal.fire('قاعدة مدمرة', 'أنت ميت! قم بإصلاح قاعدتك أولاً لتتمكن من الهجوم.', 'error');
        }

        const weapon = MARKET.weapons[weaponKey];
        if (NetCode.currentPlayer.coins < weapon.cost) {
            return Swal.fire('فشل التذخير', `مواردك لا تكفي لاستخدام ${weapon.name}!`, 'error');
        }
        
        NetCode.launchStrike(targetPlayer.id, weaponKey);
    }

    routeMissile(attackerId, targetId, weaponType) {
        const attacker = this.playersData[attackerId];
        const target = this.playersData[targetId];

        if (attacker && target && attacker.lat && target.lat) {
            const startLatLng = L.latLng(attacker.lat, attacker.lng);
            const endLatLng = L.latLng(target.lat, target.lng);
            
            const sfx = document.getElementById('sfx-launch');
            if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }

            // تسليم المهمة لمحرك الجرافيكس لعمل الأنيميشن الخارق
            VFX.animateFlight(startLatLng, endLatLng, weaponType);
        }
    }
}

// 🚀 نقطة الانطلاق الرسمية للعبة 
const GameManager = new GameController();
document.addEventListener('DOMContentLoaded', () => {
    GameManager.boot();
});
