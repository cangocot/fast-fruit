// DOM Elements
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.nav-menu');
const orderForm = document.getElementById('order-form');
const contactForm = document.getElementById('contact-form');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const visitorCount = document.getElementById('visitor-count');
const buffetCheckbox = document.getElementById('buffet');
const selectedFruitsChips = document.getElementById('selected-fruits-chips');
const goOrderBuffetBtn = document.getElementById('go-order-buffet');

// Mobile Navigation Toggle
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    navToggle.classList.toggle('active');
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
    });
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Visitor Counter System (Firebase if available, else localStorage)
function initVisitorCounter() {
    if (window.db) {
        const counterRef = window.db.collection('meta').doc('visitorCounter');
        // Ensure document exists, then increment
        counterRef.get().then((doc) => {
            if (!doc.exists) {
                return counterRef.set({ count: 0 });
            }
        }).finally(() => {
            counterRef.set({ count: firebase.firestore.FieldValue.increment(1) }, { merge: true }).catch(() => {});
        });

        // Live updates
        counterRef.onSnapshot((snap) => {
            const data = snap.data() || { count: 0 };
            visitorCount.textContent = Number(data.count || 0).toLocaleString();
        });
    } else {
        const STORAGE_TOTAL_KEY = 'visitorTotal_v2';
        const SESSION_FLAG_KEY = 'visitorSessionCounted_v2';
        let total = parseInt(localStorage.getItem(STORAGE_TOTAL_KEY) || '0', 10);

        // Count once per browser session
        if (!sessionStorage.getItem(SESSION_FLAG_KEY)) {
            total += 1;
            localStorage.setItem(STORAGE_TOTAL_KEY, String(total));
            sessionStorage.setItem(SESSION_FLAG_KEY, '1');
        }

        visitorCount.textContent = Number(total).toLocaleString();

        // Expose a safe reset function
        window.resetVisitorCounter = function() {
            try {
                localStorage.setItem(STORAGE_TOTAL_KEY, '0');
                sessionStorage.removeItem(SESSION_FLAG_KEY);
                visitorCount.textContent = '0';
                if (typeof showToast === 'function') {
                    showToast('รีเซ็ตผู้เข้าชมแล้ว', 'success');
                }
            } catch (_) {}
        };
    }
}

