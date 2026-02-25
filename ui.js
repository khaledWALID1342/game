// ==========================================================================
// 🖥️ THE USER INTERFACE & DYNAMIC AI ENGINE (V8.0 - SUPER SMART)
// ==========================================================================

import { AI_CONFIG } from './config.js';

class UIManager {
    constructor() {
        this.dom = {
            hud: {
                health: document.getElementById('val-health'), healthBar: document.getElementById('bar-health'),
                coins: document.getElementById('val-coins'), rockets: document.getElementById('val-rockets')
            },
            ai: {
                panel: document.getElementById('ai-commander-panel'),
                chat: document.getElementById('ai-chat-history'),
                btnScan: document.getElementById('btn-ai-scan'),
                btnSuggest: document.getElementById('btn-ai-suggest')
            },
            leaderboard: {
                panel: document.getElementById('right-dashboard'),
                list: document.getElementById('leaderboard-list')
            }
        };
        this.isAiTyping = false;
        this.lastPlayerState = null;
        this.allPlayersData = null; // عشان الـ AI يدرس الخريطة
    }

    init() {
        console.log("🖥️ [UI] واجهة المستخدم والمساعد الذكي (النسخة الخارقة) قيد التشغيل...");
        this.setupEventListeners();
        this.setupTabsAndToggles(); 
        this.setupAICommander();
    }

    // ==========================================
    // 🎛️ نظام إخفاء وإظهار القوائم (عشان نفضي الشاشة)
    // ==========================================
    setupTabsAndToggles() {
        // 1. تصغير وتكبير الـ AI Commander
        const minimizeAiBtn = this.dom.ai.panel.querySelector('.minimize-btn');
        if(minimizeAiBtn) {
            minimizeAiBtn.addEventListener('click', () => {
                const content = this.dom.ai.panel.querySelectorAll('.ai-chat-box, .ai-actions');
                content.forEach(el => el.style.display = el.style.display === 'none' ? 'block' : 'none');
                this.playSound('click');
            });
        }

        // 2. التبديل الفعال بين (التصنيف) و (التحالف)
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // إزالة التفعيل من الكل
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => { c.classList.remove('active'); c.style.display = 'none'; });
                
