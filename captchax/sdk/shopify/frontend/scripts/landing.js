document.addEventListener('DOMContentLoaded', function() {
    const demoImageBtn = document.getElementById('demo-image-btn');
    const demoSliderBtn = document.getElementById('demo-slider-btn');
    const demoGridBtn = document.getElementById('demo-grid-btn');
    const demoContainer = document.getElementById('demo-widget');

    let currentCaptcha = null;

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function renderDemoCaptcha(type) {
        if (currentCaptcha) {
            demoContainer.removeChild(currentCaptcha);
        }

        const captchaDiv = document.createElement('div');
        captchaDiv.className = 'demo-captcha';
        
        switch(type) {
            case 'image':
                captchaDiv.innerHTML = `
                    <div class="demo-captcha-header">
                        <h4>图像验证码</h4>
                        <span class="demo-badge">${type}</span>
                    </div>
                    <p class="demo-instruction">请选择包含"汽车"的图像</p>
                    <div class="demo-grid">
                        ${[0,1,2,3,4,5,6,7,8].map(i => `
                            <div class="demo-item" data-index="${i}">
                                <div class="demo-placeholder">
                                    <span>图 ${i+1}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="demo-verify-btn">验证</button>
                `;
                break;
                
            case 'slider':
                captchaDiv.innerHTML = `
                    <div class="demo-captcha-header">
                        <h4>滑块验证码</h4>
                        <span class="demo-badge">${type}</span>
                    </div>
                    <div class="demo-slider-track">
                        <div class="demo-slider-target"></div>
                        <div class="demo-slider-handle" id="slider-handle">
                            <span>→</span>
                        </div>
                    </div>
                    <p class="demo-instruction">拖动滑块到正确位置</p>
                `;
                break;
                
            case 'grid':
                captchaDiv.innerHTML = `
                    <div class="demo-captcha-header">
                        <h4>网格验证码</h4>
                        <span class="demo-badge">${type}</span>
                    </div>
                    <p class="demo-instruction">请选择所有包含"苹果"的图像</p>
                    <div class="demo-grid demo-grid-multi">
                        ${[0,1,2,3,4,5,6,7].map(i => `
                            <div class="demo-item demo-item-multi" data-index="${i}">
                                <div class="demo-placeholder">
                                    <span>🍎</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <button class="demo-verify-btn">验证</button>
                `;
                break;
        }

        demoContainer.appendChild(captchaDiv);
        currentCaptcha = captchaDiv;

        setupCaptchaHandlers(type);
    }

    function setupCaptchaHandlers(type) {
        const verifyBtn = currentCaptcha.querySelector('.demo-verify-btn');
        
        if (verifyBtn) {
            verifyBtn.addEventListener('click', function() {
                showToast('验证成功！', 'success');
            });
        }

        if (type === 'slider') {
            const handle = currentCaptcha.querySelector('#slider-handle');
            const track = currentCaptcha.querySelector('.demo-slider-track');
            
            let isDragging = false;
            let startX = 0;
            let currentX = 0;

            handle.addEventListener('mousedown', function(e) {
                isDragging = true;
                startX = e.clientX;
                e.preventDefault();
            });

            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                currentX = e.clientX;
                const trackWidth = track.offsetWidth;
                const handleWidth = handle.offsetWidth;
                const maxX = trackWidth - handleWidth;
                
                let newX = currentX - startX;
                newX = Math.max(0, Math.min(newX, maxX));
                
                handle.style.left = newX + 'px';
            });

            document.addEventListener('mouseup', function() {
                if (isDragging) {
                    isDragging = false;
                    const trackWidth = track.offsetWidth;
                    const handleWidth = handle.offsetWidth;
                    const currentPos = parseFloat(handle.style.left) / (trackWidth - handleWidth) * 100;
                    
                    if (currentPos > 70 && currentPos < 90) {
                        showToast('验证成功！', 'success');
                    } else {
                        showToast('位置不正确，请重试', 'error');
                        handle.style.left = '0px';
                    }
                }
            });
        }

        const items = currentCaptcha.querySelectorAll('.demo-item');
        items.forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('selected');
            });
        });
    }

    if (demoImageBtn) {
        demoImageBtn.addEventListener('click', function() {
            renderDemoCaptcha('image');
        });
    }

    if (demoSliderBtn) {
        demoSliderBtn.addEventListener('click', function() {
            renderDemoCaptcha('slider');
        });
    }

    if (demoGridBtn) {
        demoGridBtn.addEventListener('click', function() {
            renderDemoCaptcha('grid');
        });
    }

    function initFeatureCards() {
        const cards = document.querySelectorAll('.feature-card');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        cards.forEach(card => observer.observe(card));
    }

    initFeatureCards();
});
