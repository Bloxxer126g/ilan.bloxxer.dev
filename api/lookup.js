// api/lookup.js
export default async function handler(req, res) {
  // Enforce proper header security rules natively
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  const { isbn } = req.query;
  const cleanIsbn = isbn ? isbn.replace(/[^0-9X]/gi, '') : '';

  if (!cleanIsbn) {
    return res.status(400).json({ success: false, error: 'Missing valid ISBN string.' });
  }

  try {
    // Phase 1: Request against OpenLibrary directly from Vercel compute infrastructure
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

    // Phase 2: Fallback query sequence via Google Books database if OpenLibrary is missing records
    const googleUrl = `https://googleapis.com{cleanIsbn}`;
    const gResponse = await fetch(googleUrl);
    
    if (gResponse.ok) {
      const gData = await gResponse.json();
      
      if (gData.totalItems > 0 && gData.items) {
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

    return res.status(404).json({ success: false, error: 'Book records not found inside indices.' });

  } catch (err) {
    return res.status(500).json({ success: false, error: 'Serverless processing node encountered an error.' });
  }
}
