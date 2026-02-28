// --- Configuration ---
const TOTAL_NUMBERS = 70;
const PIX_KEY = "21979586608"; // User provided PIX Key
const WHATSAPP_NUMBER = "5521979586608"; // Organizer's number (with country code, no +, no spaces)

// --- Google Sheets Integration ---
const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbyt__k5Eoi9BLK4pwufUh9S308fYejtUngmr_f5LTJgU5KpxjEyAdqNqqZcvyRjFWjO/exec";
const SOLD_NUMBERS = [];

// --- State ---
let selectedNumbers = []; // Store multiple selected numbers
let userData = {
    name: "",
    whatsapp: ""
};

// --- DOM Elements ---
const numberGrid = document.getElementById('numberGrid');
const modalOverlay = document.getElementById('userModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const userDataForm = document.getElementById('userDataForm');
const modalNumberSpan = document.getElementById('modalNumberSpan');
const paymentSection = document.getElementById('payment');
const checkoutFloatingBtn = document.getElementById('checkoutFloatingBtn');

// Payment Displays
const userNameDisplay = document.getElementById('userNameDisplay');
const selectedNumberDisplay = document.getElementById('selectedNumberDisplay');
const pixKeyInput = document.getElementById('pixKey');
const btnCopyPix = document.getElementById('btnCopyPix');
const copyFeedback = document.getElementById('copyFeedback');
const btnWhatsApp = document.getElementById('btnWhatsApp');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    setupPix();
    setupShare();
    initCarousel();
    loadAndRenderGrid();
});

async function loadAndRenderGrid() {
    numberGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 2rem;">Carregando cartela em tempo real...</p>';
    try {
        const response = await fetch(GOOGLE_SHEETS_URL);
        const data = await response.json();

        SOLD_NUMBERS.length = 0;
        data.forEach(row => {
            if (row.Numero_Rifa) {
                SOLD_NUMBERS.push(Number(row.Numero_Rifa));
            }
        });
    } catch (error) {
        console.error("Error loading sold numbers:", error);
    }

    initGrid();
}

// --- Dynamic Number Grid ---
function initGrid() {
    numberGrid.innerHTML = ''; // Clear if re-init

    for (let i = 1; i <= TOTAL_NUMBERS; i++) {
        const numStr = i.toString().padStart(2, '0');
        const btn = document.createElement('button');

        // Verifica se o número já foi vendido
        if (SOLD_NUMBERS.includes(i)) {
            btn.classList.add('num-btn', 'sold');
            btn.textContent = numStr;
            btn.disabled = true; // Impede o clique
            btn.title = "Número Indisponível";
        } else {
            btn.classList.add('num-btn');
            btn.textContent = numStr;
            btn.dataset.num = numStr;
            btn.addEventListener('click', () => handleNumberClick(btn, numStr));
        }

        numberGrid.appendChild(btn);
    }
}

function handleNumberClick(btnElement, num) {
    // If it's already sold, do nothing
    if (SOLD_NUMBERS.includes(Number(num))) return;

    const index = selectedNumbers.indexOf(num);

    if (index > -1) {
        // Deselect
        selectedNumbers.splice(index, 1);
        btnElement.classList.remove('selected');
    } else {
        // Select
        selectedNumbers.push(num);
        btnElement.classList.add('selected');
    }

    // Sort numbers for display
    selectedNumbers.sort((a, b) => parseInt(a) - parseInt(b));

    updateFloatingCheckout();
}

function updateFloatingCheckout() {
    if (selectedNumbers.length > 0) {
        checkoutFloatingBtn.classList.add('active');
        const spanText = checkoutFloatingBtn.querySelector('span');
        const total = selectedNumbers.length * 10;
        spanText.innerHTML = `Comprar ${selectedNumbers.length} Número(s) - <strong>R$ ${total},00</strong>`;
    } else {
        checkoutFloatingBtn.classList.remove('active');
    }
}

// Show Modal when floating button clicked
checkoutFloatingBtn.addEventListener('click', () => {
    // Reset modal form
    document.getElementById('userName').value = userData.name;
    document.getElementById('userWhatsapp').value = userData.whatsapp;

    // Update modal text
    modalNumberSpan.textContent = selectedNumbers.join(", ");

    // Show Modal
    modalOverlay.classList.add('active');
});

// --- Modal Logic ---
btnCloseModal.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
});

// Close modal on click outside
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

userDataForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('userName').value.trim();
    const whatsappInput = document.getElementById('userWhatsapp').value.trim();

    if (!nameInput || !whatsappInput) return;

    // Show loading state on button
    const submitBtn = userDataForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Reservando...";
    submitBtn.disabled = true;

    // Save state
    userData.name = nameInput;
    userData.whatsapp = whatsappInput;

    const formData = new URLSearchParams();
    formData.append('Nome', userData.name);
    formData.append('WhatsApp', userData.whatsapp);
    // Join all numbers into a single string like "15, 23, 42" for the spreadsheet
    const numbersToSubmit = selectedNumbers.join(", ");
    formData.append('Numero_Rifa', numbersToSubmit);

    try {
        await fetch(GOOGLE_SHEETS_URL, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            mode: 'no-cors' // Prevent redirect CORS error blocking JS execution
        });

        // Locally lock the numbers for instant feedback
        selectedNumbers.forEach(n => SOLD_NUMBERS.push(Number(n)));

    } catch (error) {
        console.error("Erro ao registrar na planilha:", error);
    }

    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;

    // Close modal
    modalOverlay.classList.remove('active');

    // Update UI Elements
    initGrid(); // Refresh grid to lock the newly sold number
    activatePaymentSection();
});

function updateGridVisuals() {
    // Clear previous selection visually
    document.querySelectorAll('.num-btn').forEach(btn => btn.classList.remove('selected'));

    // Select the current one
    if (selectedNumbers.length > 0) {
        selectedNumbers.forEach(num => {
            const activeBtn = document.querySelector(`.num-btn[data-num="${num}"]`);
            if (activeBtn) {
                activeBtn.classList.add('selected');
            }
        });
    }
}

// --- Payment & Validation Flow ---
function activatePaymentSection() {
    // Fill the payment specific info
    userNameDisplay.textContent = userData.name.split(' ')[0]; // First name
    selectedNumberDisplay.textContent = selectedNumbers.join(", ");

    // Update PIX value dynamically in the text
    const totalValue = selectedNumbers.length * 10;
    const pixHeader = paymentSection.querySelector('h3');
    pixHeader.textContent = `Faça o PIX de R$ ${totalValue},00`;

    // Enable and update WhatsApp link
    updateWhatsAppLink(totalValue);

    // Show sections and scroll
    paymentSection.classList.add('active');
    setTimeout(() => {
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function setupPix() {
    pixKeyInput.value = PIX_KEY;

    btnCopyPix.addEventListener('click', () => {
        // Select text
        pixKeyInput.select();
        pixKeyInput.setSelectionRange(0, 99999); // Mobile compatibility

        // Copy to clipboard
        navigator.clipboard.writeText(pixKeyInput.value).then(() => {
            // Success visual feedback
            copyFeedback.classList.add('show');
            setTimeout(() => {
                copyFeedback.classList.remove('show');
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            // Fallback for old browsers
            document.execCommand("copy");
            copyFeedback.classList.add('show');
            setTimeout(() => {
                copyFeedback.classList.remove('show');
            }, 2000);
        });
    });
}

function updateWhatsAppLink(totalValue) {
    // Construct dynamic message
    const msgs = selectedNumbers.length > 1 ? "os números" : "o número";
    const msg = `Olá! Sou *${userData.name}* (tel: ${userData.whatsapp}).\nEscolhi ${msgs} *${selectedNumbers.join(", ")}* na rifa dos Gatinhos Macaé.\nO valor total deu R$ ${totalValue},00.\n\nSegue abaixo o meu comprovante do PIX:`;
    const encodedMsg = encodeURIComponent(msg);

    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMsg}`;

    btnWhatsApp.href = waUrl;
    btnWhatsApp.classList.remove('disabled');
}

// --- Sharing ---
function setupShare() {
    const btnShare = document.getElementById('btnShareList');

    btnShare.addEventListener('click', async () => {
        const shareData = {
            title: 'Missão Macaé: Ajude 10 Gatinhos!',
            text: 'Resgatamos 10 gatinhos de risco e precisamos de ajuda com o transporte. Participe da nossa rifa solidária!',
            url: window.location.href // Will use actual URL when deployed
        };

        try {
            if (navigator.share && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback copy link
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copiado para a área de transferência! Compartilhe com seus amigos.');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    });
}

// --- Carousel Logic ---
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;

    // Change image every 3.5 seconds
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 3500);
}
