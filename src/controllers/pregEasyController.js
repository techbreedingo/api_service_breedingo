const pregEasy = require('../models/pregEasy')
const userCoin = require('../models/userCoin')
const userTransactions = require('../models/userTransactions')

const getCurrentDateTime = () => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, '0');
  const day = String(currentDate.getDate()).padStart(2, '0');
  const hours = String(currentDate.getHours()).padStart(2, '0');
  const minutes = String(currentDate.getMinutes()).padStart(2, '0');
  const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  
  const formattedDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  return formattedDateTime;
}

const addPregEasyData = async (request, response) => {
  try {
    const CreatePregEasy_Price = Number(process.env.CreatePregEasy_Price);
    const { userId } = request.user;
    
    // Check if user has enough coins
    const userCoinData = await userCoin.findOne({ userId });
    if (!userCoinData) {
      return response.status(404).json({ 
        success: false,
        message: "User coin record not found" 
      });
    }

    if (userCoinData.totalCoin - CreatePregEasy_Price < 0) {
      return response.status(403).json({
        success: false,
        message: "Insufficient balance",
        totalCoin: userCoinData.totalCoin,
        price: CreatePregEasy_Price
      });
    }

    // Parse and validate the date
    const dateOfLastDelivery = request.body.dateOfLastDelivery;
    let parsedDate;
    
    if (dateOfLastDelivery.includes('T')) {
      // Handle ISO format
      parsedDate = new Date(dateOfLastDelivery);
    } else {
      // Handle YYYY-MM-DD format
      const [year, month, day] = dateOfLastDelivery.split('-');
      parsedDate = new Date(year, parseInt(month) - 1, day);
    }

    if (isNaN(parsedDate.getTime())) {
      return response.status(400).json({
        success: false,
        message: "Invalid date format",
        errors: [{
          field: "dateOfLastDelivery",
          message: "Invalid date format. Please use YYYY-MM-DD format"
        }]
      });
    }

    // Create new cattle record with parsed date
    const pregEasyData = new pregEasy({
      ...request.body,
      userId,
      dateOfLastDelivery: parsedDate,
      type: request.body.type.toLowerCase()
    });
    
    // Save the cattle record
    await pregEasyData.save();

    // Update user's coin balance
    userCoinData.totalCoin = userCoinData.totalCoin - CreatePregEasy_Price;
    await userCoinData.save();

    // Record the transaction
    const userTransactionsModel = new userTransactions({
      userId: userId,
      transactionAmount: CreatePregEasy_Price,
      transactionType: "debited",
      transactionDescription: "Create PregEasy Cattle Events",
      transactionDate: new Date(),
    });
    await userTransactionsModel.save();

    response.status(200).json({
      success: true,
      message: "Cattle registered successfully",
      data: {
        _id: pregEasyData._id,
        pregEasyId: pregEasyData.pregEasyId,
        tagNumber: pregEasyData.tagNumber
      }
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return response.status(400).json({
        success: false,
        message: "Validation Error",
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return response.status(400).json({
        success: false,
        message: "Tag number already exists",
        field: Object.keys(error.keyPattern)[0]
      });
    }

    // Handle other errors
    console.error('Error in addPregEasyData:', error);
    response.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getUserAllPregEasyData = async (request, response) => {
  try {
    const userId = request.user.userId;
    const pregEasyList = await pregEasy.find({ userId })
      .select('-__v')
      .sort({ createdAt: -1 });

    response.status(200).json({
      success: true,
      count: pregEasyList.length,
      data: pregEasyList
    });
  } catch (error) {
    console.error('Error in getUserAllPregEasyData:', error);
    response.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getAllPregEasyData = async (request, response) => {
  try {
    const pregEasyList = await pregEasy.find()
      .select('-__v')
      .sort({ createdAt: -1 });

    response.status(200).json({
      success: true,
      count: pregEasyList.length,
      data: pregEasyList
    });
  } catch (error) {
    console.error('Error in getAllPregEasyData:', error);
    response.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const updatePregEasyData = async (request,response) =>{
  const {id} = request.params;
  const pregEasy = new pregEasy(request.body);
  await pregEasy.save();
  response.status(200).json({msg:""});
}

module.exports = {
  addPregEasyData,
  getAllPregEasyData,
  getUserAllPregEasyData,
  updatePregEasyData
};