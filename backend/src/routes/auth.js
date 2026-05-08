const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, full_name, role } = req.body;
  const authHeader = req.headers.authorization;
  
  let finalRole = 'patient';

  // If a token is provided, check if it belongs to a superadmin
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'superadmin' && role === 'admin') {
          finalRole = 'admin';
        }
      }
    } catch (e) {
      // Ignore auth error for public registration, proceed with 'patient' role
    }
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
          role: finalRole
        }
      }
    });

    if (error) throw error;

    // Manually set the role in the profiles table to override the default trigger
    if (finalRole !== 'patient') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: email,
          full_name: full_name,
          role: finalRole
        }, { 
          onConflict: 'id' 
        });
      if (upsertError) {
        console.error('Profile upsert error:', upsertError.message);
      }
    }

    res.json({ success: true, user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    res.json({ success: true, session: data.session, user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// POST /auth/logout
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token provided" });

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    res.json({ user, profile });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

module.exports = router;
