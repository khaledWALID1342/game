
// ==========================================================================
// 🖥️ THE USER INTERFACE & AI COMMANDER ENGINE (V7.0)
// ==========================================================================

import { AI_CONFIG } from './config.js';

class UIManager {
    constructor() {
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

    init() {
        console.log("🖥️ [UI] واجهة المستخدم والمساعد الذكي قيد التشغيل...");
        this.setupEventListeners();
        this.setupAICommander();
        this.setupTabs(); // تشغيل التبديل بين القوائم
    }

    // تشغيل نظام التبديل (Tabs) بين التصنيف والتحالف
    setupTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // إزالة الكلاس النشط من كل الزراير والمحتوى
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => {
                    c.classList.remove('active');
                    c.style.display = 'none'; // إخفاء الباقي
                });

                // تفعيل الزرار والمحتوى المطلوب
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-target');
                const targetContent = document.getElementById(targetId);
                targetContent.classList.add('active');
                targetContent.style.display = 'block';
                
                // صوت كليك خفيف
                this.playSound('click');
            });
        });
        
        // إخفاء تبويبة التحالف في البداية
        document.getElementById('tab-alliance').style.display = 'none';
    }

    setupEventListeners() {
        window.addEventListener('Sync:MyPlayerUpdated', (e) => this.updateHUD(e.detail));
        window.addEventListener('Sync:MapUpdated', (e) => this.updateLeaderboard(e.detail));
        window.addEventListener('Sync:KillFeedUpdated', (e) => this.renderKillFeed(e.detail));
        
        // توصيل زراير الأكشن السفلية بـ game.js
        document.getElementById('btn-action-locate').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionLocate')));
        document.getElementById('btn-action-collect').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionMine')));
        document.getElementById('btn-action-shop').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionShop')));
        document.getElementById('btn-action-quests').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionQuests')));
    }

    updateHUD(playerData) {
        this.lastPlayerState = playerData;

        this.dom.hud.health.innerText = playerData.health;
        this.dom.hud.energy.innerText = playerData.energy || 100;
        this.dom.hud.coins.innerText = playerData.coins;
        this.dom.hud.rockets.innerText = playerData.rockets;

        this.dom.hud.healthBar.style.width = `${playerData.health}%`;
        this.dom.hud.energyBar.style.width = `${playerData.energy || 100}%`;

        if (playerData.health <= 30) {
            this.dom.hud.healthBar.style.backgroundColor = '#ff4757';
            this.dom.hud.healthBar.style.boxShadow = '0 0 10px #ff4757';
        } else {
            this.dom.hud.healthBar.style.backgroundColor = '#10ac84';
            this.dom.hud.healthBar.style.boxShadow = 'inset 0 0 5px #10ac84';
        }
    }

    setupAICommander() {
        if (!AI_CONFIG.enabled) return;

        this.dom.ai.btnScan.addEventListener('click', () => {
            this.aiSpeak("جاري فحص محيط قاعدتك التكتيكي...");
            window.dispatchEvent(new CustomEvent('AI:TriggerRadarScan'));
        });

        this.dom.ai.btnSuggest.addEventListener('click', () => {
            if (!this.lastPlayerState) return;
            let tactic = "قم بتوسيع نفوذك للسيطرة على الخريطة.";
            if (this.lastPlayerState.coins < 100) tactic = "الموارد حرجة. ركز على التعدين لتطوير جيشك.";
            this.aiSpeak(tactic);
        });
    }

    aiSpeak(message) {
        if (this.isAiTyping) return; 
        this.isAiTyping = true;
        this.playSound('aiVoice');

        const msgDiv = document.createElement('div');
        msgDiv.className = 'ai-msg system';
        this.dom.ai.chat.appendChild(msgDiv);
        
        let i = 0;
        const typeWriter = setInterval(() => {
            if (i < message.length) {
                msgDiv.innerHTML += message.charAt(i);
                i++;
                this.dom.ai.chat.scrollTop = this.dom.ai.chat.scrollHeight;
            } else {
                clearInterval(typeWriter);
                this.isAiTyping = false;
            }
        }, 30);
    }

    updateLeaderboard(allPlayers) {
        this.dom.leaderboard.innerHTML = '';
        const sortedPlayers = Object.values(allPlayers)
            .sort((a, b) => b.score - a.score)
            .slice(0, 15); 

        sortedPlayers.forEach((p, index) => {
            let statusIcon = p.health <= 0 ? '☠️' : (p.status === 'online' ? '🟢' : '⚪');
            let colorDot = `<span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${p.allianceColor}; margin-left:5px;"></span>`;
            
            this.dom.leaderboard.innerHTML += `
                <div class="leaderboard-item">
                    <div class="l-info" style="display:flex; align-items:center;">
                        <strong>#${index + 1} ${p.name}</strong> ${colorDot}
                    </div>
                    <div class="l-stats">
                        <span class="l-score">⭐ ${p.score}</span>
                        <span class="l-status">${statusIcon}</span>
                    </div>
                </div>
            `;
        });
    }

    renderKillFeed(feedData) {
        this.dom.killFeed.innerHTML = ''; 
        const recentMsgs = Object.values(feedData)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 4);

        recentMsgs.forEach(msg => {
            if (Date.now() - msg.timestamp > 10000) return;
            const el = document.createElement('div');
            el.className = `combat-msg msg-${msg.type}`;
            el.innerHTML = msg.text;
            this.dom.killFeed.appendChild(el);
            this.playSound('notification');
        });
    }

    playSound(type) {
        // Fallback in case audio element doesn't exist
        const audio = this.dom.audio[type] || document.getElementById(`sfx-ui-${type}`);
        if(audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
    }
}

export const UI = new UIManager();
