const imageFileStore = require('../util/imageFileStore');

const cattleSell = require('../models/cattleSell')
const saveCattleSell = require('../models/saveCattleSell')
const userCoin = require('../models/userCoin')
const user = require('../models/user')
const userTransactions = require('../models/userTransactions')
const cattleSellViewed = require('../models/CattleSellViewed');


const addCattleForSell = async (request, response) => {
  const Create_SellCard = process.env.Create_SellCard;
  const userId = request.user.userId;
  const cattleData = request.body;

  console.log("received for create cattle sell", cattleData, userId);

  try {
    // Check sufficient coins
    const coinsInfo = await userCoin.findOne({ userId: userId });
    if (coinsInfo.totalCoin - Create_SellCard < 0) {
      return response.status(403).json({ msg: "insufficient balance" });
    }

    // Validate image URLs
    if (!cattleData.images || !Array.isArray(cattleData.images)) {
      return response.status(400).json({ error: 'Images array is required' });
    }

    if (cattleData.images.length === 0) {
      return response.status(400).json({ error: 'At least one image is required' });
    }

    // Optional: Validate that URLs are from Supabase
    const validUrls = cattleData.images.every(url => 
      url.includes(process.env.SUPABASE_URL) && 
      url.includes(process.env.SUPABASE_STORAGE_BUCKET)
    );

    if (!validUrls) {
      return response.status(400).json({ 
        error: 'Invalid image URLs. All images must be hosted on Supabase.' 
      });
    }

    // Create new cattle listing
    cattleData.userId = userId;
    const cattleForSell = new cattleSell(cattleData);
    await cattleForSell.save();

    // Deduct coins
    const updatedCoins = await userCoin.findOneAndUpdate(
      { userId: userId },
      { $inc: { totalCoin: -Create_SellCard } },
      { new: true }
    );

    // Create transaction record - maintaining existing format
    const userTransactionsModel = new userTransactions({
      userId: userId,
      transactionAmount: Create_SellCard,
      transactionType: "debited",
      transactionDescription: "Create Cattle sell card",
      transactionDate: new Date(),
    });

    await userTransactionsModel.save();

    response.status(200).json({
      msg: "cattleSell added successfully",
      totalCoin: updatedCoins.totalCoin
    });

  } catch (error) {
    console.error('Error in addCattleForSell:', error);
    response.status(500).json({ 
      error: 'Failed to create cattle sell card',
      details: error.message 
    });
  }
};

const getCattleSell = async (request,response) =>{
  const View_Price = process.env.View_Price;
  const userId = request.user.userId;
  
  const cattleForSell = await cattleSell.findById(request.params.id)
  .populate({
    path: 'userId',
    select: 'farmName state district mobileNumber'
  });
  const cattleSellData = cattleForSell.toObject();
  //check sufficient coin
  const coinsInfo = await userCoin.findOne(

    { userId: userId },
  );
    const isViewed = await cattleSellViewed.findOne({
      userId : userId,  
      cattleSellId : cattleForSell._id
    })
    
    const saveCattleSellData = await saveCattleSell.findOne({
      userId : userId,  
      cattleSellId : cattleForSell._id,
    })
    
    if(saveCattleSellData)
      cattleSellData.isSaved = true;
    else{
      cattleSellData.isSaved = false;
    }

  if(!isViewed && cattleSellData.userId._id.toString()!=userId){
      console.log("heloo")
    if(coinsInfo.totalCoin-View_Price <0)
      return response.status(403).json({msg:"insufficient balance","TotalCoin":coinsInfo.totalCoin})

    const newView = new cattleSellViewed({
      userId : userId,
      cattleSellId : cattleForSell._id,
      viewedOn:new Date()
    })
    await newView.save();
    
    //get data
    await userCoin.findOneAndUpdate(
      { userId: userId },
      { $inc: { totalCoin: -View_Price } } ,
      { new: true }
    );
    const  userTransactionsModel = new userTransactions({
      userId: userId,
      transactionAmount: View_Price,
      transactionType: "debited",
      transactionDescription: "View Cattle",
      transactionDate: new Date(),
    })
    await userTransactionsModel.save();
  }

    console.log(cattleSellData);
  response.status(200).json({cattleSellData,totalCoin : coinsInfo.totalCoin});
}

