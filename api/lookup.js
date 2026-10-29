// api/lookup.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const { isbn } = req.query;
  let cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  if (!cleanIsbn) {
    return res.status(400).json({ success: false, error: 'Missing valid ISBN string.' });
  }

  // Generate an alternative 10-digit search parameter if a 13-digit code is provided
  let fallbackIsbn = '';
  if (cleanIsbn.length === 13 && cleanIsbn.startsWith('978')) {
    fallbackIsbn = convertToIsbn10(cleanIsbn);
  }

  // --- RUN LOOKUP PIPELINE ---
  let bookData = await queryRegistries(cleanIsbn);
  
  // If the 13-digit lookup yields nothing, re-run using the 10-digit format
  if (!bookData && fallbackIsbn) {
    console.log(`Re-querying index registries with 10-digit fallback: ${fallbackIsbn}`);
    bookData = await queryRegistries(fallbackIsbn);
  }

  if (bookData) {
    // Keep cover mapping tied to the primary scanned value for structural consistency
    if (!bookData.image || bookData.image.includes('placeholder')) {
      bookData.image = `https://openlibrary.org{cleanIsbn}-M.jpg`;
    }
    return res.status(200).json({ success: true, ...bookData });
  }

  return res.status(404).json({ 
    success: false, 
    error: `No book records found inside index registries for ISBN: ${cleanIsbn}` 
  });
}

// Master query utility encapsulating multi-tier endpoints
async function queryRegistries(code) {
  // 1. Google Books Endpoint
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
          image: info.imageLinks?.thumbnail?.replace('http://', 'https://') || ''
        };
      }
    }
  } catch (e) { console.error('Google Books failed:', e.message); }

  // 2. OpenLibrary Endpoint
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
  } catch (e) { console.error('OpenLibrary failed:', e.message); }

  return null;
}

// Math conversion utility calculation (978-to-10-Digit checksum generator)
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
