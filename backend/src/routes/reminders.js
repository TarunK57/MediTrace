const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const authenticateUser = require('../middleware/auth');

// All routes in this file require authentication
router.use(authenticateUser);

// GET /reminders
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', req.userId);
    
    if (error) throw error;
    res.json({ reminders: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /reminders
router.post('/', async (req, res) => {
  try {
    const { medicine_name, prescription_id, remind_at, frequency } = req.body;
    
    const { data, error } = await supabase
      .from('reminders')
      .insert([{
        user_id: req.userId,
        medicine_name,
        prescription_id: prescription_id || null,
        remind_at,
        frequency,
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, reminder: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /reminders/:id/toggle
router.put('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;

    // Get current state first
    const { data: current, error: fetchError } = await supabase
      .from('reminders')
      .select('is_active')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single();

    if (fetchError || !current) {
      return res.status(404).json({ error: "Reminder not found or unauthorized" });
    }

    const { data, error } = await supabase
      .from('reminders')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, is_active: data.is_active });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /reminders/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
