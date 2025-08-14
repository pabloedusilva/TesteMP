const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/recent-donations',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      console.log(`\n✅ Total de registros: ${jsonData.length}`);
    } catch (err) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`Erro na requisição: ${e.message}`);
});

req.end();
