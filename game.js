// ==========================================================================
// 🕹️ THE MASTER GAME CONTROLLER (V6.0 - THE MAESTRO)
// ==========================================================================
// هذا الملف هو العقل المدبر الذي يربط جميع الوحدات (Modules) ببعضها.
// تمت كتابته بهندسة (Event-Driven) لضمان أداء يصل إلى 60 إطار/ثانية.

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
        this.activeWeapon = null;
    }

    // ==========================================
    // 1. الإقلاع المبدئي (System Boot)
    // ==========================================
    boot() {
        console.log("🕹️ [GAME] نظام التحكم المركزي جاهز. في انتظار الهوية...");
        
        // تشغيل نظام الحماية أولاً
        initAuth();

        // الاستماع لإشارة نجاح تسجيل الدخول من auth.js
        window.addEventListener('CommanderAuthorized', (e) => {
            const myPlayer = e.detail.player;
            this.startGame(myPlayer);
        });
    }

    // ==========================================
    // 2. تشغيل المحركات وبناء العالم (World Building)
    // ==========================================
    startGame(myPlayer) {
        // 1. بناء الخريطة التكتيكية
        this.initTacticalMap();

        // 2. تشغيل جميع الأنظمة الفرعية
        UI.init();
        VFX.init(this.map);
        NetCode.init(myPlayer); // الاتصال بالسيرفر يبدأ الآن!

        // 3. ربط الأحداث (Event Listeners)
        this.bindGlobalEvents();
        
        console.log("🌍 [GAME] تم بناء العالم والمحركات تعمل بأقصى طاقة!");
    }

    // بناء خريطة Leaflet باحترافية (منع الخروج عن الحدود، إخفاء أزرار الزووم)
    initTacticalMap() {
        this.map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            maxBounds: [[-90, -180], [90, 180]], // منع سحب الخريطة للعدم
            maxBoundsViscosity: 1.0,
            zoomSnap: 0.5
        }).setView([20, 0], 3);

        // استخدام ستايل الخرائط المظلم (Dark All) المتوافق مع السايبر بانك
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 12,
            minZoom: 2
        }).addTo(this.map);

        // تفعيل نظام الضغط على الخريطة (للتمركز)
        this.map.on('click', (e) => this.handleMapClick(e.latlng));
    }

    // ==========================================
    // 3. إدارة الأحداث والعمليات التكتيكية (Event Orchestration)
    // ==========================================
    bindGlobalEvents() {
        // استقبال تحديثات الخريطة من السيرفر (عن طريق network.js)
        window.addEventListener('Sync:MapUpdated', (e) => {
            this.playersData = e.detail;
            this.renderWorld();
        });

        // اللاعب طلب تحديد موقعه (من ui.js)
        window.addEventListener('UI:ActionLocate', () => {
            if (NetCode.currentPlayer.health <= 0) {
                return Swal.fire('قاعدة مدمرة', 'أنت ميت! قم بإصلاح قاعدتك أولاً.', 'error');
            }
            this.isDeploying = true;
            document.getElementById('map-wrapper').style.cursor = 'crosshair';
            Swal.fire({
                title: 'تحديد الموقع 📍', text: 'اضغط على أي مكان استراتيجي في الخريطة لنشر قاعدتك.',
                icon: 'info', toast: true, position: 'top', showConfirmButton: false, timer: 3000
            });
        });

        // محرك الأكشن: ربط أنيميشن الصواريخ بالإحداثيات
        window.addEventListener('Combat:MissileLaunched', (e) => {
            const { attackerId, targetId, weaponType } = e.detail;
            this.routeMissile(attackerId, targetId, weaponType);
        });
    }

    // ==========================================
    // 4. رسم العالم باحترافية (World Rendering) 🗺️
    // ==========================================
    renderWorld() {
        // تنظيف الخريطة من اللاعبين الموتى أو الذين قطعوا الاتصال
        for (let id in this.markers) {
            if (!this.playersData[id] || this.playersData[id].status === 'offline') {
                this.map.removeLayer(this.markers[id]);
                if (this.territories[id]) this.map.removeLayer(this.territories[id]);
                delete this.markers[id];
                delete this.territories[id];
            }
        }

        // رسم أو تحديث اللاعبين النشطين
        for (let id in this.playersData) {
            const p = this.playersData[id];
            if (!p.lat || p.status === 'offline' || p.health <= 0) continue;

            const isMe = (NetCode.currentPlayer.id === id);
            const myAlliance = NetCode.currentPlayer.alliance;
            const isAlly = (!isMe && myAlliance !== "مستقل" && p.alliance === myAlliance);

            // 1. رسم وتحديث منطقة النفوذ (Territory Circle)
            const currentRadius = p.territoryRange + (p.score * 10);
            if (this.territories[id]) {
                this.territories[id].setLatLng([p.lat, p.lng]);
                this.territories[id].setRadius(currentRadius);
            } else {
                this.territories[id] = L.circle([p.lat, p.lng], {
                    color: p.allianceColor,
                    fillColor: p.allianceColor,
                    fillOpacity: isMe ? 0.2 : 0.1, // منطقتي تكون أوضح قليلاً
                    weight: isMe ? 2 : 1,
                    radius: currentRadius
                }).addTo(this.map);
            }

            // 2. تصميم الأيقونة المتطورة (Advanced Marker)
            let iconGlow = p.health > 50 ? 'var(--neon-green)' : (p.health > 20 ? 'var(--neon-gold)' : 'var(--neon-red)');
            if (p.health > 100) iconGlow = '#fff'; // God Mode

            const markerHtml = `
                <div class="tactical-marker ${isMe ? 'is-me' : ''} ${isAlly ? 'is-ally' : ''}" 
                     style="border-color: ${p.allianceColor}; box-shadow: 0 0 15px ${iconGlow};">
                    ${isMe ? '🛡️' : (isAlly ? '🤝' : '🎯')}
                </div>
            `;
            const customIcon = L.divIcon({ className: 'clear-icon', html: markerHtml, iconSize: [30, 30], iconAnchor: [15, 15] });

            // 3. تحديث أو إنشاء الماركر
            if (this.markers[id]) {
                this.markers[id].setLatLng([p.lat, p.lng]);
                this.markers[id].setIcon(customIcon);
            } else {
                this.markers[id] = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(this.map);
                
                // تفاعل الضغط على قاعدة العدو/الحليف
                this.markers[id].on('click', () => this.handleTargetSelection(p, isMe, isAlly));
            }
        }
    }

    // ==========================================
    // 5. التفاعلات الميكانيكية (Mechanics Logic) ⚙️
    // ==========================================
    handleMapClick(latlng) {
        if (this.isDeploying) {
            // تثبيت القاعدة
            NetCode.deployBase(latlng.lat, latlng.lng);
            this.isDeploying = false;
            document.getElementById('map-wrapper').style.cursor = 'default';
            
            // مؤثر صوتي وبصري خفيف
            const sfx = document.getElementById('sfx-ui-click');
            if(sfx) { sfx.currentTime = 0; sfx.play(); }
            
            Swal.fire({ title: 'تمركز ناجح!', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
        }
    }

    async handleTargetSelection(targetPlayer, isMe, isAlly) {
        if (isMe) {
            Swal.fire('قاعدتك', `الدرع: ${targetPlayer.shields} | الموارد: ${targetPlayer.coins}`, 'info');
            return;
        }

        // لو حليف
        if (isAlly) {
            Swal.fire(`حليف: ${targetPlayer.name}`, 'لا يمكنك قصف حلفائك، يمكن إرسال رسائل دعم قريباً!', 'info');
            return;
        }

        // لو عدو -> فتح نظام الاستهداف العسكري
        const { value: action } = await Swal.fire({
            title: `استهداف: ${targetPlayer.name}`,
            html: `
                <div style="font-size: 0.9rem; margin-bottom: 15px; color: var(--neon-gold);">
                    النفوذ: ${Math.round(targetPlayer.territoryRange/1000)}كم | التحالف: ${targetPlayer.alliance}
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="atk-basic" class="cyber-button" style="border-color: var(--neon-blue);">🚀 صاروخ عادي (50)</button>
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
        const weapon = MARKET.weapons[weaponKey];
        if (NetCode.currentPlayer.coins < weapon.cost && weaponKey === 'nuke') {
            return Swal.fire('فشل التذخير', 'مواردك لا تكفي لتصنيع قنبلة نووية!', 'error');
        }
        
        // إعطاء الأمر لـ network.js بالتنفيذ
        NetCode.launchStrike(targetPlayer.id, weaponKey);
    }

    // دالة محورية: جلب الإحداثيات وتمريرها لمحرك الجرافيكس (VFX)
    routeMissile(attackerId, targetId, weaponType) {
        const attacker = this.playersData[attackerId];
        const target = this.playersData[targetId];

        if (attacker && target && attacker.lat && target.lat) {
            const startLatLng = L.latLng(attacker.lat, attacker.lng);
            const endLatLng = L.latLng(target.lat, target.lng);
            
            // تشغيل صوت الإطلاق
            const sfx = document.getElementById('sfx-launch');
            if(sfx) { sfx.currentTime = 0; sfx.play(); }

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
