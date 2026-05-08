const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const supabaseAdmin = require('../config/supabaseAdmin');
const authenticateUser = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');

router.use(authenticateUser);
router.use(adminOnly);

router.get('/alerts', async (req, res) => {
  try {
    const { data, error } = await supabase.from('admin_alerts').select('*').order('detected_at', { ascending: false });
    if (error) throw error;
    res.json({ alerts: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const { error } = await supabase.from('admin_alerts').update({ is_resolved: true }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/batches', async (req, res) => {
  try {
    const { batchNFTContract } = require('../config/blockchain');
    const { data: ownedBatches, error: dbError } = await supabase.from('batches').select('batch_id, on_chain_id, tx_hash, created_at').eq('admin_id', req.user.id);
    if (dbError) throw dbError;
    if (!ownedBatches || ownedBatches.length === 0) return res.json({ batches: [] });
    const batches = await Promise.all(ownedBatches.map(async (record) => {
      try {
        const lookupId = record.on_chain_id || record.batch_id;
        const b = await batchNFTContract.getBatch(lookupId);
        const { count: scanCount } = await supabase.from('scan_history').select('*', { count: 'exact', head: true }).eq('batch_address', record.batch_id);
        const { data: qrData } = await supabase.from('driver_qr_assignments').select('handoff_stage, qr_token, is_used, created_at').eq('batch_address', record.batch_id);
        return {
          batchId: record.batch_id,
          onChainId: lookupId,
          drugName: b.medicineName || b.drugName || b[1],
          activeIngredient: b.activeIngredient || b[2],
          dosage: b.dosage || b[3],
          manufacturer: b.manufacturer || b[4],
          cdscoCertificate: b.cdscoCertificate || b[5],
          manufacturingDate: (b.manufacturingDate || b[6]).toString(),
          expiryDate: (b.expiryDate || b[7]).toString(),
          isRevoked: b.isRevoked || b[8] || false,
          status: b.status || b[9] || 'active',
          scanCount: scanCount || 0,
          supplyChainQRs: qrData || [],
          txHash: record.tx_hash,
          mintedAt: record.created_at
        };
      } catch (err) { return null; }
    }));
    res.json({ batches: batches.filter(b => b !== null) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats', async (req, res) => {
  try {
    const getCount = async (table) => {
      const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count;
    };
    const stats = {
      scans: await getCount('scan_history'),
      users: await getCount('profiles'),
      alerts: await getCount('admin_alerts'),
      prescriptions: await getCount('prescriptions'),
      reports: await getCount('adr_reports')
    };
    res.json(stats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/companies', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('company_name, email, created_at').eq('role', 'admin').not('company_name', 'is', null);
    if (error) throw error;
    const companies = {};
    data.forEach(p => {
      if (!companies[p.company_name]) companies[p.company_name] = { company_name: p.company_name, admin_count: 0 };
      companies[p.company_name].admin_count++;
    });
    res.json({ companies: Object.values(companies) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/global-stats', async (req, res) => {
  try {
    const [{ count: totalScans }, { count: totalAdmins }, { count: totalBatches }, { count: totalAlerts }] = await Promise.all([
      supabase.from('scan_history').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('batches').select('*', { count: 'exact', head: true }),
      supabase.from('admin_alerts').select('*', { count: 'exact', head: true })
    ]);
    res.json({ totalScans: totalScans || 0, totalAdmins: totalAdmins || 0, totalBatches: totalBatches || 0, totalAlerts: totalAlerts || 0, networkIntegrity: '99.9%' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/all-admins', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('profiles').select('id, email, full_name, company_name, role, created_at').eq('role', 'admin').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ admins: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/delete-account/:userId', async (req, res) => {
  try {
    await supabase.from('profiles').delete().eq('id', req.params.userId);
    await supabase.auth.admin.deleteUser(req.params.userId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
