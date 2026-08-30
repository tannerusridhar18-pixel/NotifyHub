(async () => {
  const b64 = Buffer.from('admin@notifyhub.edu:Admin@1234').toString('base64');
  try {
    const res = await fetch('http://localhost:8080/api/announcements', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + b64,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Smoke Test',
        description: 'smoke',
        category: 'General',
        department: 'All',
        date: '2026-08-13'
      })
    });

    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body:', text);
  } catch (e) {
    console.error('Request failed', e);
    process.exitCode = 2;
  }
})();
