// ==============================================
// Configuration
// ==============================================

const CONFIG = {
    // ВАЖНО: Замени этот URL на Web App URL из твоего Google Apps Script
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwNLCe8jvJCJmJGRjVvu73OqW6OBQKCIZsRHprfxgE1Rr0gX_IPW81waUrXFd8yPox2/exec',
    
    // URL бесплатного материала
    NOTION_URL: 'https://www.notion.so/English-collocations-katya-proeng-284ecf12da6e80d2a797cb7b92229792',
    
    // Время задержки перед редиректом (в миллисекундах)
    REDIRECT_DELAY: 3000
};

// ==============================================
// Initialize International Phone Input
// ==============================================

let phoneInput;

document.addEventListener('DOMContentLoaded', function() {
    const phoneInputElement = document.querySelector("#phone");
    
    phoneInput = window.intlTelInput(phoneInputElement, {
        initialCountry: "auto",
        geoIpLookup: function(success, failure) {
            fetch("https://ipapi.co/json")
                .then(res => res.json())
                .then(data => success(data.country_code))
                .catch(() => success("us"));
        },
        utilsScript: "https://cdn.jsdelivr.net/npm/intl-tel-input@19.5.6/build/js/utils.js",
        preferredCountries: ["us", "gb", "ru", "ua", "cz", "pl", "de"],
        separateDialCode: true,
        formatOnDisplay: true,
        nationalMode: false,
        autoPlaceholder: "aggressive"
    });
    
    // Инициализация обработчиков формы
    initializeForm();
});

// ==============================================
// Form Validation
// ==============================================

const validators = {
    name: {
        validate: (value) => {
            if (!value || value.trim().length < 2) {
                return 'Please enter your full name (at least 2 characters)';
            }
            if (!/^[a-zA-Zа-яА-ЯёЁ\s'-]+$/.test(value)) {
                return 'Name can only contain letters, spaces, hyphens and apostrophes';
            }
            return null;
        }
    },
    
    email: {
        validate: (value) => {
            if (!value || value.trim().length === 0) {
                return 'Email address is required';
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return 'Please enter a valid email address';
            }
            return null;
        }
    },
    
    phone: {
        validate: (value) => {
            if (!phoneInput) {
                return 'Phone input not initialized';
            }
            if (!phoneInput.isValidNumber()) {
                return 'Please enter a valid phone number';
            }
            return null;
        }
    }
};

// Показать ошибку
function showError(fieldId, message) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement && inputElement) {
        errorElement.textContent = message;
        inputElement.classList.add('error');
    }
}

// Очистить ошибку
function clearError(fieldId) {
    const errorElement = document.getElementById(`${fieldId}Error`);
    const inputElement = document.getElementById(fieldId);
    
    if (errorElement && inputElement) {
        errorElement.textContent = '';
        inputElement.classList.remove('error');
    }
}

// Валидация одного поля
function validateField(fieldId) {
    const input = document.getElementById(fieldId);
    const validator = validators[fieldId];
    
    if (!input || !validator) return true;
    
    const error = validator.validate(input.value);
    
    if (error) {
        showError(fieldId, error);
        return false;
    } else {
        clearError(fieldId);
        return true;
    }
}

// Валидация всей формы
function validateForm() {
    let isValid = true;
    
    ['name', 'email', 'phone'].forEach(fieldId => {
        if (!validateField(fieldId)) {
            isValid = false;
        }
    });
    
    return isValid;
}

// ==============================================
// Form Initialization
// ==============================================

function initializeForm() {
    const form = document.getElementById('leadForm');
    const inputs = ['name', 'email', 'phone'];
    
    // Валидация при потере фокуса
    inputs.forEach(fieldId => {
        const input = document.getElementById(fieldId);
        if (input) {
            input.addEventListener('blur', () => validateField(fieldId));
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    clearError(fieldId);
                }
            });
        }
    });
    
    // Обработка отправки формы
    form.addEventListener('submit', handleFormSubmit);
}

// ==============================================
// Form Submission
// ==============================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Проверка honeypot (защита от спама)
    const honeypot = document.getElementById('website');
    if (honeypot && honeypot.value) {
        console.log('Spam detected');
        return;
    }
    
    // Валидация формы
    if (!validateForm()) {
        // Прокрутка к первой ошибке
        const firstError = document.querySelector('.form-input.error');
        if (firstError) {
            firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }
    
    // Получение данных формы
    const formData = getFormData();
    
    // Показать состояние загрузки
    showLoadingState();
    
    // Отправка данных в Google Sheets
    try {
        await submitToGoogleSheets(formData);
        showSuccessAndRedirect();
    } catch (error) {
        console.error('Error submitting form:', error);
        handleSubmissionError(error);
    }
}

// Получить данные формы
function getFormData() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phoneNumber = phoneInput.getNumber(); // Полный номер с кодом страны
    const countryCode = phoneInput.getSelectedCountryData().dialCode;
    const countryName = phoneInput.getSelectedCountryData().name;
    
    return {
        name,
        email,
        phone: phoneNumber,
        countryCode: `+${countryCode}`,
        country: countryName,
        timestamp: new Date().toISOString(),
        source: 'Instagram Lead Magnet'
    };
}

// Показать состояние загрузки
function showLoadingState() {
    const form = document.getElementById('leadForm');
    const loadingState = document.getElementById('loadingState');
    const submitBtn = document.getElementById('submitBtn');
    
    submitBtn.disabled = true;
    form.style.opacity = '0.5';
    form.style.pointerEvents = 'none';
    loadingState.style.display = 'block';
}

