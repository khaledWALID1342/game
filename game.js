// ==========================================================================
// 🕹️ THE MASTER GAME CONTROLLER (V8.5 - SCOUT PLANES & FIXES)
// ==========================================================================

import { initAuth } from './auth.js';
import { NetCode } from './network.js';
import { UI } from './ui.js';
import { VFX } from './effects.js';
import { MARKET } from './config.js';
import { ref, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './config.js';

class GameController {
    constructor() {
        this.map = null;
        this.markers = {};        
        this.territories = {};    
        this.playersData = {};    
        this.isDeploying = false; 
        this.hasLockedPosition = false; 
    }

    boot() {
        initAuth();
        window.addEventListener('CommanderAuthorized', (e) => this.startGame(e.detail.player));
    }

    startGame(myPlayer) {
        this.initTacticalMap();
        UI.init();
        VFX.init(this.map);
        NetCode.init(myPlayer); 
        
        if (myPlayer.lat) this.hasLockedPosition = true;
        this.bindGlobalEvents();
    }

    initTacticalMap() {
        this.map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.5 }).setView([20, 0], 3);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 12, minZoom: 2 }).addTo(this.map);
        this.map.on('click', (e) => this.handleMapClick(e.latlng));
        setTimeout(() => { this.map.invalidateSize(); }, 1500);
    }

    bindGlobalEvents() {
        window.addEventListener('Sync:MapUpdated', (e) => {
            this.playersData = e.detail;
            this.renderWorld();
            if(NetCode.currentPlayer && NetCode.currentPlayer.lat) this.hasLockedPosition = true;
        });

        // 🗑️ زر الإعدادات (حذف الحساب)
        document.getElementById('btn-settings').addEventListener('click', () => {
            Swal.fire({
                title: 'تدمير القاعدة ⚠️',
                text: 'هل أنت متأكد من مسح حسابك والبدء من الصفر؟ سيتم محوك من الخريطة تماماً.',
                icon: 'warning', showCancelButton: true, confirmButtonColor: '#ff4757', confirmButtonText: 'نعم، امسح حسابي'
            }).then((result) => {
                if (result.isConfirmed) {
                    remove(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`));
                    localStorage.clear();
                    location.reload();
                }
            });
        });

        // 📡 تفعيل الرادار لكشف الأعداء على الخريطة فعلياً
        window.addEventListener('AI:TriggerRadarScan', () => {
            if(!this.hasLockedPosition) return;
            const myPos = L.latLng(NetCode.currentPlayer.lat, NetCode.currentPlayer.lng);
            for(let id in this.markers) {
                if(id !== NetCode.currentPlayer.id && this.playersData[id] && this.playersData[id].lat) {
                    const enemyPos = L.latLng(this.playersData[id].lat, this.playersData[id].lng);
                    if(myPos.distanceTo(enemyPos) < 500000) { // 500 كم
                        const markerEl = this.markers[id].getElement().querySelector('.tactical-marker');
                        if(markerEl) {
                            markerEl.classList.add('enemy-revealed');
                            setTimeout(() => markerEl.classList.remove('enemy-revealed'), 5000); // كشف لمدة 5 ثواني
                        }
                    }
                }
            }
        });

        window.addEventListener('UI:ActionLocate', () => {
            if (this.hasLockedPosition) return Swal.fire('الرادار مقفل 🔒', 'قاعدتك متمركزة بالفعل!', 'error');
            if (NetCode.currentPlayer.health <= 0) return Swal.fire('خطأ', 'أنت ميت!', 'error');
            this.isDeploying = true;
            Swal.fire({ title: 'نشر القاعدة 📍', text: 'اضغط لنشر قاعدتك. لا يمكن التراجع!', icon: 'warning', toast: true, position: 'top', showConfirmButton: false, timer: 3000 });
        });

        window.addEventListener('UI:ActionMine', () => {
            if (!this.hasLockedPosition) return Swal.fire('خطأ', 'تمركز أولاً!', 'warning');
            const newCoins = NetCode.currentPlayer.coins + 20;
            update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { coins: newCoins, score: NetCode.currentPlayer.score + 2 });
            Swal.fire({ title: '+20 ذهب 💰', icon: 'success', toast: true, position: 'bottom', timer: 1000, showConfirmButton: false });
        });

        window.addEventListener('UI:ActionShop', () => this.openTacticalMarket());
        window.addEventListener('Combat:MissileLaunched', (e) => this.routeMissile(e.detail.attackerId, e.detail.targetId, e.detail.weaponType));
    }

    openTacticalMarket() {
        if (!this.hasLockedPosition) return Swal.fire('السوق مغلق', 'تمركز أولاً!', 'error');

        // 🧮 حل مشكلة أسعار المتجر الرياضية
        let armyLv = NetCode.currentPlayer.armyLevel || 1;
        let armyCost = armyLv * 200; // المستوى التاني 400، التالت 600...

        let terrLv = NetCode.currentPlayer.territoryLevel || 1;
        let expandCost = terrLv * 150; // المستوى التاني 300، التالت 450...

        Swal.fire({
            title: 'مركز القيادة والتطوير 🛠️',
            html: `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button id="buy-rocket" class="cyber-button" style="border-color:var(--neon-blue);">🚀 صاروخ باليستي (50 كوين)</button>
                    <button id="buy-uav" class="cyber-button" style="border-color:#00d2d3;">✈️ طائرة استطلاع (150 كوين)</button>
                    <button id="buy-nuke" class="cyber-button" style="border-color:var(--neon-red);">☢️ قنبلة نووية (300 كوين)</button>
                    <hr style="border-color: rgba(255,255,255,0.1);">
                    <div style="text-align:right; font-size:0.8rem; color:var(--neon-gold);">تطويرات الإمبراطورية:</div>
                    <button id="upg-territory" class="cyber-button" style="border-color:var(--neon-green);">🚩 توسيع النفوذ [مستوى ${terrLv}] (${expandCost} كوين)</button>
                    <button id="upg-army" class="cyber-button" style="border-color:var(--neon-gold);">🪖 ترقية الجيش [مستوى ${armyLv}] (${armyCost} كوين)</button>
                </div>
            `,
            background: 'var(--bg-glass)', color: '#fff', showConfirmButton: false, showCloseButton: true,
            didOpen: () => {
                document.getElementById('buy-rocket').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= 50) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { coins: NetCode.currentPlayer.coins - 50, rockets: NetCode.currentPlayer.rockets + 1 });
                        Swal.fire({title: 'تم شراء صاروخ!', toast:true, icon:'success', timer:1000, showConfirmButton:false});
                    } else Swal.fire('رصيد غير كافي', '', 'error');
                });

                // طائرة الاستطلاع الخارقة
                document.getElementById('buy-uav').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= 150) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { coins: NetCode.currentPlayer.coins - 150 });
                        Swal.close();
                        this.deployScoutPlane();
                    } else Swal.fire('رصيد غير كافي', '', 'error');
                });
                
                document.getElementById('upg-territory').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= expandCost) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { 
                            coins: NetCode.currentPlayer.coins - expandCost, 
                            territoryLevel: terrLv + 1,
                            territoryRange: NetCode.currentPlayer.territoryRange + 25000, 
                            score: NetCode.currentPlayer.score + 100
                        });
                        Swal.fire('تم التوسع!', 'مساحة نفوذك أصبحت أكبر والسعر ارتفع للمستوى القادم.', 'success');
                    } else Swal.fire('رصيد غير كافي', '', 'error');
                });

                document.getElementById('upg-army').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= armyCost) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { 
                            coins: NetCode.currentPlayer.coins - armyCost, 
                            armyLevel: armyLv + 1
                        });
                        Swal.fire('ترقية عسكرية!', `وصل جيشك للمستوى ${armyLv + 1}! السعر ارتفع للمستوى القادم.`, 'success');
                    } else Swal.fire('رصيد غير كافي', '', 'error');
                });
            }
        });
    }

    // دالة إطلاق طائرة الاستطلاع
    deployScoutPlane() {
        Swal.fire({ title: 'طائرة الاستطلاع في الأجواء! ✈️', text: 'تم كشف جميع قواعد الأعداء مؤقتاً.', toast: true, position: 'top', timer: 4000, showConfirmButton: false });
        VFX.animateScoutPlane(); // تشغيل الأنيميشن

        // كشف كل الأعداء في الخريطة لمدة 10 ثواني
        for(let id in this.markers) {
            if(id !== NetCode.currentPlayer.id) {
                const markerEl = this.markers[id].getElement().querySelector('.tactical-marker');
                if(markerEl) {
                    markerEl.classList.add('enemy-revealed');
                    setTimeout(() => markerEl.classList.remove('enemy-revealed'), 10000); 
                }
            }
        }
    }

    renderWorld() {
        for (let id in this.markers) {
            if (!this.playersData[id] || this.playersData[id].status === 'offline') {
                this.map.removeLayer(this.markers[id]);
                if (this.territories[id]) this.map.removeLayer(this.territories[id]);
                delete this.markers[id]; delete this.territories[id];
            }
        }

        for (let id in this.playersData) {
            const p = this.playersData[id];
            if (!p.lat || p.status === 'offline' || p.health <= 0) continue;

            const isMe = (NetCode.currentPlayer && NetCode.currentPlayer.id === id);
            const currentRadius = p.territoryRange || 50000; 
            
            if (this.territories[id]) {
                this.territories[id].setLatLng([p.lat, p.lng]);
                this.territories[id].setRadius(currentRadius);
            } else {
                this.territories[id] = L.circle([p.lat, p.lng], {
                    color: p.allianceColor, fillColor: p.allianceColor, fillOpacity: isMe ? 0.3 : 0.1, weight: isMe ? 2 : 1, radius: currentRadius
                }).addTo(this.map);
            }

            let iconGlow = p.health > 50 ? 'var(--neon-green)' : 'var(--neon-red)';
            const pulseClass = isMe ? 'pulse-me' : '';
            const armyBadge = p.armyLevel ? `<div style="position:absolute; top:-15px; background:#000; border:1px solid ${p.allianceColor}; font-size:10px; padding:2px; border-radius:4px;">Lv.${p.armyLevel}</div>` : '';

            const markerHtml = `
                <div class="tactical-marker ${pulseClass}" style="border-color: ${p.allianceColor}; box-shadow: 0 0 15px ${iconGlow}; background: rgba(0,0,0,0.8); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px; position:relative;">
                    ${armyBadge}
                    ${isMe ? '🛡️' : '🎯'}
                </div>
            `;
            const customIcon = L.divIcon({ className: 'clear-icon', html: markerHtml, iconSize: [30, 30], iconAnchor: [15, 15] });

            if (this.markers[id]) {
                this.markers[id].setLatLng([p.lat, p.lng]);
                this.markers[id].setIcon(customIcon);
            } else {
                this.markers[id] = L.marker([p.lat, p.lng], { icon: customIcon }).addTo(this.map);
                this.markers[id].on('click', () => this.handleTargetSelection(p, isMe));
            }
        }
    }

    handleMapClick(latlng) {
        if (this.isDeploying) {
            NetCode.deployBase(latlng.lat, latlng.lng);
            this.isDeploying = false;
            this.hasLockedPosition = true; 
            document.getElementById('map-wrapper').style.cursor = 'default';
            this.map.flyTo(latlng, 6, { animate: true, duration: 1.5 });
            Swal.fire({ title: 'تم تأمين الموقع!', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
        }
    }

    async handleTargetSelection(targetPlayer, isMe) {
        if (this.isDeploying) return;
        if (isMe) return Swal.fire('قاعدتك المركزية', `الجيش: مستوى ${targetPlayer.armyLevel||1} | الموارد: ${targetPlayer.coins}`, 'info');

        const { value: action } = await Swal.fire({
            title: `استهداف: ${targetPlayer.name}`,
            html: `
                <div style="font-size: 0.9rem; margin-bottom: 15px; color: ${targetPlayer.allianceColor};">
                    جيش العدو: مستوى ${targetPlayer.armyLevel || 1} | النفوذ: ${Math.round(targetPlayer.territoryRange/1000)}كم
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="atk-basic" class="cyber-button" style="border-color: var(--neon-blue);">🚀 هجوم صاروخي</button>
                    <button id="atk-nuke" class="cyber-button" style="border-color: var(--neon-red);">☢️ قصف نووي</button>
                </div>
            `,
            background: 'var(--bg-glass)', color: '#fff', showConfirmButton: false, showCloseButton: true,
            didOpen: () => {
                document.getElementById('atk-basic').addEventListener('click', () => { Swal.close(); this.confirmAttack(targetPlayer, 'basicRocket'); });
                document.getElementById('atk-nuke').addEventListener('click', () => { Swal.close(); this.confirmAttack(targetPlayer, 'nuke'); });
            }
        });
    }

    confirmAttack(targetPlayer, weaponKey) {
        if (NetCode.currentPlayer.health <= 0) return Swal.fire('خطأ', 'أنت ميت!', 'error');
        const weapon = MARKET.weapons[weaponKey];
        if (NetCode.currentPlayer.rockets <= 0 && weaponKey === 'basicRocket') return Swal.fire('خطأ', 'لا يوجد ذخيرة!', 'error');
        if (NetCode.currentPlayer.coins < weapon.cost && weaponKey === 'nuke') return Swal.fire('خطأ', 'مواردك لا تكفي للنووي!', 'error');
        
        NetCode.launchStrike(targetPlayer.id, weaponKey);
    }

    routeMissile(attackerId, targetId, weaponType) {
        const attacker = this.playersData[attackerId];
        const target = this.playersData[targetId];
        if (attacker && target && attacker.lat && target.lat) {
            VFX.animateFlight(L.latLng(attacker.lat, attacker.lng), L.latLng(target.lat, target.lng), weaponType);
        }
    }
}

const GameManager = new GameController();
document.addEventListener('DOMContentLoaded', () => GameManager.boot());
