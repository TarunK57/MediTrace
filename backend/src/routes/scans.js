const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');
const { batchNFTContract } = require('../config/blockchain');

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /scans
router.post('/', async (req, res) => {
  try {
    const { batchId, locationLat, locationLng, userId } = req.body;
    
    let result = 'authentic';
    let medicineName = 'Unknown';
    let geminiSummary = '';

    try {
      const batch = await batchNFTContract.getBatch(batchId);
      medicineName = batch.medicineName;
      
      if (batch.status === 'revoked') {
        result = 'revoked';
      } else if (Number(batch.expiryDate) * 1000 < Date.now()) {
        result = 'expired';
      }
    } catch (err) {
      // If batch not found on blockchain
      result = 'flagged';
    }

    const { data, error } = await supabase
      .from('scan_history')
      .insert([{
        user_id: userId || null,
        batch_address: batchId,
        location_lat: locationLat,
        location_lng: locationLng,
        result,
        medicine_name: medicineName,
        gemini_summary: geminiSummary
      }])
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, scanId: data.id, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /scans/history
router.get('/history', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('user_id', req.userId)
      .order('scanned_at', { ascending: false });

    if (error) throw error;
    res.json({ scans: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /scans/duplicate-check/:batchId
router.get('/duplicate-check/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: scans, error } = await supabase
      .from('scan_history')
      .select('*')
      .eq('batch_address', batchId)
      .gt('scanned_at', oneHourAgo);

    if (error) throw error;

    if (scans && scans.length > 1) {
      for (let i = 0; i < scans.length; i++) {
        for (let j = i + 1; j < scans.length; j++) {
          const dist = getDistance(
            scans[i].location_lat, scans[i].location_lng,
            scans[j].location_lat, scans[j].location_lng
          );
          
          if (dist > 200) {
            const { data: alert, error: alertError } = await supabase
              .from('admin_alerts')
              .insert([{
                alert_type: 'duplicate_scan',
                batch_id: batchId,
                details: `Duplicate scans detected ${Math.round(dist)}km apart within 60 mins.`,
                severity: 'high'
              }])
              .select()
              .single();
            
            if (alertError) throw alertError;
            return res.json({ isDuplicate: true, alert });
          }
        }
      }
    }

    res.json({ isDuplicate: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