// Order Form Functionality
if (orderForm) {
    const menuCheckboxes = orderForm.querySelectorAll('input[name="menu"]');
    const quantityInput = document.getElementById('quantity');
    const totalPriceInput = document.getElementById('total-price');

    // Calculate total price
    function calculateTotal() {
        let total = 0;
        let selectedItems = 0;
        
        menuCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                total += parseInt(checkbox.dataset.price);
                selectedItems++;
            }
        });
        
        const quantity = parseInt(quantityInput.value) || 1;
        total = total * quantity;
        
        totalPriceInput.value = total > 0 ? `${total.toLocaleString()} บาท` : '0 บาท';
        
        // Update submit button state
        const submitBtn = orderForm.querySelector('.btn-submit');
        if (selectedItems === 0) {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }
    }

    // Event listeners for price calculation
    menuCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calculateTotal);
    });
    
    quantityInput.addEventListener('input', calculateTotal);

    // Initialize submit state
    calculateTotal();

    // Fruit selection sync with buffet
    const fruitItems = document.querySelectorAll('.fruit-item[data-fruit]');
    function getSelectedFruits() {
        return Array.from(fruitItems)
            .filter(el => el.classList.contains('selected'))
            .map(el => el.dataset.fruit);
    }

    function renderSelectedFruitChips() {
        if (!selectedFruitsChips) return;
        const fruits = getSelectedFruits();
        selectedFruitsChips.innerHTML = '';
        fruits.forEach(name => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.innerHTML = `${name} <button aria-label="remove">×</button>`;
            chip.querySelector('button').addEventListener('click', () => {
                // unselect in grid
                const target = Array.from(fruitItems).find(el => el.dataset.fruit === name);
                if (target) {
                    target.classList.remove('selected');
                }
                syncBuffetCheckbox();
                calculateTotal();
                renderSelectedFruitChips();
            });
            selectedFruitsChips.appendChild(chip);
        });
    }

    function syncBuffetCheckbox() {
        const hasFruits = getSelectedFruits().length > 0;
        if (buffetCheckbox) {
            buffetCheckbox.checked = hasFruits;
        }
    }

    fruitItems.forEach(item => {
        item.addEventListener('click', () => {
            item.classList.toggle('selected');
            syncBuffetCheckbox();
            calculateTotal();
            renderSelectedFruitChips();
        });
    });

    if (buffetCheckbox) {
        buffetCheckbox.addEventListener('change', () => {
            if (!buffetCheckbox.checked) {
                fruitItems.forEach(el => el.classList.remove('selected'));
            }
            calculateTotal();
            renderSelectedFruitChips();
        });
    }

    // Jump to order with buffet checked
    if (goOrderBuffetBtn) {
        goOrderBuffetBtn.addEventListener('click', () => {
            if (buffetCheckbox) {
                buffetCheckbox.checked = getSelectedFruits().length > 0;
            }
            renderSelectedFruitChips();
        });
    }

    // Form submission
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const orderData = {
            customerName: formData.get('customer-name'),
            customerPhone: formData.get('customer-phone'),
            selectedMenus: [],
            buffetSelectedFruits: getSelectedFruits(),
            quantity: formData.get('quantity'),
            notes: formData.get('notes'),
            totalPrice: totalPriceInput.value,
            orderDate: new Date().toLocaleString('th-TH')
        };

        // Get selected menu items
        menuCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                orderData.selectedMenus.push({
                    name: checkbox.value,
                    price: checkbox.dataset.price
                });
            }
        });

        // Validate form: require at least one selection (buffet with fruits or extra menu)
        const hasBuffet = buffetCheckbox ? buffetCheckbox.checked : false;
        const hasBuffetFruits = orderData.buffetSelectedFruits && orderData.buffetSelectedFruits.length > 0;
        const hasExtras = orderData.selectedMenus.length > 0;
        if (!( (hasBuffet && hasBuffetFruits) || hasExtras )) {
            showToast('กรุณาเลือกเมนูอย่างน้อย 1 รายการ', 'error');
            return;
        }

        showToast('กำลังประมวลผลคำสั่งซื้อ...', 'info');

        const finalizeSuccess = () => {
            showToast('ส่งคำสั่งซื้อสำเร็จ! เราจะติดต่อกลับภายใน 24 ชั่วโมง', 'success');
            orderForm.reset();
            totalPriceInput.value = '0 บาท';
            const submitBtn = orderForm.querySelector('.btn-submit');
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
            submitBtn.style.cursor = 'not-allowed';
            // reset buffet selections
            fruitItems.forEach(el => el.classList.remove('selected'));
            renderSelectedFruitChips();
        };

        if (window.db) {
            window.db.collection('orders').add(orderData)
                .then(finalizeSuccess)
                .catch((err) => {
                    console.error('Failed to store order to Firestore', err);
                    // Fallback to localStorage
                    const orders = JSON.parse(localStorage.getItem('orders') || '[]');
                    orders.push(orderData);
                    localStorage.setItem('orders', JSON.stringify(orders));
                    finalizeSuccess();
                });
        } else {
            // Fallback: store locally and proceed
            const orders = JSON.parse(localStorage.getItem('orders') || '[]');
            orders.push(orderData);
            localStorage.setItem('orders', JSON.stringify(orders));
            setTimeout(finalizeSuccess, 800);
        }
    });
}