const deleteCattleForSell = async (request,response) => {
    const userId = request.user.userId;
    const cattleId = request.params.cattleId;
    const deletedCattle = await cattleSell.findOneAndDelete({
        userId : userId,
        _id : cattleId
    })

    const deletedSaveCattle = await saveCattleSell.deleteMany({cattleSellId : cattleId});
    const deletedViewCattle = await cattleSellViewed.deleteMany({cattleSellId : cattleId});
    console.log(deletedCattle);
    if (!deletedCattle) {
      return response.status(404).json({ message: "Cattle not found or already deleted" });
    }

    // If successfully deleted, return the response
    return response.status(200).json({
      message: "Cattle successfully deleted"
    });
}

// const getAllCattleSell = async (request,response) =>{
//   /* pagination*/
//   const pageNumber = parseInt(request.query.page||1);
//   const limitPerPage = parseInt(request.query.limit||1);
//   const skip = (pageNumber-1)*limitPerPage;
//   const totalCount = await cattleSell.countDocuments();

//   const cattleForSell = await cattleSell.find()
//     .skip(skip)
//     .limit(limitPerPage)
//     .exec();
//   ;
//   response.status(200).json({
//     cattleForSell,
//     currentPage:pageNumber,
//     totalRecord:totalCount,
//     totalPages: Math.ceil(totalCount/limitPerPage)
//   });
// }

const getAllCattleSell = async (request,response) =>{
  try {
    const userId = request.user.userId;
    
    /* pagination */
    const pageNumber = parseInt(request.query.page || 1);
    const limitPerPage = parseInt(request.query.limit || 1);
    const skip = (pageNumber - 1) * limitPerPage;
    
    // Get total count for pagination
    const totalCount = await cattleSell.countDocuments({ 
      isDeleted: { $ne: true } 
    });
    console.log(totalCount)
    // Get paginated cattle list
    const allCattle = await cattleSell.find({ 
      isDeleted: { $ne: true } 
    })
    .populate({
      path: 'userId',
      select: 'farmName state district mobileNumber'
    })
    .skip(skip)
    .limit(limitPerPage)
    .exec();

    // Get all saved cattle for the current user
    const savedCattle = await saveCattleSell.find({ 
      userId: userId 
    }).select('cattleSellId');

    // Create a Set of saved cattle IDs for efficient lookup
    const savedCattleIds = new Set(savedCattle.map(saved => 
      saved.cattleSellId.toString()
    ));

    // Add isSaved field to each cattle
    const cattleWithSavedStatus = allCattle.map(cattle => {
      const cattleObj = cattle.toObject();
      cattleObj.isSaved = savedCattleIds.has(cattle._id.toString());
      return cattleObj;
    });
    response.status(200).json({
      cattleForSell: cattleWithSavedStatus,
      currentPage: pageNumber,
      totalRecord: totalCount,
      totalPages: Math.ceil(totalCount/limitPerPage)
    });
  } catch (error) {
    console.error("Error in getAllCattleSell:", error);
    response.status(500).json({ error: "Internal server error" });
  }
}

const getUserCattleForSale = async (request,response) =>{
  try {
    const {userId} = request.user;
    
    // Get all cattle for the user
    const cattleForSell = await cattleSell.find({ 
      userId: userId,
      isDeleted: { $ne: true } 
    });

    // Get the view counts for each cattle
    const cattleWithViews = await Promise.all(cattleForSell.map(async (cattle) => {
      const viewCount = await cattleSellViewed.countDocuments({ 
        cattleSellId: cattle._id 
      });
      console.log(viewCount);
      const cattleObj = cattle.toObject();
      cattleObj.viewCount = viewCount;
      return cattleObj;
    }));
    console.log(cattleWithViews);
    response.status(200).json(cattleWithViews);

  } catch (error) {
    console.error("Error:", error);
    response.status(500).json({ error: "Internal server error" });
  }
}

