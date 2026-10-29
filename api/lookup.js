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

  // Define potential query format fallbacks for hyphen mismatch parameters
  const targetVariations = [
    cleanIsbn,
    cleanIsbn.length === 13 && cleanIsbn.startsWith('978') ? convertToIsbn10(cleanIsbn) : ''
  ].filter(Boolean);

  // --- TIER 1: MULTI-VARIATION DIRECT FETCH PIPELINE ---
  for (const code of targetVariations) {
    let result = await directLookup(code);
    if (result) return res.status(200).json({ success: true, ...result });
  }

  // --- TIER 2: FUZZY TEXT SEARCH ENGINE FALLBACK (Fixes Black Dogs hyphen issues) ---
  console.log(`Direct lookups empty. Initializing multi-index fuzzy scan for: ${cleanIsbn}`);
  try {
    // OpenLibrary's general search index crawls text context strings and is resilient to formatting hyphens
    const textSearchUrl = `https://openlibrary.org{cleanIsbn}`;
    const searchResponse = await fetch(textSearchUrl);
    
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData && searchData.docs && searchData.docs.length > 0) {
        const item = searchData.docs[0]; // Extract highest statistical index match
        
        return res.status(200).json({
          success: true,
          title: item.title || 'Untitled Book',
          author: item.author_name ? item.author_name.join(', ') : 'Unknown Author',
          published: item.publish_date ? item.publish_date[0] : (item.first_publish_year || 'Unknown Date'),
          image: `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (e) {
    console.error('Fuzzy text search index bypassed:', e.message);
  }

  return res.status(404).json({ 
    success: false, 
    error: `No book records found inside index registries for ISBN: ${cleanIsbn}` 
  });
}

// Separate synchronous routing execution function
async function directLookup(code) {
  // Try Google Books base identity match
  try {
    const response = await fetch(`https://googleapis.com{code}`);
    if (response.ok) {
      const data = await response.json();
      if (data && data.totalItems > 0 && data.items) {
        const info = data.items[0].volumeInfo;
        return {
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          published: info.publishedDate || 'Unknown Date',
          image: info.imageLinks?.thumbnail?.replace('http://', 'https://') || `https://openlibrary.org{code}-M.jpg`
        };
      }
    }
  } catch (e) { console.error('Direct Google check failed:', e.message); }

  // Try OpenLibrary direct registry object match
  try {
    const response = await fetch(`https://openlibrary.org{code}&format=json&jscmd=data`);
    if (response.ok) {
      const data = await response.json();
      const key = `ISBN:${code}`;
      if (data && data[key]) {
        const info = data[key];
        return {
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.map(a => a.name).join(', ') : 'Unknown Author',
          published: info.publish_date || 'Unknown Date',
          image: `https://openlibrary.org{code}-M.jpg`
        };
      }
    }
  } catch (e) { console.error('Direct OpenLibrary check failed:', e.message); }

  return null;
}

// Mathematical legacy string generation module
function convertToIsbn10(isbn13) {
  let start = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(start.charAt(i)) * (10 - i);
  }
  let checksum = 11 - (sum % 11);
  if (checksum === 10) checksum = 'X';
  else if (checksum === 11) checksum = '0';
  return start + checksum;
}
