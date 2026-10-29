// api/lookup.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const { isbn } = req.query;
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  if (!cleanIsbn) {
    return res.status(400).json({ success: false, error: 'Missing valid ISBN string.' });
  }

  const requestHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  };

  // --- TIER 1: GOOGLE BOOKS STRICT ISBN ---
  try {
    const response = await fetch(`https://googleapis.com{cleanIsbn}`, { headers: requestHeaders });
    if (response.ok) {
      const data = await response.json();
      if (data && data.totalItems > 0 && data.items && data.items[0]) {
        const info = data.items[0].volumeInfo; // Fixed: Added [0] index
        return res.status(200).json({
          success: true,
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          published: info.publishedDate || 'Unknown Date',
          image: info.imageLinks?.thumbnail?.replace('http://', 'https://') || `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) { console.error('Tier 1 error:', e.message); }

  // --- TIER 2: GOOGLE BOOKS GENERAL KEYWORD ---
  try {
    const response = await fetch(`https://googleapis.com{cleanIsbn}`, { headers: requestHeaders });
    if (response.ok) {
      const data = await response.json();
      if (data && data.totalItems > 0 && data.items && data.items[0]) {
        const info = data.items[0].volumeInfo; // Fixed: Added [0] index
        return res.status(200).json({
          success: true,
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          published: info.publishedDate || 'Unknown Date',
          image: info.imageLinks?.thumbnail?.replace('http://', 'https://') || `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) { console.error('Tier 2 error:', e.message); }

  // --- TIER 3: OPEN LIBRARY FUZZY SEARCH ---
  try {
    const response = await fetch(`https://openlibrary.org{cleanIsbn}`, { headers: requestHeaders });
    if (response.ok) {
      const data = await response.json();
      if (data && data.docs && data.docs.length > 0 && data.docs[0]) {
        const item = data.docs[0]; // Fixed: Added [0] index
        return res.status(200).json({
          success: true,
          title: item.title || 'Unknown Title',
          author: item.author_name ? item.author_name.join(', ') : 'Unknown Author',
          published: item.publish_date ? item.publish_date[0] : (item.first_publish_year || 'Unknown Date'),
          image: `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) { console.error('Tier 3 error:', e.message); }

  return res.status(404).json({ 
    success: false, 
    error: `No book records found inside index registries for ISBN: ${cleanIsbn}` 
  });
}
