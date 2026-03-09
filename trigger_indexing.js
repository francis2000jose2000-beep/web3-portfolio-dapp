
fetch('http://localhost:3001/api/nfts/index/external', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
