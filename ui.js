// ==========================================================================
// 🖥️ THE USER INTERFACE & AI COMMANDER ENGINE (V6.0)
// ==========================================================================
// هذا الملف هو "المترجم" الذي يربط بين بيانات السيرفر (Network) والشاشة (HTML).
// مبني بتقنية الـ Event-Driven Architecture لضمان صفر تأخير (Zero Latency).

import { AI_CONFIG } from './config.js';

class UIManager {
    constructor() {
        // 1. DOM Caching (تخزين العناصر لضمان أقصى سرعة أداء)
        this.dom = {
            hud: {
                health: document.getElementById('val-health'),
                healthBar: document.getElementById('bar-health'),
                energy: document.getElementById('val-energy'),
                energyBar: document.getElementById('bar-energy'),
                coins: document.getElementById('val-coins'),
                rockets: document.getElementById('val-rockets')
            },
            ai: {
                panel: document.getElementById('ai-commander-panel'),
                chat: document.getElementById('ai-chat-history'),
                btnScan: document.getElementById('btn-ai-scan'),
                btnSuggest: document.getElementById('btn-ai-suggest')
            },
            leaderboard: document.getElementById('leaderboard-list'),
            killFeed: document.getElementById('combat-log'),
            audio: {
                aiVoice: document.getElementById('sfx-ai-voice'),
                notification: document.getElementById('sfx-notification')
            }
        };
        
        this.isAiTyping = false;
        this.lastPlayerState = null;
    }

    // ==========================================
    // 2. التهيئة واستقبال الإشارات (Initialization)
    // ==========================================
    init() {
        console.log("🖥️ [UI] واجهة المستخدم والمساعد الذكي قيد التشغيل...");
        this.setupEventListeners();
        this.setupAICommander();
    }

