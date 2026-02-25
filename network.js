// ==========================================================================
// 📡 THE NETCODE & SERVER SYNCHRONIZATION ENGINE (V6.0 - TACTICAL)
// ==========================================================================
// هذا الملف هو "الجهاز العصبي" للعبة. مسئول عن الاتصال اللحظي بـ Firebase،
// معالجة الهجمات، ونظام الـ Presence (اكتشاف انقطاع الاتصال).

import { db, GAME_RULES, MARKET } from './config.js';
import { ref, onValue, update, push, onDisconnect, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

class NetworkManager {
    constructor() {
        this.currentPlayer = null;
        this.serverName = null;
        this.playersRef = null;
        this.killFeedRef = null;
        this.isOnline = false;
    }

    // ==========================================
    // 1. بدء الاتصال والمزامنة (Initialize Uplink)
    // ==========================================
    init(playerData) {
        this.currentPlayer = playerData;
        this.serverName = localStorage.getItem('w_rockets_server') || 'mena_1';
        
        console.log(`📡 [NETWORK] جاري الاتصال بعقدة السيرفر: ${this.serverName}...`);

        this.playersRef = ref(db, `servers/${this.serverName}/players`);
        this.killFeedRef = ref(db, `servers/${this.serverName}/killfeed`);

        this.setupPresenceSystem();
        this.startDataSync();
    }

    // ==========================================
    // 2. نظام التواجد (Presence & Disconnect Handling) 👻
    // ==========================================
    setupPresenceSystem() {
        // مراقبة اتصال اللاعب بسيرفرات جوجل
        const connectedRef = ref(db, ".info/connected");
        const myPlayerRef = ref(db, `servers/${this.serverName}/players/${this.currentPlayer.id}`);

        onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                this.isOnline = true;
                // أول ما يدخل، نخليه Online
                update(myPlayerRef, { status: 'online', lastSeen: serverTimestamp() });
                
                // بروتوكول الـ onDisconnect: لو النت قطع، الفايربيس من نفسه هيعدل حالته لـ Offline
                onDisconnect(myPlayerRef).update({ 
                    status: 'offline', 
                    lastSeen: serverTimestamp() 
                });
            } else {
                this.isOnline = false;
            }
        });
    }

    // ==========================================
    // 3. مزامنة الخريطة واللاعبين (Global State Sync) 🌍
    // ==========================================
    startDataSync() {
        // استماع لحظي لكل حركة على الخريطة
        onValue(this.playersRef, (snapshot) => {
            if (snapshot.exists()) {
                const allPlayers = snapshot.val();
                
                // تحديث بيانات اللاعب الحالي لو اتضرب أو فلوسه زادت
                if (allPlayers[this.currentPlayer.id]) {
                    this.currentPlayer = allPlayers[this.currentPlayer.id];
                    // بث إشارة لتحديث الـ HUD
                    window.dispatchEvent(new CustomEvent('Sync:MyPlayerUpdated', { detail: this.currentPlayer }));
                }

                // بث إشارة لتحديث الخريطة والماركرز
                window.dispatchEvent(new CustomEvent('Sync:MapUpdated', { detail: allPlayers }));
            }
        });

        // استماع للرادار (Kill Feed & Notifications)
        onValue(this.killFeedRef, (snapshot) => {
            if (snapshot.exists()) {
                const feedData = snapshot.val();
                window.dispatchEvent(new CustomEvent('Sync:KillFeedUpdated', { detail: feedData }));
            }
        });
    }

    // ==========================================
    // 4. العمليات التكتيكية (Tactical Actions: Attack & Move) 🚀
    // ==========================================
    
    // دالة تمركز القاعدة (تحديد الموقع)
    deployBase(lat, lng) {
        if (!this.currentPlayer) return;
        
        const updates = {
            lat: lat,
            lng: lng,
            status: 'online',
            deployedAt: serverTimestamp()
        };
        
        update(ref(db, `servers/${this.serverName}/players/${this.currentPlayer.id}`), updates)
            .then(() => console.log("📍 [NETWORK] تم تأكيد التمركز العسكري."))
            .catch(err => console.error("فشل التمركز:", err));
    }

    // دالة الهجوم المعقدة (Atomic Attack Execution)
    async launchStrike(targetId, weaponId = 'basic_rocket') {
        const weapon = MARKET.weapons[weaponId];
        
        if (this.currentPlayer.rockets <= 0) {
            window.dispatchEvent(new CustomEvent('Network:Error', { detail: "ذخيرة غير كافية!" }));
            return false;
        }

        // 1. خصم الصاروخ من المهاجم فوراً (Optimistic UI Update)
        const myRef = ref(db, `servers/${this.serverName}/players/${this.currentPlayer.id}`);
        update(myRef, { rockets: this.currentPlayer.rockets - 1 });

        // 2. إرسال إشارة لبدء أنيميشن الصاروخ في ملف effects.js
        window.dispatchEvent(new CustomEvent('Combat:MissileLaunched', { 
            detail: { attackerId: this.currentPlayer.id, targetId: targetId, weaponType: weaponId } 
        }));

        // 3. جلب بيانات الهدف وتطبيق الضرر (Damage Calculation)
        const targetRef = ref(db, `servers/${this.serverName}/players/${targetId}`);
        const snapshot = await get(targetRef);
        
        if (snapshot.exists()) {
            let targetData = snapshot.val();
            if (targetData.health <= 0) return false; // الهدف ميت بالفعل

            let updates = {};
            let logMessage = "";

            // حسابات الدروع والضرر
            if (targetData.shields > 0) {
                updates.shields = targetData.shields - 1;
                logMessage = `🛡️ [${targetData.name}] صد هجوماً من [${this.currentPlayer.name}]!`;
            } else {
                const newHealth = Math.max(0, targetData.health - weapon.damage);
                updates.health = newHealth;

                if (newHealth === 0) {
                    updates.status = 'destroyed';
                    logMessage = `☠️ [${this.currentPlayer.name}] قام بمحو قاعدة [${targetData.name}] بالكامل!`;
                    // زيادة سكور المهاجم
                    update(myRef, { score: this.currentPlayer.score + 100 });
                } else {
                    logMessage = `💥 [${this.currentPlayer.name}] قصف [${targetData.name}] بـ ${weapon.name}!`;
                    update(myRef, { score: this.currentPlayer.score + 25 });
                }
            }

            // تنفيذ التحديث على سيرفر الهدف
            update(targetRef, updates);

            // إرسال الإشعار للرادار العالمي
            this.broadcastKillFeed(logMessage, (updates.health === 0 ? 'fatal' : 'hit'));
            return true;
        }
    }

    // ==========================================
    // 5. الإشعارات العالمية (Global Broadcasts) 📢
    // ==========================================
    broadcastKillFeed(message, type = 'info') {
        const newFeedRef = push(this.killFeedRef);
        set(newFeedRef, {
            text: message,
            type: type, // info, hit, fatal, alliance
            timestamp: serverTimestamp()
        });
    }

    // تطوير النفوذ (Territory Expansion)
    expandTerritory() {
        const upgradeCost = MARKET.upgrades.expandTerritory.cost;
        const boostAmount = MARKET.upgrades.expandTerritory.boost;

        if (this.currentPlayer.coins >= upgradeCost) {
            update(ref(db, `servers/${this.serverName}/players/${this.currentPlayer.id}`), {
                coins: this.currentPlayer.coins - upgradeCost,
                territoryRange: this.currentPlayer.territoryRange + boostAmount
            });
            return true;
        }
        return false;
    }
}

// تصدير نسخة واحدة من المدير (Singleton Pattern)
export const NetCode = new NetworkManager();
