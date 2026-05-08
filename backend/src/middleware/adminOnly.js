const supabase = require('../config/supabase');
const adminOnly = async (req, res, next) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', req.userId)
      .single();
    if (error || !profile || !['admin', 'superadmin'].includes(profile.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  } catch (err) {
    res.status(403).json({ error: "Forbidden" });
  }
};
module.exports = adminOnly;