    setupEventListeners() {
        // الاستماع لإشارات السيرفر القادمة من network.js
        window.addEventListener('Sync:MyPlayerUpdated', (e) => this.updateHUD(e.detail));
        window.addEventListener('Sync:MapUpdated', (e) => this.updateLeaderboard(e.detail));
        window.addEventListener('Sync:KillFeedUpdated', (e) => this.renderKillFeed(e.detail));
        
        // أزرار التحكم السفلية (Action Bar)
        document.getElementById('btn-action-locate').addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('UI:ActionLocate'));
        });
    }

    // ==========================================
    // 3. تحديث العدادات الحية (HUD Updates) 📊
    // ==========================================
    updateHUD(playerData) {
        this.lastPlayerState = playerData;

        // تحديث الأرقام
        this.dom.hud.health.innerText = playerData.health;
        this.dom.hud.energy.innerText = playerData.energy;
        this.dom.hud.coins.innerText = playerData.coins;
        this.dom.hud.rockets.innerText = playerData.rockets;

        // تحديث أشرطة التقدم (Progress Bars) بـ أنيميشن ناعم
        this.dom.hud.healthBar.style.width = `${playerData.health}%`;
        this.dom.hud.energyBar.style.width = `${playerData.energy}%`;

        // تغيير لون شريط الصحة إذا كانت الحالة حرجة (أقل من 30%)
        if (playerData.health <= 30) {
            this.dom.hud.healthBar.style.backgroundColor = '#ff4757';
            this.dom.hud.healthBar.style.boxShadow = '0 0 10px #ff4757';
        } else {
            this.dom.hud.healthBar.style.backgroundColor = '#2ed573';
            this.dom.hud.healthBar.style.boxShadow = '0 0 10px #2ed573';
        }
    }

    // ==========================================
    // 4. نظام المساعد الذكي (AI COMMANDER) 🤖
    // ==========================================
    setupAICommander() {
        if (!AI_CONFIG.enabled) return;

        this.dom.ai.btnScan.addEventListener('click', () => {
            this.aiSpeak("جاري توجيه الأقمار الصناعية لعمل مسح حراري للمنطقة...");
            // نبعث إشارة لـ effects.js عشان يشغل أنيميشن الرادار
            window.dispatchEvent(new CustomEvent('AI:TriggerRadarScan'));
        });

        this.dom.ai.btnSuggest.addEventListener('click', () => {
            if (!this.lastPlayerState) return;
            let tactic = "قم ببناء دروع طاقة فوراً، دفاعاتك مكشوفة!";
            if (this.lastPlayerState.coins < 50) tactic = "تحذير: الموارد منخفضة. ركز على التعدين وتجنب الاشتباك.";
            else if (this.lastPlayerState.rockets > 5) tactic = "ترسانتك ممتلئة. اقترح توجيه ضربة استباقية لأقرب هدف.";
            
            this.aiSpeak(tactic);
        });
    }

    aiSpeak(message) {
        if (this.isAiTyping) return; // منع تداخل الرسائل
        this.isAiTyping = true;
        
        // تشغيل صوت الـ AI
        if(this.dom.audio.aiVoice) {
            this.dom.audio.aiVoice.currentTime = 0;
            this.dom.audio.aiVoice.play().catch(()=>{});
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = 'ai-msg system';
        this.dom.ai.chat.appendChild(msgDiv);
        
        let i = 0;
        const typingSpeed = 30; // سرعة الكتابة

        const typeWriter = setInterval(() => {
            if (i < message.length) {
                msgDiv.innerHTML += message.charAt(i);
                i++;
                this.dom.ai.chat.scrollTop = this.dom.ai.chat.scrollHeight;
            } else {
                clearInterval(typeWriter);
                this.isAiTyping = false;
            }
        }, typingSpeed);
    }

    // ==========================================
    // 5. تحديث تصنيف القادة (Leaderboard Logic) 🏆
    // ==========================================
    updateLeaderboard(allPlayers) {
        this.dom.leaderboard.innerHTML = '';
        
        // تحويل كائن اللاعبين إلى مصفوفة وترتيبهم حسب السكور
        const sortedPlayers = Object.values(allPlayers)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15); // عرض أفضل 15 قائد فقط

        sortedPlayers.forEach((p, index) => {
            let statusIcon = p.health <= 0 ? '☠️' : (p.status === 'online' ? '🟢' : '⚪');
            let rankClass = index === 0 ? 'rank-gold' : index === 1 ? 'rank-silver' : index === 2 ? 'rank-bronze' : '';
            
            this.dom.leaderboard.innerHTML += `
                <div class="leaderboard-item ${rankClass}">
                    <div class="l-info">
                        <strong>#${index + 1} ${p.name}</strong> 
                        <span class="l-alliance">[${p.alliance}]</span>
                    </div>
                    <div class="l-stats">
                        <span class="l-score">⭐ ${p.score}</span>
                        <span class="l-status">${statusIcon}</span>
                    </div>
                </div>
            `;
        });
    }

    // ==========================================
    // 6. نظام الإشعارات القتالي (Kill Feed) ⚡
    // ==========================================
    renderKillFeed(feedData) {
        this.dom.killFeed.innerHTML = ''; 
        
        // جلب آخر 4 رسائل فقط بناءً على الوقت
        const recentMsgs = Object.values(feedData)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 4);

        recentMsgs.forEach(msg => {
            // تجاهل الرسائل القديمة (أقدم من 10 ثواني)
            if (Date.now() - msg.timestamp > 10000) return;

            const el = document.createElement('div');
            // إعطاء كلاس مختلف حسب نوع الرسالة (hit, fatal, info)
            el.className = `combat-msg msg-${msg.type}`;
            el.innerHTML = msg.text;
            this.dom.killFeed.appendChild(el);
            
            // تشغيل صوت تنبيه
            if(this.dom.audio.notification) {
                this.dom.audio.notification.currentTime = 0;
                this.dom.audio.notification.play().catch(()=>{});
            }
        });
    }
}

// تصدير نسخة واحدة فقط (Singleton)
export const UI = new UIManager();
