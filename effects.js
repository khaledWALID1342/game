// ==========================================================================
// 💥 THE VISUAL EFFECTS & ANIMATION ENGINE (V8.5 - VFX & SCOUT PLANES)
// ==========================================================================
// هذا الملف مسئول عن كل حركة على الشاشة: طيران الصواريخ، الانفجارات النووية،
// رجة الكاميرا، مسح الرادار الذكي، وطائرات الاستطلاع. (يعمل بمعدل 60 إطار في الثانية).

class EffectsManager {
    constructor() {
        this.map = null; // يتم تمرير الخريطة من game.js
        this.isShaking = false;
    }

    // ==========================================
    // 1. تهيئة المحرك 
    // ==========================================
    init(mapInstance) {
        this.map = mapInstance;
        console.log("💥 [EFFECTS] محرك المؤثرات البصرية والفيزياء جاهز للعمل.");
    }

    // ==========================================
    // 🚀 2. أنيميشن طيران الصواريخ (Mathematical Flight)
    // ==========================================
    animateFlight(startLatLng, endLatLng, weaponType) {
        // حساب المسافة والوقت (من ثانيتين لـ 8 ثواني كحد أقصى)
        const distance = startLatLng.distanceTo(endLatLng);
        const duration = Math.min(8000, Math.max(2000, distance / 1500)); 

        // حساب زاوية دوران الصاروخ بدقة (Trigonometry)
        const p1 = this.map.latLngToContainerPoint(startLatLng);
        const p2 = this.map.latLngToContainerPoint(endLatLng);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI) + 45;

        // تصميم الصاروخ حسب نوعه
        let rocketHtml = weaponType === 'nuke' 
            ? `<div class="missile nuke-missile" style="transform: rotate(${angle}deg); font-size: 30px; filter: drop-shadow(0 0 10px red);">☢️</div>`
            : `<div class="missile basic-missile" style="transform: rotate(${angle}deg); font-size: 25px; filter: drop-shadow(0 0 8px orange);">🚀</div>`;

        const rocketIcon = L.divIcon({
            className: 'vfx-missile-container',
            html: rocketHtml,
            iconSize: [40, 40]
        });

        const flyingMarker = L.marker(startLatLng, { icon: rocketIcon, zIndexOffset: 2000 }).addTo(this.map);
        
        // المحرك الفيزيائي للحركة (60 FPS Animation Loop)
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            let progress = Math.min(elapsed / duration, 1);
            
            // دالة Easing لتبطيء الصاروخ قليلاً عند الوصول (Ease-Out)
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
    // 🌋 3. الانفجارات ورجة الكاميرا (Explosions & Shake)
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
            this.cameraShake(800, 'heavy'); 
            this.playSound('explosion'); // يفضل إضافة صوت explosion-heavy لاحقاً
        } else {
            // الانفجار العادي
            explosionHtml = `<div class="basic-explosion" style="font-size: 40px; animation: pulseGlow 0.5s;">💥</div>`;
            this.cameraShake(300, 'light'); 
            this.playSound('explosion');
        }

        const expMarker = L.marker(latlng, {
            icon: L.divIcon({ className: 'vfx-explosion-container', html: explosionHtml, iconSize: explosionSize }),
            zIndexOffset: 3000
        }).addTo(this.map);

        setTimeout(() => this.map.removeLayer(expMarker), timeout);
    }

    cameraShake(duration, intensity = 'light') {
        if (this.isShaking) return;
        this.isShaking = true;
        
        const mapWrapper = document.getElementById('map-wrapper');
        const shakeClass = intensity === 'heavy' ? 'shake-heavy' : 'shake-light';
        
        if(mapWrapper) {
            mapWrapper.classList.add(shakeClass);
            setTimeout(() => {
                mapWrapper.classList.remove(shakeClass);
                this.isShaking = false;
            }, duration);
        }
    }

    // ==========================================
    // ✈️ 4. طائرة الاستطلاع (Scout Plane UAV)
    // ==========================================
    animateScoutPlane() {
        const plane = document.createElement('div');
        plane.className = 'scout-plane-anim';
        plane.innerHTML = '✈️';
        document.body.appendChild(plane);
        
        this.playSound('ui-click'); 
        
        // تحريك الطيارة بعرض الشاشة
        setTimeout(() => { plane.style.left = '120vw'; }, 100);
        
        // مسح الطيارة من الـ DOM بعد ما تخرج من الشاشة
        setTimeout(() => { plane.remove(); }, 4500);
    }

    // ==========================================
    // 📡 5. المسح الراداري (Radar Sweep)
    // ==========================================
    triggerRadarScan() {
        const radarOverlay = document.getElementById('radar-overlay');
        if(radarOverlay) {
            radarOverlay.classList.add('radar-active');
            this.playSound('ui-click');

            // إخفاء الرادار بعد 3 ثواني
            setTimeout(() => {
                radarOverlay.classList.remove('radar-active');
            }, 3000);
        }
    }

    // ==========================================
    // 🎵 مشغل الصوت الآمن (Safe Audio Player)
    // ==========================================
    playSound(type) {
        const audio = document.getElementById(`sfx-${type}`) || document.getElementById(`sfx-ui-${type}`);
        if(audio) { 
            audio.currentTime = 0; 
            audio.play().catch(()=>{ /* تجاهل خطأ المتصفح إذا منع الصوت */ }); 
        }
    }
}

// تصدير نسخة واحدة للمحرك
export const VFX = new EffectsManager();
