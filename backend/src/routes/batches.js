const express = require('express');
const router = express.Router();
const { batchNFTContract, handoffContract, coldChainContract, signer } = require('../config/blockchain');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require('../config/supabase');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

// POST /batches/mint
const authenticateUser = require('../middleware/auth');
router.post('/mint', authenticateUser, async (req, res) => {
  try {
    const { 
      batchId, medicineName, activeIngredient, dosage, 
      manufacturer, cdscoCertificate, manufacturingDate, expiryDate,
      companyName
    } = req.body;

    const onChainBatchId = req.user.id.slice(0, 8) + '_' + batchId;

    const contractWithSigner = batchNFTContract.connect(signer);
    const tx = await contractWithSigner.mintBatch(
      onChainBatchId, 
      medicineName, 
      activeIngredient, 
      dosage, 
      manufacturer, 
      cdscoCertificate, 
      manufacturingDate, 
      expiryDate
    );

    await tx.wait();

    // Store batch ownership in Supabase
    const { error: dbError } = await supabase
      .from('batches')
      .insert({
        batch_id: batchId,
        on_chain_id: onChainBatchId,
        admin_id: req.user.id,
        tx_hash: tx.hash,
        company_name: companyName || manufacturer
      });
    if (dbError) console.error('Supabase batch save error:', dbError.message);

    res.json({ success: true, txHash: tx.hash, batchId, onChainBatchId, companyName: companyName || manufacturer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batchId
router.get('/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const companyName = req.query.company;

    // Check if this batch has a unique on-chain ID
    let query = supabase.from('batches').select('on_chain_id, company_name');
    if (companyName) {
      query = query.eq('batch_id', batchId).eq('company_name', companyName);
    } else {
      query = query.eq('batch_id', batchId);
    }
    
    const { data: batchRecord } = await query.single();
    const lookupId = batchRecord?.on_chain_id || batchId;

    // Read from contracts (no signer needed for view functions)
    const batchData = await batchNFTContract.getBatch(lookupId);
    const handoffs = await handoffContract.getHandoffs(lookupId);
    const isBreached = await coldChainContract.isBreached(lookupId);

    // Convert ethers Result to a plain object for easier consumption
    const batch = {
      batchId: batchData.batchId,
      medicineName: batchData.medicineName,
      activeIngredient: batchData.activeIngredient,
      dosage: batchData.dosage,
      manufacturer: batchData.manufacturer,
      cdscoCertificate: batchData.cdscoCertificate,
      manufacturingDate: batchData.manufacturingDate.toString(),
      expiryDate: batchData.expiryDate.toString(),
      status: batchData.status,
      mintedBy: batchData.mintedBy,
      companyName: batchRecord?.company_name || ''
    };

    // Call Gemini API for medicine description
    let geminiSummary = "Medicine description unavailable at this time.";
    try {
      // Check Supabase cache first
      const { data: cached } = await supabase
        .from('scan_history')
        .select('gemini_summary')
        .eq('batch_address', batchId)
        .not('gemini_summary', 'is', null)
        .limit(1)
        .single();

      if (cached?.gemini_summary) {
        geminiSummary = cached.gemini_summary;
      } else {
        const prompt = `In exactly one sentence, describe what ${batch.medicineName} is used for medically.`;
        const result = await model.generateContent(prompt);
        geminiSummary = result.response.text().trim();
      }
    } catch (geminiErr) {
      console.error("Gemini API Error:", geminiErr.message);
    }

    res.json({ 
      batch, 
      handoffs: handoffs.map(h => ({
        batchId: h.batchId,
        fromEntity: h.fromEntity,
        toEntity: h.toEntity,
        fromName: h.fromName,
        toName: h.toName,
        qrToken: h.qrToken,
        timestamp: h.timestamp.toString(),
        locationLat: h.locationLat.toString(),
        locationLng: h.locationLng.toString()
      })), 
      isBreached, 
      geminiSummary 
    });
  } catch (err) {
    if (err.message?.includes('Batch not found') || 
        err.message?.includes('execution reverted')) {
      res.status(404).json({ error: 'Batch not found. Please check the Batch ID and Company Name.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// POST /batches/:batchId/revoke
router.post('/:batchId/revoke', async (req, res) => {
  try {
    const { batchId } = req.params;

    const { data: batchRecord } = await supabase
      .from('batches')
      .select('on_chain_id')
      .eq('batch_id', batchId)
      .single();
    
    const lookupId = batchRecord?.on_chain_id || batchId;

    const contractWithSigner = batchNFTContract.connect(signer);
    const tx = await contractWithSigner.revokeBatch(lookupId);
    await tx.wait();
    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /batches/:batchId
router.delete('/:batchId', authenticateUser, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { error } = await supabase
      .from('batches')
      .delete()
      .eq('batch_id', batchId)
      .eq('admin_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batchId/handoffs
router.get('/:batchId/handoffs', async (req, res) => {
  try {
    const { batchId } = req.params;
    const handoffs = await handoffContract.getHandoffs(batchId);
    res.json({ 
      handoffs: handoffs.map(h => ({
        batchId: h.batchId,
        fromEntity: h.fromEntity,
        toEntity: h.toEntity,
        fromName: h.fromName,
        toName: h.toName,
        qrToken: h.qrToken,
        timestamp: h.timestamp.toString(),
        locationLat: h.locationLat.toString(),
        locationLng: h.locationLng.toString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/:batchId/temperature
router.get('/:batchId/temperature', async (req, res) => {
  try {
    const { batchId } = req.params;
    const readings = await coldChainContract.getReadings(batchId);
    const isBreached = await coldChainContract.isBreached(batchId);
    res.json({ 
      readings: readings.map(r => ({
        batchId: r.batchId,
        temperature: r.temperature.toString(),
        location: r.location,
        sensorId: r.sensorId,
        timestamp: r.timestamp.toString(),
        isAnomaly: r.isAnomaly
      })), 
      isBreached 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /batches/:batchId/temperature
router.post('/:batchId/temperature', async (req, res) => {
  try {
    const { batchId } = req.params;
    const { temperature, location, sensorId, isAnomaly } = req.body;

    const contractWithSigner = coldChainContract.connect(signer);
    const tx = await contractWithSigner.logTemperature(
      batchId,
      temperature,
      location,
      sensorId,
      isAnomaly
    );

    await tx.wait();

    // If isAnomaly is true, create a record in Supabase admin_alerts table
    if (isAnomaly) {
      const { error: supabaseError } = await supabase
        .from('admin_alerts')
        .insert([
          { 
            batch_id: batchId, 
            alert_type: 'Temperature Breach', 
            details: `Temperature reading of ${temperature}°C detected at ${location} by sensor ${sensorId}`,
            severity: 'critical'
          }
        ]);
      
      if (supabaseError) {
        console.error("Supabase Admin Alert Error:", supabaseError.message);
      }
    }

    res.json({ success: true, txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /batches/search/:medicineName
router.get('/search/:medicineName', async (req, res) => {
  try {
    const { medicineName } = req.params;
    
    // Find distinct batch_addresses from scan_history where medicine_name matches
    const { data: scans, error } = await supabase
      .from('scan_history')
      .select('batch_address, medicine_name')
      .ilike('medicine_name', `%${medicineName}%`);

    if (error) throw error;

    // Get unique batch addresses
    const uniqueAddresses = [...new Set(scans.map(s => s.batch_address))];

    const results = [];
    for (const addr of uniqueAddresses) {
      try {
        const batchData = await batchNFTContract.getBatch(addr);
        results.push({
          batchId: batchData.batchId,
          medicineName: batchData.medicineName,
          manufacturer: batchData.manufacturer,
          status: batchData.status,
          expiryDate: batchData.expiryDate.toString()
        });
      } catch (blockchainErr) {
        console.error(`Blockchain fetch failed for ${addr}:`, blockchainErr.message);
      }
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