// Скрыть состояние загрузки
function hideLoadingState() {
    const form = document.getElementById('leadForm');
    const loadingState = document.getElementById('loadingState');
    const submitBtn = document.getElementById('submitBtn');
    
    submitBtn.disabled = false;
    form.style.opacity = '1';
    form.style.pointerEvents = 'auto';
    loadingState.style.display = 'none';
}

// ==============================================
// Google Sheets Integration
// ==============================================

async function submitToGoogleSheets(data) {
    // Проверка конфигурации
    if (!CONFIG.GOOGLE_SCRIPT_URL || CONFIG.GOOGLE_SCRIPT_URL.includes('YOUR_GOOGLE')) {
        console.warn('Google Apps Script URL not configured. Using mock submission.');
        // Имитация задержки сети для тестирования
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true, mock: true };
    }
    
    const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // Важно для Google Apps Script
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    // При mode: 'no-cors' response всегда opaque, поэтому считаем успешным
    return { success: true };
}

// ==============================================
// Success Handling
// ==============================================

function showSuccessAndRedirect() {
    hideLoadingState();
    
    const successModal = document.getElementById('successModal');
    successModal.style.display = 'flex';
    
    // Автоматический редирект через заданное время
    setTimeout(() => {
        redirectToNotion();
    }, CONFIG.REDIRECT_DELAY);
    
    // Обработка ручного клика
    const manualLink = document.getElementById('manualLink');
    manualLink.addEventListener('click', (e) => {
        e.preventDefault();
        redirectToNotion();
    });
}

function redirectToNotion() {
    window.location.href = CONFIG.NOTION_URL;
}

// ==============================================
// Error Handling
// ==============================================

function handleSubmissionError(error) {
    hideLoadingState();
    
    // Создание и показ сообщения об ошибке
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-notification';
    errorMessage.innerHTML = `
        <div style="
            background: #fee;
            border: 2px solid #fcc;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            text-align: center;
            animation: shake 0.5s ease;
        ">
            <p style="color: #c33; font-weight: 600; margin-bottom: 0.5rem;">
                Oops! Something went wrong
            </p>
            <p style="color: #666; font-size: 0.9rem;">
                Please try again or contact us directly at katya@proeng.com
            </p>
            <button onclick="location.reload()" style="
                margin-top: 1rem;
                padding: 0.75rem 1.5rem;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
            ">
                Try Again
            </button>
        </div>
    `;
    
    const form = document.getElementById('leadForm');
    form.parentNode.insertBefore(errorMessage, form.nextSibling);
    
    // Удалить сообщение через 10 секунд
    setTimeout(() => {
        errorMessage.remove();
    }, 10000);
}

// ==============================================
// Analytics & Tracking (Optional)
// ==============================================

// Функция для отслеживания событий (интеграция с Google Analytics, Facebook Pixel и т.д.)
function trackEvent(eventName, eventData) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventData);
    }
    
    // Facebook Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', eventName, eventData);
    }
    
    console.log('Event tracked:', eventName, eventData);
}

// Отслеживание просмотра формы
trackEvent('form_view', {
    form_name: 'Lead Magnet Form',
    page_url: window.location.href
});

// Отслеживание успешной отправки (вызывается в showSuccessAndRedirect)
function trackFormSubmission(formData) {
    trackEvent('form_submit', {
        form_name: 'Lead Magnet Form',
        user_country: formData.country
    });
}

// ==============================================
// Utility Functions
// ==============================================

// Предотвращение двойной отправки формы
let isSubmitting = false;

function preventDoubleSubmit() {
    if (isSubmitting) return true;
    isSubmitting = true;
    setTimeout(() => { isSubmitting = false; }, 3000);
    return false;
}

// Сохранение данных в localStorage для восстановления (опционально)
function saveFormDataToLocalStorage() {
    const formData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
    };
    localStorage.setItem('leadFormData', JSON.stringify(formData));
}

// Восстановление данных из localStorage
function restoreFormDataFromLocalStorage() {
    const savedData = localStorage.getItem('leadFormData');
    if (savedData) {
        try {
            const formData = JSON.parse(savedData);
            if (formData.name) document.getElementById('name').value = formData.name;
            if (formData.email) document.getElementById('email').value = formData.email;
        } catch (e) {
            console.error('Error restoring form data:', e);
        }
    }
}

// Вызов при загрузке страницы (если нужно)
// restoreFormDataFromLocalStorage();

// ==============================================
// Keyboard Navigation & Accessibility
// ==============================================

document.addEventListener('keydown', function(e) {
    // Enter на последнем поле отправляет форму
    if (e.key === 'Enter' && e.target.id === 'phone') {
        e.preventDefault();
        const form = document.getElementById('leadForm');
        form.dispatchEvent(new Event('submit'));
    }
    
    // Escape закрывает success modal
    if (e.key === 'Escape') {
        const successModal = document.getElementById('successModal');
        if (successModal.style.display === 'flex') {
            redirectToNotion();
        }
    }
});

// ==============================================
// Debug Mode (для тестирования)
// ==============================================

// Раскомментируй для тестирования без отправки в Google Sheets
/*
const DEBUG_MODE = true;

if (DEBUG_MODE) {
    console.log('🔧 DEBUG MODE ENABLED');
    console.log('Form will not actually submit to Google Sheets');
    
    // Переопределить функцию отправки
    window.submitToGoogleSheets = async function(data) {
        console.log('📤 Mock submission:', data);
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true, mock: true };
    };
}
*/

console.log('✅ Lead capture form initialized');
console.log('📝 Remember to update CONFIG.GOOGLE_SCRIPT_URL with your Google Apps Script URL');
