// ==========================================================================
// 🕹️ THE MASTER GAME CONTROLLER (V7.0 - TERRITORY & ARMY ENGINE)
// ==========================================================================

import { initAuth } from './auth.js';
import { NetCode } from './network.js';
import { UI } from './ui.js';
import { VFX } from './effects.js';
import { MARKET } from './config.js';
import { ref, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './config.js'; // نحتاج الداتابيز للتحديث المباشر

class GameController {
    constructor() {
        this.map = null;
        this.markers = {};        
        this.territories = {};    
        this.playersData = {};    
        this.isDeploying = false; 
    }

    boot() {
        initAuth();
        window.addEventListener('CommanderAuthorized', (e) => {
            this.startGame(e.detail.player);
        });
    }

    startGame(myPlayer) {
        this.initTacticalMap();
        UI.init();
        VFX.init(this.map);
        NetCode.init(myPlayer); 
        this.bindGlobalEvents();
    }

    initTacticalMap() {
        this.map = L.map('map', { 
            zoomControl: false, 
            attributionControl: false,
            zoomSnap: 0.5
        }).setView([20, 0], 3);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 12, minZoom: 2
        }).addTo(this.map);

        this.map.on('click', (e) => this.handleMapClick(e.latlng));
        setTimeout(() => { this.map.invalidateSize(); }, 1000);
    }

    bindGlobalEvents() {
        window.addEventListener('Sync:MapUpdated', (e) => {
            this.playersData = e.detail;
            this.renderWorld();
        });

        // 🛑 إصلاح التمركز: يمنع تغيير المكان لو اللاعب موجود بالفعل
        window.addEventListener('UI:ActionLocate', () => {
            if (NetCode.currentPlayer.lat) {
                return Swal.fire('تم التمركز مسبقاً', 'قاعدتك موجودة بالفعل على الخريطة! لا يمكنك تغيير موقعك الأساسي.', 'warning');
            }
            this.isDeploying = true;
            document.getElementById('map-wrapper').style.cursor = 'crosshair';
            window.dispatchEvent(new CustomEvent('AI:TriggerRadarScan'));
            Swal.fire({ title: 'تحديد الموقع 📍', text: 'اضغط على الخريطة لنشر قاعدتك والبدء في احتلال المنطقة.', icon: 'info', toast: true, position: 'top', showConfirmButton: false, timer: 3000 });
        });

        // ⛏️ التعدين (Mining)
        window.addEventListener('UI:ActionMine', () => {
            if (!NetCode.currentPlayer.lat) return Swal.fire('خطأ', 'تمركز أولاً!', 'error');
            const newCoins = NetCode.currentPlayer.coins + 15;
            update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { coins: newCoins });
            Swal.fire({ title: '+15 موارد', icon: 'success', toast: true, position: 'bottom', timer: 1000, showConfirmButton: false });
        });

        // 🛒 السوق (نظام الجيش والاحتلال الجديد)
        window.addEventListener('UI:ActionShop', () => this.openTacticalMarket());

        window.addEventListener('Combat:MissileLaunched', (e) => {
            this.routeMissile(e.detail.attackerId, e.detail.targetId, e.detail.weaponType);
        });
    }

    openTacticalMarket() {
        if (!NetCode.currentPlayer.lat) return Swal.fire('خطأ', 'تمركز في الخريطة أولاً لفتح السوق!', 'error');

        // جلب مستوى الجيش الحالي (الافتراضي 1)
        let armyLevel = NetCode.currentPlayer.armyLevel || 1;
        let expandCost = 100 + (NetCode.currentPlayer.score * 2); // تكلفة التوسع بتزيد مع الوقت

        Swal.fire({
            title: 'مركز القيادة والتطوير 🛠️',
            html: `
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button id="buy-rocket" class="cyber-button" style="border-color:var(--neon-blue);">🚀 شراء صواريخ (50 كوين)</button>
                    <hr style="border-color: rgba(255,255,255,0.1);">
                    <div style="text-align:right; font-size:0.8rem; color:var(--neon-gold);">تطويرات الإمبراطورية:</div>
                    <button id="upg-territory" class="cyber-button" style="border-color:var(--neon-green);">🚩 توسيع النفوذ واللون (${expandCost} كوين)</button>
                    <button id="upg-army" class="cyber-button" style="border-color:var(--neon-red);">🪖 ترقية الجيش [مستوى ${armyLevel}] (200 كوين)</button>
                </div>
            `,
            background: 'var(--bg-glass)', color: '#fff', showConfirmButton: false, showCloseButton: true,
            didOpen: () => {
                document.getElementById('buy-rocket').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= 50) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { 
                            coins: NetCode.currentPlayer.coins - 50, rockets: NetCode.currentPlayer.rockets + 3 
                        });
                        Swal.fire({title: 'تم التذخير!', toast:true, icon:'success', timer:1000, showConfirmButton:false});
                    }
                });

                // نظام التوسع (Territory Expansion)
                document.getElementById('upg-territory').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= expandCost) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { 
                            coins: NetCode.currentPlayer.coins - expandCost,
                            territoryRange: NetCode.currentPlayer.territoryRange + 20000, // مساحة اللون تزيد 20كم
                            score: NetCode.currentPlayer.score + 50
                        });
                        Swal.close();
                        Swal.fire('تم احتلال مناطق جديدة!', 'دائرة نفوذك زادت على الخريطة.', 'success');
                    } else { Swal.fire('موارد غير كافية', '', 'error'); }
                });

                // نظام تطوير الجيش
                document.getElementById('upg-army').addEventListener('click', () => {
                    if (NetCode.currentPlayer.coins >= 200) {
                        update(ref(db, `servers/${NetCode.serverName}/players/${NetCode.currentPlayer.id}`), { 
                            coins: NetCode.currentPlayer.coins - 200,
                            armyLevel: armyLevel + 1
                        });
                        Swal.close();
                        Swal.fire('ترقية عسكرية!', `وصل جيشك للمستوى ${armyLevel + 1}! قوة الهجوم زادت.`, 'success');
                    } else { Swal.fire('موارد غير كافية', '', 'error'); }
                });
            }
        });
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

            // 🚩 نظام الاحتلال واللون المميز (كل لاعب له لونه الخاص)
            const currentRadius = p.territoryRange || 50000; 
            if (this.territories[id]) {
                this.territories[id].setLatLng([p.lat, p.lng]);
                this.territories[id].setRadius(currentRadius);
            } else {
                this.territories[id] = L.circle([p.lat, p.lng], {
                    color: p.allianceColor,
                    fillColor: p.allianceColor,
                    fillOpacity: isMe ? 0.3 : 0.1, // لونك بيكون أتقل وواضح
                    weight: isMe ? 2 : 1,
                    radius: currentRadius
                }).addTo(this.map);
            }

            let iconGlow = p.health > 50 ? 'var(--neon-green)' : 'var(--neon-red)';
            const pulseClass = isMe ? 'pulse-me' : '';

            // عرض مستوى الجيش فوق العدو
            const armyBadge = p.armyLevel ? `<div style="position:absolute; top:-15px; background:#000; border:1px solid ${p.allianceColor}; font-size:10px; padding:2px; border-radius:4px;">Lv.${p.armyLevel}</div>` : '';

            const markerHtml = `
                <div class="tactical-marker ${isMe ? 'is-me' : ''} ${pulseClass}" 
                     style="border-color: ${p.allianceColor}; box-shadow: 0 0 15px ${iconGlow}; background: rgba(0,0,0,0.8); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px; position:relative;">
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
                this.markers[id].on('click', () => this.handleTargetSelection(p, isMe, false));
            }
        }
    }

    handleMapClick(latlng) {
        if (this.isDeploying) {
            NetCode.deployBase(latlng.lat, latlng.lng);
            this.isDeploying = false;
            document.getElementById('map-wrapper').style.cursor = 'default';
            this.map.flyTo(latlng, 6, { animate: true, duration: 1.5 });
            Swal.fire({ title: 'تمركز ناجح!', icon: 'success', toast: true, position: 'top', timer: 1500, showConfirmButton: false });
        }
    }

    async handleTargetSelection(targetPlayer, isMe, isAlly) {
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
                </div>
            `,
            background: 'var(--bg-glass)', color: '#fff', showConfirmButton: false, showCloseButton: true,
            didOpen: () => {
                document.getElementById('atk-basic').addEventListener('click', () => { Swal.close(); this.confirmAttack(targetPlayer, 'basicRocket'); });
            }
        });
    }

    confirmAttack(targetPlayer, weaponKey) {
        if (NetCode.currentPlayer.health <= 0) return Swal.fire('خطأ', 'أنت ميت!', 'error');
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
