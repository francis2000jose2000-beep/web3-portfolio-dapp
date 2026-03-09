
fetch('http://localhost:3001/api/nfts/indexed-collections')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
