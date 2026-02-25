// ==========================================================================
// 💥 THE VISUAL EFFECTS & ANIMATION ENGINE (V6.0 - VFX)
// ==========================================================================
// هذا الملف مسئول عن كل حركة على الشاشة: طيران الصواريخ، الانفجارات،
// رجة الكاميرا، ومسح الرادار الذكي. (يعمل بمعدل 60 إطار في الثانية).

class EffectsManager {
    constructor() {
        this.map = null; // سيتم تمرير الخريطة من game.js
        this.isShaking = false;
    }

    // ==========================================
    // 1. تهيئة المحرك وربط الأحداث (Init)
    // ==========================================
    init(mapInstance) {
        this.map = mapInstance;
        console.log("💥 [EFFECTS] محرك المؤثرات البصرية جاهز للعمل.");

        // الاستماع لإشارات إطلاق الصواريخ من network.js
        window.addEventListener('Combat:MissileLaunched', (e) => this.handleMissileLaunch(e.detail));
        
        // الاستماع لإشارة الرادار من المساعد الذكي في ui.js
        window.addEventListener('AI:TriggerRadarScan', () => this.triggerRadarScan());
    }

    // ==========================================
    // 2. معالجة إطلاق الصواريخ (Missile Routing)
    // ==========================================
    handleMissileLaunch(data) {
        // بما إننا في ملف Effects، لازم نجيب إحداثيات المهاجم والهدف من الـ DOM أو من مدير الخريطة
        // للتبسيط في هذا الهيكل، سنفترض أننا نرسل الإحداثيات مباشرة أو نأخذها من الـ Markers
        // هنا سنقوم بعمل دالة تقبل الإحداثيات لترسم الأنيميشن
        // (في game.js سنقوم بتمرير الإحداثيات الدقيقة)
    }

    // الدالة الهندسية لطيران الصاروخ (Mathematical Flight Animation)
    animateFlight(startLatLng, endLatLng, weaponType) {
        // 1. حساب المسافة والوقت
        const distance = startLatLng.distanceTo(endLatLng);
        // الوقت بيتحسب بناءً على المسافة (أسرع صاروخ بياخد ثانيتين، وأبطأ 8 ثواني)
        const duration = Math.min(8000, Math.max(2000, distance / 1500)); 

        // 2. حساب زاوية الدوران الدقيقة (Trigonometry) لكي ينظر الصاروخ للهدف
        const p1 = this.map.latLngToContainerPoint(startLatLng);
        const p2 = this.map.latLngToContainerPoint(endLatLng);
        // إضافة 45 درجة لأن إيموجي الصاروخ مائل بطبيعته 🚀
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 45;

        // 3. تحديد شكل الصاروخ حسب نوع السلاح
        let rocketHtml = '';
        if (weaponType === 'nuke') {
            rocketHtml = `<div class="missile nuke-missile" style="transform: rotate(${angle}deg);">☢️</div>`;
        } else {
            rocketHtml = `<div class="missile basic-missile" style="transform: rotate(${angle}deg);">🚀</div>`;
        }

        const rocketIcon = L.divIcon({
            className: 'vfx-missile-container',
            html: rocketHtml,
            iconSize: [40, 40]
        });

        const flyingMarker = L.marker(startLatLng, { icon: rocketIcon, zIndexOffset: 2000 }).addTo(this.map);
        
        // 4. المحرك الفيزيائي للحركة (60 FPS Animation Loop)
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            // دالة Easing لتبطيء الصاروخ قليلاً عند الوصول (Ease-Out)
            let progress = Math.min(elapsed / duration, 1);
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

            // Interpolation (استيفاء رياضي للإحداثيات)
            const currentLat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * easeProgress;
            const currentLng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * easeProgress;
            
            flyingMarker.setLatLng([currentLat, currentLng]);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // الصاروخ وصل! احذف الصاروخ وشغل الانفجار
                this.map.removeLayer(flyingMarker);
                this.triggerExplosion(endLatLng, weaponType);
            }
        };
        
        requestAnimationFrame(animate);
    }

    // ==========================================
    // 3. نظام الانفجارات ورجة الكاميرا (Explosions & Screen Shake) 🌋
    // ==========================================
    triggerExplosion(latlng, weaponType) {
        let explosionHtml = '';
        let explosionSize = [60, 60];
        let timeout = 1000;

        if (weaponType === 'nuke') {
            // الانفجار النووي المرعب
            explosionHtml = `
                <div class="nuke-explosion">
                    <div class="shockwave"></div>
                    <div class="mushroom-cloud">🍄</div>
                </div>`;
            explosionSize = [200, 200];
            timeout = 2500;
            this.cameraShake(800, 'heavy'); // رجة شاشة قوية
        } else {
            // انفجار عادي
            explosionHtml = `<div class="basic-explosion">💥</div>`;
            this.cameraShake(300, 'light'); // رجة خفيفة
        }

        const expMarker = L.marker(latlng, {
            icon: L.divIcon({ className: 'vfx-explosion-container', html: explosionHtml, iconSize: explosionSize }),
            zIndexOffset: 3000
        }).addTo(this.map);

        // إزالة تأثير الانفجار بعد انتهاء وقته
        setTimeout(() => this.map.removeLayer(expMarker), timeout);
    }

    // تأثير رجة الشاشة الاحترافي (Camera Shake Effect)
    cameraShake(duration, intensity = 'light') {
        if (this.isShaking) return;
        this.isShaking = true;
        
        const mapWrapper = document.getElementById('map-wrapper');
        const shakeClass = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
        
        mapWrapper.classList.add(shakeClass);
        
        setTimeout(() => {
            mapWrapper.classList.remove(shakeClass);
            this.isShaking = false;
        }, duration);
    }

    // ==========================================
    // 4. المسح الراداري للمساعد الذكي (AI Radar Scan) 📡
    // ==========================================
    triggerRadarScan() {
        const radarOverlay = document.getElementById('radar-overlay');
        radarOverlay.classList.remove('hidden');
        radarOverlay.classList.add('radar-active');

        // تشغيل صوت تنبيه راداري خفيف لو متاح
        const sfx = document.getElementById('sfx-ui-click');
        if(sfx) { sfx.currentTime = 0; sfx.play().catch(()=>{}); }

        // إخفاء الرادار بعد 3 ثواني (مدة المسح)
        setTimeout(() => {
            radarOverlay.classList.remove('radar-active');
            radarOverlay.classList.add('hidden');
        }, 3000);
    }
}

// تصدير نسخة واحدة للمحرك
export const VFX = new EffectsManager();
