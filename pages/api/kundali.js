// pages/api/kundali.js
import { getAllKundaliData } from '../../lib/astrologyApi';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, day, month, year, hour, minute, lat, lon, tzone, pob } = req.body;

  if (!day || !month || !year || !hour || minute === undefined || !lat || !lon) {
    return res.status(400).json({ error: 'Missing required birth data fields' });
  }

  try {
    const birthData = {
      day: parseInt(day),
      month: parseInt(month),
      year: parseInt(year),
      hour: parseInt(hour),
      minute: parseInt(minute),
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      tzone: parseFloat(tzone || 5.5),
    };

    const kundaliData = await getAllKundaliData(birthData);

    // basic validation – the planets endpoint should return an array
    if (!kundaliData || !Array.isArray(kundaliData.planets)) {
      const reason =
        kundaliData && typeof kundaliData === 'object'
          ? JSON.stringify(kundaliData)
          : 'unknown';
      console.error('Invalid astrology API response:', reason);
      return res.status(502).json({
        error:
          'Unable to fetch valid kundali data. Please check your Astrology API key/user ID and try again.',
        details: reason,
      });
    }

    return res.status(200).json({
      success: true,
      data: kundaliData,
      userInfo: { name, dob: `${day}/${month}/${year}`, tob: `${hour}:${minute < 10 ? '0' + minute : minute}`, pob },
    });
  } catch (error) {
    console.error('Kundali fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch kundali data' });
  }
}
