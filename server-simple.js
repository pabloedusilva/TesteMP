require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000
  }
});

const payment = new Payment(client);

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar pagamento PIX - Versão Simplificada
app.post('/create-pix-payment', async (req, res) => {
  try {
    const { amount, donor_name, donor_email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    // Versão mais simples - sem identificação obrigatória
    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: `Doação PIX - R$ ${amount}`,
      payment_method_id: 'pix',
      payer: {
        email: donor_email || `test${Date.now()}@test.com`,
      }
    };

    console.log('💰 Criando pagamento PIX:', paymentData);

    const paymentResponse = await payment.create({ body: paymentData });
    
    console.log('✅ Resposta do Mercado Pago:', {
      id: paymentResponse.id,
      status: paymentResponse.status
    });
    
    if (!paymentResponse.id) {
      throw new Error('Falha ao criar pagamento');
    }

    // Salvar no banco
    const stmt = db.prepare(`
      INSERT INTO donations (payment_id, donor_name, donor_email, amount, pix_qr_code, pix_qr_code_base64)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      paymentResponse.id.toString(),
      donor_name || 'Doador Anônimo',
      donor_email || '',
      parseFloat(amount),
      paymentResponse.point_of_interaction?.transaction_data?.qr_code || '',
      paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64 || ''
    ]);

    stmt.finalize();

    res.json({
      success: true,
      payment_id: paymentResponse.id,
      qr_code: paymentResponse.point_of_interaction?.transaction_data?.qr_code,
      qr_code_base64: paymentResponse.point_of_interaction?.transaction_data?.qr_code_base64,
      amount: amount,
      status: paymentResponse.status
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    
    res.status(500).json({ 
      error: 'Erro ao criar pagamento PIX',
      details: error.message,
      mp_error: error.cause || null
    });
  }
});

// Verificar status do pagamento
app.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const paymentInfo = await payment.get({ id: paymentId });
    
    if (paymentInfo.status === 'approved') {
      const stmt = db.prepare(`
        UPDATE donations 
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
        WHERE payment_id = ? AND status != 'paid'
      `);
      stmt.run([paymentId.toString()]);
      stmt.finalize();
    }
    
    res.json({
      status: paymentInfo.status,
      payment_id: paymentId
    });
    
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// Webhook
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    if (type === 'payment') {
      const paymentInfo = await payment.get({ id: data.id });
      if (paymentInfo.status === 'approved') {
        const stmt = db.prepare(`
          UPDATE donations 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
          WHERE payment_id = ?
        `);
        stmt.run([data.id.toString()]);
        stmt.finalize();
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).send('Erro');
  }
});

// Ranking das doações
app.get('/ranking', (req, res) => {
  const query = `
    SELECT 
      donor_name,
      SUM(amount) as total_amount,
      COUNT(*) as donation_count,
      MAX(paid_at) as last_donation
    FROM donations 
    WHERE status = 'paid'
    GROUP BY donor_name
    ORDER BY total_amount DESC
    LIMIT 10
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar ranking' });
    }
    res.json(rows);
  });
});

// Lista de doações
app.get('/donations', (req, res) => {
  const query = `
    SELECT donor_name, amount, paid_at, status
    FROM donations 
    WHERE status = 'paid'
    ORDER BY paid_at DESC
    LIMIT 50
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar doações' });
    }
    res.json(rows);
  });
});

// Estatísticas
app.get('/stats', (req, res) => {
  const query = `
    SELECT 
      COUNT(*) as total_donations,
      SUM(amount) as total_amount,
      AVG(amount) as average_amount,
      MAX(amount) as highest_donation
    FROM donations 
    WHERE status = 'paid'
  `;

  db.get(query, [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
    res.json(row || {
      total_donations: 0,
      total_amount: 0,
      average_amount: 0,
      highest_donation: 0
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`💰 Access Token: ${process.env.MP_ACCESS_TOKEN ? '✅ OK' : '❌ MISSING'}`);
  console.log(`🔑 Public Key: ${process.env.MP_PUBLIC_KEY ? '✅ OK' : '❌ MISSING'}`);
});