// Contact Form Functionality
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const contactData = {
            name: formData.get('contact-name'),
            email: formData.get('contact-email'),
            message: formData.get('contact-message'),
            contactDate: new Date().toLocaleString('th-TH')
        };

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactData.email)) {
            showToast('กรุณากรอกอีเมลให้ถูกต้อง', 'error');
            return;
        }

        showToast('กำลังส่งข้อความ...', 'info');

        const finalizeSuccess = () => {
            showToast('ส่งข้อความสำเร็จ! เราจะติดต่อกลับภายใน 48 ชั่วโมง', 'success');
            contactForm.reset();
        };

        if (window.db) {
            window.db.collection('contacts').add(contactData)
                .then(finalizeSuccess)
                .catch((err) => {
                    console.error('Failed to store contact to Firestore', err);
                    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
                    contacts.push(contactData);
                    localStorage.setItem('contacts', JSON.stringify(contacts));
                    finalizeSuccess();
                });
        } else {
            const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
            contacts.push(contactData);
            localStorage.setItem('contacts', JSON.stringify(contacts));
            setTimeout(finalizeSuccess, 800);
        }
    });
}

// Toast Notification System
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    // Update toast styling based on type
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

// Add toast styles for different types
const style = document.createElement('style');
style.textContent = `
    .toast.error {
        background: linear-gradient(135deg, #ff4757, #ff3742);
    }
    .toast.info {
        background: linear-gradient(135deg, #3742fa, #2f3542);
    }
    .toast.success {
        background: linear-gradient(135deg, #2ed573, #1e90ff);
    }
`;
document.head.appendChild(style);

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.querySelectorAll('.menu-card, .contact-item, .form-group').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Header scroll effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(10, 10, 10, 0.98)';
        header.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.3)';
    } else {
        header.style.background = 'rgba(10, 10, 10, 0.95)';
        header.style.boxShadow = 'none';
    }
});

// Parallax effect for floating fruits
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const fruits = document.querySelectorAll('.floating-fruit');
    
    fruits.forEach((fruit, index) => {
        const speed = 0.5 + (index * 0.1);
        const yPos = -(scrolled * speed);
        fruit.style.transform = `translateY(${yPos}px)`;
    });
});

// Add loading animation for images
document.querySelectorAll('img').forEach(img => {
    img.addEventListener('load', function() {
        this.style.opacity = '0';
        this.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            this.style.opacity = '1';
        }, 100);
    });
});

// Initialize tooltips for menu items
document.querySelectorAll('.menu-card').forEach(card => {
    const title = card.querySelector('h3').textContent;
    const price = card.querySelector('.price').textContent;
    
    card.setAttribute('title', `${title} - ${price}`);
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close mobile menu
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
        
        // Hide toast
        toast.classList.remove('show');
    }
});

// Performance optimization: Lazy load images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Add some interactive effects
document.querySelectorAll('.menu-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Add loading animation
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
        document.body.style.opacity = '1';
    }, 100);
    
    // Initialize visitor counter (Firebase or local)
    initVisitorCounter();

    // Optional: reset via keyboard or URL hash for admin convenience
    if (location.hash === '#reset-counter' && typeof window.resetVisitorCounter === 'function') {
        window.resetVisitorCounter();
        history.replaceState(null, '', location.pathname + location.search);
    }
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
            if (typeof window.resetVisitorCounter === 'function') {
                window.resetVisitorCounter();
            }
        }
    });
});

// Number animation function
function animateNumber(start, end, duration, callback) {
    const startTime = performance.now();
    const change = end - start;
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const current = start + (change * easeOutQuart(progress));
        callback(current);
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Easing function
function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
}

// Add some fun interactive elements
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('floating-fruit')) {
        e.target.style.transform = 'scale(1.2) rotate(360deg)';
        setTimeout(() => {
            e.target.style.transform = '';
        }, 600);
    }
});

// Console welcome message
console.log(`
🍊 ฟาสต์ ฟรุ๊ต - น้ำผลไม้เพื่อสุขภาพ 🥑
เว็บไซต์ถูกสร้างด้วย HTML, CSS และ JavaScript
ขอบคุณที่แวะมาเยี่ยมชม!
`);
