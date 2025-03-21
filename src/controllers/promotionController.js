const Promotion = require('../models/promotion');

// Get all active promotions
exports.getPromotions = async (req, res) => {
  try {
    console.log('Fetching promotions from database...');
    
    // Use the native MongoDB driver to query the collection directly
    // This bypasses Mongoose's schema validation
    const db = Promotion.db;
    const promotionsCollection = db.collection('promotions');
    const promotions = await promotionsCollection.find().toArray();
    
    console.log('Found promotions:', JSON.stringify(promotions));
    
    res.status(200).json({
      success: true,
      count: promotions.length,
      data: promotions
    });
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Get a single promotion by ID
exports.getPromotionById = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({
        success: false,
        error: 'Promotion not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: promotion
    });
  } catch (error) {
    console.error('Error fetching promotion:', error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};
