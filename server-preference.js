require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const db = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configurar Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
});

const preference = new Preference(client);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Criar preferência de pagamento PIX
app.post('/create-pix-payment', async (req, res) => {
  try {
    const { amount, donor_name, donor_email } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }

    const preferenceData = {
      items: [{
        title: `Doação de ${donor_name || 'Doador Anônimo'}`,
        unit_price: parseFloat(amount),
        quantity: 1,
      }],
      payer: {
        name: donor_name || 'Doador Anônimo',
        email: donor_email || `test${Date.now()}@test.com`,
      },
      payment_methods: {
        excluded_payment_types: [
          { id: "credit_card" },
          { id: "debit_card" },
          { id: "ticket" }
        ],
        excluded_payment_methods: [],
        installments: 1
      },
      auto_return: "approved",
      external_reference: `donation_${Date.now()}`
    };

    console.log('🎯 Criando preferência:', preferenceData);

    const preferenceResponse = await preference.create({ body: preferenceData });
    
    console.log('✅ Preferência criada:', preferenceResponse.id);

    // Salvar no banco
    const stmt = db.prepare(`
      INSERT INTO donations (payment_id, donor_name, donor_email, amount, pix_qr_code, pix_qr_code_base64)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      preferenceResponse.id,
      donor_name || 'Doador Anônimo',
      donor_email || '',
      parseFloat(amount),
      preferenceResponse.init_point || '',
      ''
    ]);

    stmt.finalize();

    res.json({
      success: true,
      preference_id: preferenceResponse.id,
      init_point: preferenceResponse.init_point,
      sandbox_init_point: preferenceResponse.sandbox_init_point,
      amount: amount
    });

  } catch (error) {
    console.error('❌ Erro ao criar preferência:', error);
    res.status(500).json({ 
      error: 'Erro ao criar preferência de pagamento',
      details: error.message
    });
  }
});

// Rotas existentes...
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
  console.log(`💰 Mercado Pago configurado: ${process.env.MP_ACCESS_TOKEN ? '✅' : '❌'}`);
});
