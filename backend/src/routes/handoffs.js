const express = require('express');
const router = express.Router();
const { handoffContract, signer } = require('../config/blockchain');
const supabase = require('../config/supabase');
const { v4: uuidv4 } = require('uuid');

// POST /handoffs/log
router.post('/log', async (req, res) => {
  try {
    const { 
      batchId, fromEntity, toEntity, fromName, toName, 
      qrToken, locationLat, locationLng 
    } = req.body;

    // Verify the qrToken exists in Supabase driver_qr_assignments and is not already used
    const { data: assignment, error: fetchError } = await supabase
      .from('driver_qr_assignments')
      .select('*')
      .eq('qr_token', qrToken)
      .single();

    if (fetchError || !assignment) {
      return res.status(400).json({ error: "Invalid QR token" });
    }

    if (assignment.is_used) {
      return res.status(400).json({ error: "QR token already used" });
    }

    // Call logHandoff on handoffContract with signer
    const contractWithSigner = handoffContract.connect(signer);
    const tx = await contractWithSigner.logHandoff(
      batchId,
      fromEntity,
      toEntity,
      fromName,
      toName,
      qrToken,
      Math.floor(locationLat), // Ensure int256
      Math.floor(locationLng)
    );

    await tx.wait();

    // Mark the qrToken as used in Supabase
    const { error: updateError } = await supabase
      .from('driver_qr_assignments')
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq('qr_token', qrToken);

    if (updateError) {
      console.error("Supabase Update Error:", updateError.message);
    }

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /handoffs/generate-qr
router.post('/generate-qr', async (req, res) => {
  try {
    const { batchAddress, count = 4, stages = [], extraLabels = [] } = req.body;
    const richTokens = [];
    const assignments = [];
    for (let i = 0; i < count; i++) {
      const qrToken = uuidv4();
      let label;
      
      if (i < stages.length) {
        label = stages[i];
      } else {
        const extraIdx = i - stages.length;
        label = extraLabels[extraIdx] || `Extra ${extraIdx + 1}`;
      }
      
      richTokens.push({
        token: qrToken,
        stage: label,
        batchAddress: batchAddress,
        label: label,
        qrValue: "MEDITRACE_HANDOFF::batch=" + batchAddress + "::stage=" + label + "::token=" + qrToken + "::index=" + i + "::total=" + count
      });
      
      assignments.push({
        batch_address: batchAddress,
        qr_token: qrToken,
        handoff_stage: label,
        is_used: false
      });
    }

    // Store in Supabase
    const { error: insertError } = await supabase
      .from('driver_qr_assignments')
      .insert(assignments);

    if (insertError) throw insertError;

    res.json({ success: true, tokens: richTokens });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
