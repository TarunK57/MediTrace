const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');

// All routes in this file require authentication
router.use(authenticateUser);

// GET /prescriptions
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ prescriptions: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /prescriptions
router.post('/', async (req, res) => {
  try {
    const { 
      medicine_name, batch_address, dosage, 
      prescribed_by, start_date, end_date, notes 
    } = req.body;

    const { data, error } = await supabase
      .from('prescriptions')
      .insert([{
        user_id: req.userId,
        medicine_name,
        batch_address,
        dosage,
        prescribed_by,
        start_date,
        end_date,
        notes
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, prescription: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /prescriptions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('prescriptions')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Prescription not found or unauthorized" });
    
    res.json({ success: true, prescription: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /prescriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('prescriptions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId)
      .select();

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
