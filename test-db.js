const Database = require('better-sqlite3');

try {
    const db = new Database('./donations.db');
    
    console.log('=== TESTANDO BANCO DE DADOS ===');
    
    // Verificar doações pagas
    const paidCount = db.prepare('SELECT COUNT(*) as total FROM donations WHERE status = ?').get('paid');
    console.log('Doações pagas:', paidCount.total);
    
    if (paidCount.total > 0) {
        // Mostrar doações pagas
        const paidDonations = db.prepare('SELECT donor_name, amount, status, paid_at FROM donations WHERE status = ? ORDER BY paid_at DESC LIMIT 5').all('paid');
        console.log('\nÚltimas doações pagas:');
        paidDonations.forEach((donation, index) => {
            console.log(`${index + 1}. ${donation.donor_name} - R$ ${donation.amount} - ${donation.paid_at}`);
        });
    }
    
    // Testar endpoint de recent-donations
    const recentQuery = `
        SELECT donor_name, amount, paid_at, status,
               ROW_NUMBER() OVER (ORDER BY amount DESC) as position
        FROM donations 
        WHERE status = 'paid'
        ORDER BY paid_at DESC
        LIMIT 20
    `;
    
    const recentDonations = db.prepare(recentQuery).all();
    console.log('\nDados para recent-donations:', recentDonations.length, 'registros');
    
    db.close();
    console.log('\n✅ Teste concluído!');
    
} catch (error) {
    console.error('❌ Erro ao testar banco:', error.message);
}
