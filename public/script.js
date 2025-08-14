document.addEventListener('DOMContentLoaded', function() {
    // Função para gerenciar background responsivo
    function updateBackground() {
        const body = document.body;
        const screenWidth = window.innerWidth;
        
        // Remover classes existentes
        body.classList.remove('desktop', 'mobile');
        
        if (screenWidth <= 768) {
            // Dispositivos móveis - Background 2
            body.classList.add('mobile');
            console.log('Background mudou para Mobile (Background2)');
        } else {
            // Dispositivos maiores - Background 1
            body.classList.add('desktop');
            console.log('Background mudou para Desktop (Background1)');
        }
    }
    
    // Atualizar background no carregamento
    updateBackground();
    
    // Atualizar background quando redimensionar a tela
    window.addEventListener('resize', function() {
        updateBackground();
    });
    
    // Debug: verificar se as imagens existem
    function checkImages() {
        const img1 = new Image();
        const img2 = new Image();
        
        img1.onload = function() {
            console.log('Background1.png carregado com sucesso');
        };
        img1.onerror = function() {
            console.error('Erro ao carregar Background1.png - verifique se o arquivo existe em img/');
        };
        img1.src = 'img/Background1.png';
        
        img2.onload = function() {
            console.log('Background2.png carregado com sucesso');
        };
        img2.onerror = function() {
            console.error('Erro ao carregar Background2.png - verifique se o arquivo existe em img/');
        };
        img2.src = 'img/Background2.png';
    }
    
    // Verificar imagens
    checkImages();
    
    // Elementos DOM
    const donationForm = document.getElementById('donation-form');
    const qrSection = document.getElementById('qr-section');
    const qrCodeImg = document.getElementById('qr-code-img');
    const pixCodeText = document.getElementById('pix-code-text');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const paymentInfo = document.getElementById('payment-info');
    const simulateSection = document.getElementById('simulate-section');
    const simulatePaymentBtn = document.getElementById('simulate-payment-btn');
    const notification = document.getElementById('notification');
    const copySound = document.getElementById('copy-sound');
    const oruamCharacter = document.getElementById('oruam-character');
    const oruamText = document.getElementById('oruam-text');
    const totalDonorsSpan = document.getElementById('total-donors');
    const rankingList = document.getElementById('ranking-list');
    const slotReel = document.getElementById('slot-reel');
    
    // Variáveis globais
    let currentPaymentId = null;
    let paymentCheckInterval = null;
    let currentDonorIndex = 0;
    let recentDonations = []; // Array para doações reais
    
    // Lista de frases do Oruam
    const oruamPhrases = [
        'Cardique',
        'An com o Oruam',
        'Fé minha tropa',
        'An Quem',
        'Vou me entregar tropa',
        'Quero ver pegar no complexo'
    ];
    
    // Lista de sons aleatórios do Oruam
    const oruamSounds = [
        'sounds/oruam-sound-1.mp3',
        'sounds/oruam-sound-2.mp3',
        'sounds/oruam-sound-3.mp3',
        'sounds/oruam-sound-4.mp3',
        'sounds/oruam-sound-5.mp3'
    ];
    
    // Função para alterar texto do Oruam
    function changeOruamText() {
        const randomIndex = Math.floor(Math.random() * oruamPhrases.length);
        oruamText.style.animation = 'none';
        setTimeout(() => {
            oruamText.textContent = oruamPhrases[randomIndex];
            oruamText.style.animation = 'fadeInOut 0.5s ease-in-out';
        }, 50);
    }
    
    // Alterar texto a cada 3 segundos
    setInterval(changeOruamText, 3000);

    // Função para carregar doações recentes reais
    async function loadRecentDonations() {
        try {
            const response = await fetch('/recent-donations');
            if (response.ok) {
                recentDonations = await response.json();
                console.log('Doações reais carregadas:', recentDonations.length);
            } else {
                console.error('Erro ao carregar doações:', response.status);
                recentDonations = []; // Fallback para array vazio
            }
        } catch (error) {
            console.error('Erro ao buscar doações:', error);
            recentDonations = []; // Fallback para array vazio
        }
    }

    // Função para criar item do slot com dados reais
    function createSlotItem(donor, isActive = false) {
        if (!donor) {
            return `
                <div class="slot-item ${isActive ? 'active' : ''}">
                    <div class="slot-donor-info">
                        <span class="slot-position">-</span>
                        <div class="slot-name">Aguardando apoio...</div>
                    </div>
                    <div class="slot-amount">R$ 0,00</div>
                </div>
            `;
        }
        
        return `
            <div class="slot-item ${isActive ? 'active' : ''}">
                <div class="slot-donor-info">
                    <span class="slot-position">${donor.position}</span>
                    <div class="slot-name">${donor.name}</div>
                </div>
                <div class="slot-amount">${donor.amount}</div>
            </div>
        `;
    }
    
    // Função para atualizar exibição do slot com dados reais
    function updateSlotDisplay() {
        if (recentDonations.length === 0) {
            slotReel.innerHTML = createSlotItem(null, true);
            return;
        }
        
        const currentDonor = recentDonations[currentDonorIndex];
        slotReel.innerHTML = createSlotItem(currentDonor, true);
        
        // Próximo doador
        currentDonorIndex = (currentDonorIndex + 1) % recentDonations.length;
    }
    
    // Função para inicializar sistema de slots com dados reais
    async function initializeSlotSystem() {
        await loadRecentDonations();
        updateSlotDisplay();
        
        // Atualizar slot a cada 2 segundos
        setInterval(updateSlotDisplay, 2000);
        
        // Recarregar doações a cada 30 segundos
        setInterval(loadRecentDonations, 30000);
    }
    
    // Inicializar sistema de slots
    initializeSlotSystem();
    
    // Função para tocar som aleatório do Oruam
    function playRandomOruamSound() {
        const randomIndex = Math.floor(Math.random() * oruamSounds.length);
        const audio = new Audio(oruamSounds[randomIndex]);
        audio.volume = 0.7;
        audio.play().catch(err => {
            console.log('Erro ao reproduzir áudio:', err);
        });
    }
    
    // Event listener para o personagem Oruam
    oruamCharacter.addEventListener('click', function() {
        playRandomOruamSound();
        
        // Adicionar animação de clique
        this.style.transform = 'scale(0.9)';
        setTimeout(() => {
            this.style.transform = '';
        }, 100);
    });
    
    // Formatação de valores monetários
    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    }
    
    // Mostrar notificação
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Carregar estatísticas
    async function loadStats() {
        try {
            const response = await fetch('/stats');
            const stats = await response.json();
            
            if (totalDonorsSpan) {
                totalDonorsSpan.textContent = stats.total_donors || 0;
            }
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
        }
    }
    
    // Carregar ranking
    async function loadRanking() {
        try {
            const response = await fetch('/ranking');
            const ranking = await response.json();
            
            if (rankingList) {
                if (ranking.length === 0) {
                    rankingList.innerHTML = '<li class="ranking-item"><div class="donor-info"><div class="donor-name">Nenhuma doação ainda</div></div></li>';
                } else {
                    rankingList.innerHTML = ranking.map((donor, index) => {
                        const position = index + 1;
                        let positionClass = '';
                        let crownIcon = '';
                        
                        if (position === 1) {
                            positionClass = 'top-1';
                            crownIcon = '<svg class="crown-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 12l3 1 3-4 3 4 3-1-2 4H5zm2.5-7L4 6l1.5 3h2zm9 0h2L20 6l-3.5 3z"/></svg>';
                        } else if (position === 2) {
                            positionClass = 'top-2';
                        } else if (position === 3) {
                            positionClass = 'top-3';
                        }
                        
                        return `
                            <li class="ranking-item">
                                ${crownIcon}
                                <div class="ranking-position">
                                    <span class="position-number ${positionClass}">${position}</span>
                                    <div class="donor-info">
                                        <div class="donor-name">${donor.donor_name}</div>
                                        <div class="donor-location">Apoiador</div>
                                    </div>
                                </div>
                                <div class="donation-amount">${formatCurrency(donor.total_amount)}</div>
                            </li>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            if (rankingList) {
                rankingList.innerHTML = '<li class="ranking-item"><div class="donor-info"><div class="donor-name">Erro ao carregar ranking</div></div></li>';
            }
        }
    }
    
    // Mostrar QR Code
    function showQRCode(data) {
        qrSection.classList.remove('hidden');
        
        if (data.qr_code_base64) {
            qrCodeImg.src = `data:image/png;base64,${data.qr_code_base64}`;
        }
        
        if (data.qr_code) {
            pixCodeText.textContent = data.qr_code;
        }
        
        // Mostrar informações do pagamento
        paymentInfo.classList.remove('hidden');
        
        // Verificar se data.id existe antes de usar startsWith
        const isDemo = data.id && data.id.startsWith('DEMO_');
        
        const statusClass = data.status === 'approved' ? 'status-approved' : 
                           isDemo ? 'status-demo' : 'status-pending';
        
        const statusText = data.status === 'approved' ? '✅ Pago' : 
                          isDemo ? '🎭 Demonstração' : '⏳ Aguardando Pagamento';
        
        paymentInfo.innerHTML = `
            <div class="payment-status ${statusClass}">
                ${statusText}
            </div>
            <p><strong>ID do Pagamento:</strong> ${data.id || 'N/A'}</p>
            <p><strong>Valor:</strong> ${formatCurrency(data.amount || 0)}</p>
        `;
        
        // Mostrar simulação se for DEMO
        if (isDemo) {
            simulateSection.classList.remove('hidden');
        }
        
        // Iniciar verificação de status se não for DEMO e ID existir
        if (data.id && !isDemo) {
            startPaymentStatusCheck(data.id);
        }
    }
    
    // Verificar status do pagamento
    function startPaymentStatusCheck(paymentId) {
        currentPaymentId = paymentId;
        
        if (paymentCheckInterval) {
            clearInterval(paymentCheckInterval);
        }
        
        paymentCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/payment-status/${paymentId}`);
                const data = await response.json();
                
                if (data.status === 'approved') {
                    clearInterval(paymentCheckInterval);
                    showNotification('🎉 Pagamento aprovado! Obrigado pela sua doação!');
                    
                    // Atualizar status na interface
                    const statusElement = paymentInfo.querySelector('.payment-status');
                    if (statusElement) {
                        statusElement.className = 'payment-status status-approved';
                        statusElement.textContent = '✅ Pago';
                    }
                    
                    // Recarregar dados
                    loadStats();
                    loadRanking();
                }
            } catch (error) {
                console.error('Erro ao verificar status:', error);
            }
        }, 5000); // Verificar a cada 5 segundos
    }
    
    // Form de doação
    donationForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const amount = document.getElementById('amount').value;
        const donorName = document.getElementById('donor-name').value || 'Apoiador Anônimo';
        const donorEmail = document.getElementById('donor-email').value;
        
        if (!amount || amount <= 0) {
            showNotification('Por favor, insira um valor válido para a doação');
            return;
        }
        
        const generateBtn = document.getElementById('generate-pix-btn');
        generateBtn.disabled = true;
        generateBtn.textContent = 'Gerando PIX...';
        
        try {
            const response = await fetch('/create-pix-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    donor_name: donorName,
                    donor_email: donorEmail
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar PIX');
            }
            
            showQRCode(data);
            showNotification('PIX gerado com sucesso!');
            
        } catch (error) {
            console.error('Erro:', error);
            showNotification('Erro ao gerar PIX: ' + error.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Gerar PIX';
        }
    });
    
    // Copiar código PIX
    copyPixBtn.addEventListener('click', function() {
        const textToCopy = pixCodeText.textContent.trim();
        
        if (!textToCopy) {
            showNotification('Nenhum código PIX para copiar');
            return;
        }
        
        navigator.clipboard.writeText(textToCopy).then(() => {
            // Tocar efeito sonoro
            if (copySound) {
                copySound.currentTime = 0;
                copySound.play().catch(() => {}); // Ignorar erro de áudio
            }
            
            showNotification('Código PIX copiado com sucesso!');
        }).catch(err => {
            console.error('Erro ao copiar texto: ', err);
            showNotification('Erro ao copiar código PIX');
        });
    });
    
    // Simular pagamento (apenas para DEMO)
    if (simulatePaymentBtn) {
        simulatePaymentBtn.addEventListener('click', async function() {
            if (!currentPaymentId || !currentPaymentId.startsWith('DEMO_')) {
                showNotification('Só é possível simular pagamentos DEMO');
                return;
            }
            
            this.disabled = true;
            this.textContent = 'Simulando...';
            
            try {
                const response = await fetch('/simulate-payment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        payment_id: currentPaymentId
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.error || 'Erro ao simular pagamento');
                }
                
                showNotification('🎉 Pagamento simulado com sucesso!');
                
                // Atualizar status na interface
                const statusElement = paymentInfo.querySelector('.payment-status');
                if (statusElement) {
                    statusElement.className = 'payment-status status-approved';
                    statusElement.textContent = '✅ Pago (Simulado)';
                }
                
                // Ocultar botão de simulação
                simulateSection.classList.add('hidden');
                
                // Recarregar dados
                loadStats();
                loadRanking();
                
            } catch (error) {
                console.error('Erro:', error);
                showNotification('Erro ao simular pagamento: ' + error.message);
            } finally {
                this.disabled = false;
                this.textContent = '🎭 Simular Pagamento (DEMO)';
            }
        });
    }
    
    // Carregar dados iniciais
    loadStats();
    loadRanking();
    
    // Atualizar dados a cada 30 segundos
    setInterval(() => {
        loadStats();
        loadRanking();
    }, 30000);
    
    // Efeito de digitação no título (opcional)
    const title = document.querySelector('h1');
    if (title) {
        const originalText = title.textContent;
        title.textContent = '';
        
        let i = 0;
        const typingEffect = setInterval(() => {
            if (i < originalText.length) {
                title.textContent += originalText.charAt(i);
                i++;
            } else {
                clearInterval(typingEffect);
            }
        }, 100);
    }
});