                // تفعيل المطلوب
                e.currentTarget.classList.add('active');
                const targetId = e.currentTarget.getAttribute('data-target');
                const targetEl = document.getElementById(targetId);
                if(targetEl) { targetEl.classList.add('active'); targetEl.style.display = 'block'; }
                this.playSound('click');
            });
        });

        // إخفاء التحالف كبداية عشان التصنيف يظهر
        const allianceTab = document.getElementById('tab-alliance');
        if(allianceTab) allianceTab.style.display = 'none';
    }

    setupEventListeners() {
        window.addEventListener('Sync:MyPlayerUpdated', (e) => { this.updateHUD(e.detail); });
        window.addEventListener('Sync:MapUpdated', (e) => { this.allPlayersData = e.detail; this.updateLeaderboard(e.detail); });
        
        // توصيل زراير الأكشن اللي تحت بـ game.js
        document.getElementById('btn-action-locate').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionLocate')));
        document.getElementById('btn-action-collect').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionMine')));
        document.getElementById('btn-action-shop').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionShop')));
        document.getElementById('btn-action-quests').addEventListener('click', () => window.dispatchEvent(new CustomEvent('UI:ActionQuests')));
    }

    updateHUD(playerData) {
        this.lastPlayerState = playerData;
        this.dom.hud.health.innerText = playerData.health;
        this.dom.hud.coins.innerText = playerData.coins;
        this.dom.hud.rockets.innerText = playerData.rockets;
        this.dom.hud.healthBar.style.width = `${playerData.health}%`;

        if (playerData.health <= 30) {
            this.dom.hud.healthBar.style.backgroundColor = '#ff4757';
            this.dom.hud.healthBar.style.boxShadow = '0 0 10px #ff4757';
        } else {
            this.dom.hud.healthBar.style.backgroundColor = '#10ac84';
        }
    }

    // ==========================================
    // 🤖 عقل الذكاء الاصطناعي (ردود ديناميكية متغيرة)
    // ==========================================
    setupAICommander() {
        // 1. زرار اقتراح تكتيك (بيحلل حالتك)
        this.dom.ai.btnSuggest.addEventListener('click', () => {
            if (!this.lastPlayerState) return;
            const p = this.lastPlayerState;
            let tactics = [];

            if (p.health < 50) tactics.push("⚠️ سيدي! قاعدتنا تنهار، استخدم مواردك للإصلاح فوراً!");
            if (p.coins < 100) tactics.push("💰 الموارد منخفضة. أرسل وحدات التعدين لجمع الذهب لتطوير جيشك.");
            if (p.rockets === 0 && p.coins > 100) tactics.push("🚀 لا نملك ذخيرة! افتح السوق واشتري صواريخ للدفاع عن أراضينا.");
            if (p.coins > 300) tactics.push("👑 الخزينة ممتلئة يا إمبراطور. حان وقت شراء قنبلة نووية وإظهار قوتنا!");
            
            // اختيار رد عشوائي من الردود المناسبة لحالتك
            let finalTactic = tactics.length > 0 ? tactics[Math.floor(Math.random() * tactics.length)] : "🛡️ الأوضاع مستقرة. أقترح توسيع نفوذك لاحتلال مناطق جديدة.";
            this.aiSpeak(finalTactic);
        });

        // 2. زرار فحص الأعداء (بيفحص نطاقك إنت بس)
        this.dom.ai.btnScan.addEventListener('click', () => {
            if (!this.lastPlayerState || !this.lastPlayerState.lat || !this.allPlayersData) {
                return this.aiSpeak("❌ لم تتمركز بعد! حدد موقع قاعدتك أولاً لأتمكن من تشغيل الرادار.");
            }
            
            let enemiesNearby = 0;
            const myPos = L.latLng(this.lastPlayerState.lat, this.lastPlayerState.lng);

            for (let id in this.allPlayersData) {
                if (id !== this.lastPlayerState.id && this.allPlayersData[id].lat) {
                    const enemyPos = L.latLng(this.allPlayersData[id].lat, this.allPlayersData[id].lng);
                    const distance = myPos.distanceTo(enemyPos); // المسافة بالمتر
                    if (distance < 500000) enemiesNearby++; // نطاق 500 كم
                }
            }

            window.dispatchEvent(new CustomEvent('AI:TriggerRadarScan')); // تشغيل الأنيميشن الأخضر
            
            if (enemiesNearby > 0) {
                this.aiSpeak(`🚨 تحذير! رصدت الأقمار الصناعية ${enemiesNearby} أعداء بالقرب من حدودنا.`);
            } else {
                this.aiSpeak("✅ المنطقة آمنة. لا يوجد أعداء في نطاق 500 كم.");
            }
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
        this.dom.leaderboard.list.innerHTML = '';
        const sortedPlayers = Object.values(allPlayers).sort((a, b) => b.score - a.score).slice(0, 15); 
        sortedPlayers.forEach((p, index) => {
            let status = p.health <= 0 ? '☠️' : '🟢';
            this.dom.leaderboard.list.innerHTML += `
                <div class="leaderboard-item">
                    <div class="l-info"><strong>#${index + 1} ${p.name}</strong> <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.allianceColor};"></span></div>
                    <div class="l-stats"><span class="l-score">⭐ ${p.score}</span> ${status}</div>
                </div>
            `;
        });
    }

    playSound(type) {
        const audio = document.getElementById(`sfx-ui-${type}`) || document.getElementById(`sfx-${type}`);
        if(audio) { audio.currentTime = 0; audio.play().catch(()=>{}); }
    }
}

export const UI = new UIManager();