const getAllSaveCattleSell = async (request, response) => {
  try {
    const mongoose = require('mongoose')
    const { userId } = request.user;
    console.log("Searching for userId:", userId);
    

    const savedCattleList = await cattleSell.aggregate([
      {
        $lookup: {
          from: "users", // Ensure this matches the actual collection name
          localField: "userId", // _id of cattleSell
          foreignField: "_id", // cattleSellId in saveCattleSell
          as: "userId"
        }
      },
      {
        $unwind: {
          path: "$userId",
          preserveNullAndEmptyArrays: false // Ensures only matching cattleSell records are returned
        }
      },
      {
        $lookup: {
          from: "savecattlesells", // Ensure this matches the actual collection name
          localField: "_id", // _id of cattleSell
          foreignField: "cattleSellId", // cattleSellId in saveCattleSell
          as: "savedData"
        }
      },
      {
        $unwind: {
          path: "$savedData",
          preserveNullAndEmptyArrays: false // Ensures only matching cattleSell records are returned
        }
      },
      {
        $match: { 
          "savedData.userId": new mongoose.Types.ObjectId(userId)
        }
      },
    ])
    // .populate({
    //   path: 'userId',
    //   select: 'farmName state district mobileNumber'
    // });
    // const savedCattleList = await saveCattleSell.aggregate([
    //   // Match user's records first
      // {
      //   $match: { 
      //     userId: new mongoose.Types.ObjectId(userId)
      //   }
      // },
    //   {
    //     $lookup: {
    //       from: "cattlesells", // MongoDB collection names are lowercase
    //       localField: "cattleSellId",
    //       foreignField: "_id",
    //       as: "cattleSellData"
    //     }
    //   },
    //   {
    //     $unwind: {
    //       path: "$cattleSellData",
    //       preserveNullAndEmptyArrays: false
    //     }
    //   },
    //   {
    //     $project: {
    //       _id: 0,
    //       cattleSell: "$cattleSellData",
    //       savedOn: "$saveOn"
    //     }
    //   }
    // ]);

    console.log("Aggregation results:", savedCattleList);
    
    response.status(200).json(savedCattleList);
  } catch (error) {
    console.error("Error in getAllSaveCattleSell:", error);
    response.status(500).json({ 
      success: false, 
      error: "Failed to fetch saved cattle listings",
      details: error.message 
    });
  }
}

// const getAllSaveCattleSell= async (request,response) =>{
//   const {userId} = request.user;
//   // const saveUserCattleSellList = await cattleSell.find({userId})
//   // //saveCattleSell.find({userId})
//   // // .populate({
//   // //   path:"cattleSellId", // populates all details from the cattleSell document
//   // // } 
//   // // )
//   // .populate({
//   //   path: "_id",
//   //   model: 'saveCattleSell',
//   // })
//   // .populate({
//   //   path: "_id",
//   //   model: 'User',
//   //  // select: 'name mobileNumber location' // Only select necessary fields
//   // })
//   // .exec();
//   //   // .exec();

//   //   //const UserCattleSellList = saveUserCattleSellList.map(item=>item.cattleSellId); //only get cattleSell information
//   //   console.log(saveUserCattleSellList);
//   const savedCattleList = await saveCattleSell.aggregate([
//     // {
//     //   $match: { userId: userId }
//     // },
//     {
//       $lookup: {
//         from: "cattleSell", // Make sure this matches the actual collection name in MongoDB
//         localField: "cattleSellId",
//         foreignField: "_id",
//         as: "cattleSellData"
//       }
//     },
//     {
//       $unwind: "$cattleSellData"
//     },
//     // {
//     //   $lookup: {
//     //     from: "User",
//     //     localField: "cattleSellData.userId",
//     //     foreignField: "_id",
//     //     as: "userData"
//     //   }
//     // },
//     // {
//     //   $unwind: "$userData"
//     // },
//     {
//       $project: {
//         _id: 0, // Hides unnecessary ID
//         cattleSell: "$cattleSellData"
//         // ,
//         // user: "$userData"
//       }
//     }
//   ]);

//   console.log("Saved Cattle with User:", savedCattleList);
//     response.status(200).json("ok");
// }

const addSaveCattleSell= async (request,response) =>{
  const {cattleSellId} = request.params;
  const {userId} = request.user;
  const saveUserCattleSell = new saveCattleSell({userId,cattleSellId,saveOn:new Date()});
  await saveUserCattleSell.save();
  response.status(200).json({msg:"cattleSell saved successfully"});
}

const deleteSaveCattleSell= async (request,response) =>{
  const {cattleSellId} = request.params;
  const {userId} = request.user;
  const deletedRecord = await saveCattleSell.findOneAndDelete({userId,cattleSellId});
  if (!deletedRecord) {
    return response.status(404).json({ message: 'Record not found' });
  }
  return response.status(200).json({msg:"Record deleted successfully"});
}

module.exports = {
  addCattleForSell,
  getCattleSell,
  getAllCattleSell,
  deleteCattleForSell,
  getUserCattleForSale,
  getAllSaveCattleSell,
  addSaveCattleSell,
  deleteSaveCattleSell
};
