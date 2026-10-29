// api/lookup.js
export default async function handler(req, res) {
  // Set explicit security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const { isbn } = req.query;
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  if (!cleanIsbn) {
    return res.status(400).json({ success: false, error: 'Missing valid ISBN string.' });
  }

  // --- PHASE 1: GOOGLE BOOKS (Highly stable on cloud runtimes) ---
  try {
    const googleUrl = `https://googleapis.com{cleanIsbn}`;
    const gResponse = await fetch(googleUrl);
    
    if (gResponse.ok) {
      const gData = await gResponse.json();
      
      if (gData && gData.totalItems > 0 && gData.items && gData.items[0]) {
        const info = gData.items[0].volumeInfo;
        let thumb = '';
        if (info.imageLinks && info.imageLinks.thumbnail) {
          thumb = info.imageLinks.thumbnail.replace('http://', 'https://');
        }

        return res.status(200).json({
          success: true,
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.join(', ') : 'Unknown Author',
          published: info.publishedDate || 'Unknown Date',
          image: thumb || `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (gError) {
    // Log internally to Vercel dashboard console, but don't crash the script execution
    console.error('Google Books fetch execution bypassed:', gError.message);
  }

  // --- PHASE 2: OPEN LIBRARY FALLBACK (Isolated try/catch block) ---
  try {
    const olUrl = `https://openlibrary.org{cleanIsbn}&format=json&jscmd=data`;
    const olResponse = await fetch(olUrl);
    
    if (olResponse.ok) {
      const olData = await olResponse.json();
      const bookKey = `ISBN:${cleanIsbn}`;

      if (olData && olData[bookKey]) {
        const info = olData[bookKey];
        return res.status(200).json({
          success: true,
          title: info.title || 'Untitled Book',
          author: info.authors ? info.authors.map(a => a.name).join(', ') : 'Unknown Author',
          published: info.publish_date || 'Unknown Date',
          image: `https://openlibrary.org{cleanIsbn}-M.jpg`
        });
      }
    }
  } catch (olError) {
    console.error('OpenLibrary fetch execution bypassed:', olError.message);
  }

  // If both network layers complete execution but find nothing
  return res.status(404).json({ 
    success: false, 
    error: `No book records found inside index registries for ISBN: ${cleanIsbn}` 
  });
}
