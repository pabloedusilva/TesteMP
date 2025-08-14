require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurar Mercado Pago - Versão Compatível
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar pagamento PIX - Versão que funciona 100%
app.post('/create-pix-payment', async (req, res) => {
  try {
    const { amount, donor_name, donor_email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const paymentData = {
      transaction_amount: parseFloat(amount),
      description: `Doação de ${donor_name || 'Doador Anônimo'}`,
      payment_method_id: 'pix',
      payer: {
        email: donor_email || `doador${Date.now()}@test.com`,
        first_name: donor_name || 'Doador',
        last_name: 'Anônimo'
      }
    };

    console.log('💰 Criando pagamento PIX:', paymentData);

    const payment = await mercadopago.payment.create(paymentData);
    
    console.log('✅ Pagamento criado:', {
      id: payment.body.id,
      status: payment.body.status,
      qr_code: payment.body.point_of_interaction?.transaction_data?.qr_code ? '✅' : '❌'
    });

    // Salvar no banco
    const stmt = db.prepare(`
      INSERT INTO donations (payment_id, donor_name, donor_email, amount, pix_qr_code, pix_qr_code_base64)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const paymentId = payment.body.id.toString();
    const qrCode = payment.body.point_of_interaction?.transaction_data?.qr_code || '';
    const qrCodeBase64 = payment.body.point_of_interaction?.transaction_data?.qr_code_base64 || '';

    stmt.run([
      paymentId,
      donor_name || 'Doador Anônimo',
      donor_email || '',
      parseFloat(amount),
      qrCode,
      qrCodeBase64
    ]);

    stmt.finalize();

    res.json({
      success: true,
      payment_id: paymentId,
      qr_code: qrCode,
      qr_code_base64: qrCodeBase64,
      amount: amount,
      status: payment.body.status
    });

  } catch (error) {
    console.error('❌ Erro ao criar pagamento PIX:', error);
    
    res.status(500).json({ 
      error: 'Erro ao criar pagamento PIX',
      details: error.message,
      mp_error: error.response?.data || null
    });
  }
});

// Verificar status do pagamento
app.get('/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await mercadopago.payment.get(paymentId);
    
    if (payment.body.status === 'approved') {
      const stmt = db.prepare(`
        UPDATE donations 
        SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
        WHERE payment_id = ? AND status != 'paid'
      `);
      stmt.run([paymentId]);
      stmt.finalize();
      console.log(`✅ Pagamento ${paymentId} aprovado!`);
    }
    
    res.json({
      status: payment.body.status,
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
      const payment = await mercadopago.payment.get(data.id);
      
      if (payment.body.status === 'approved') {
        const stmt = db.prepare(`
          UPDATE donations 
          SET status = 'paid', paid_at = CURRENT_TIMESTAMP 
          WHERE payment_id = ?
        `);
        stmt.run([data.id.toString()]);
        stmt.finalize();
        console.log(`🎉 Webhook: Pagamento ${data.id} aprovado!`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
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
      console.error('Erro ao buscar ranking:', err);
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
      console.error('Erro ao buscar doações:', err);
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
      console.error('Erro ao buscar estatísticas:', err);
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
  console.log(`💰 Mercado Pago: ${process.env.MP_ACCESS_TOKEN ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`🔥 Sistema pronto para receber doações PIX!`);
});
