const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');

// POST /adr
router.post('/', async (req, res) => {
  try {
    const { 
      batch_address, medicine_name, 
      reaction_description, severity, userId 
    } = req.body;
    
    const { data: report, error } = await supabase
      .from('adr_reports')
      .insert([{
        user_id: userId || null,
        batch_address,
        medicine_name,
        reaction_description,
        severity
      }])
      .select()
      .single();

    if (error) throw error;

    // Check for cluster (3 or more ADRs for this batch)
    const { count, error: countError } = await supabase
      .from('adr_reports')
      .select('*', { count: 'exact', head: true })
      .eq('batch_address', batch_address);

    let clusterAlert = null;
    if (count >= 3) {
      // Check if alert already exists to avoid spamming
      const { data: existingAlert } = await supabase
        .from('admin_alerts')
        .select('*')
        .eq('alert_type', 'adr_cluster')
        .eq('batch_id', batch_address)
        .eq('is_resolved', false)
        .maybeSingle();

      if (!existingAlert) {
        const { data: alert } = await supabase
          .from('admin_alerts')
          .insert([{
            alert_type: 'adr_cluster',
            batch_id: batch_address,
            details: `3+ ADRs reported for batch ${batch_address}`,
            severity: 'critical'
          }])
          .select()
          .single();
        clusterAlert = alert;
      }
    }

    res.json({ success: true, reportId: report.id, clusterAlert });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /adr/batch/:batchAddress
router.get('/batch/:batchAddress', async (req, res) => {
  try {
    const { batchAddress } = req.params;
    const { data, error } = await supabase
      .from('adr_reports')
      .select('*')
      .eq('batch_address', batchAddress);
    
    if (error) throw error;
    res.json({ reports: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /adr/my-reports
router.get('/my-reports', authenticateUser, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('adr_reports')
      .select('*')
      .eq('user_id', req.userId);
    
    if (error) throw error;
    res.json({ reports: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
