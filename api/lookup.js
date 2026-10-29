// api/lookup.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const { isbn } = req.query;
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  if (!cleanIsbn) {
    return res.status(400).json({ success: false, error: 'Missing valid ISBN identifier string.' });
  }

  // --- TIER 1: RAW INTENT STRING KEYWORD SCAN (Fixes Vintage Paperback matching) ---
  try {
    // Dropping 'isbn:' prefix forces Google to query the full barcode metadata string index
    const keywordUrl = `https://googleapis.com{cleanIsbn}`;
    const response = await fetch(keywordUrl);
    
    if (response.ok) {
      const data = await response.json();
      if (data && data.totalItems > 0 && data.items) {
        const info = data.items[0].volumeInfo; // Extract highest statistical index match
        let thumb = info.imageLinks?.thumbnail || '';
        
        return res.status(200).json({
          success: true,
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          published: info.publishedDate || 'Unknown Date',
          image: thumb.replace('http://', 'https://') || `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) { console.error('Keyword fallback search skipped:', e.message); }

  // --- TIER 2: STRICT IDENTIFIER PATTERN SCAN ---
  try {
    const directUrl = `https://googleapis.com{cleanIsbn}`;
    const response = await fetch(directUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && data.totalItems > 0 && data.items) {
        const info = data.items[0].volumeInfo;
        let thumb = info.imageLinks?.thumbnail || '';
        return res.status(200).json({
          success: true,
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          published: info.publishedDate || 'Unknown Date',
          image: thumb.replace('http://', 'https://') || `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) { console.error('Strict ID lookup skipped:', e.message); }

  // --- TIER 3: OPEN LIBRARY GENERAL TERM SEARCH ---
  try {
    const searchResponse = await fetch(`https://openlibrary.org{cleanIsbn}`);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData && searchData.docs && searchData.docs.length > 0) {
        const item = searchData.docs[0];
        return res.status(200).json({
          success: true,
          title: item.title || 'Unknown Title',
          author: item.author_name ? item.author_name.join(', ') : 'Unknown Author',
          published: item.publish_date ? item.publish_date[0] : (item.first_publish_year || 'Unknown Date'),
          image: `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) { console.error('Fuzzy OpenLibrary check skipped:', e.message); }

  return res.status(404).json({ 
    success: false, 
    error: `No book records found inside index registries for ISBN: ${cleanIsbn}` 
  });
}
