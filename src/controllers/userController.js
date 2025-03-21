require('dotenv').config();
const User = require('../models/user');
const UserCoin = require('../models/userCoin');
const UserTransactions = require('../models/userTransactions');
const cattleSellViewed = require('../models/CattleSellViewed');
const cattleSell = require('../models/cattleSell');

const findMaxCount = async () => {
  console.log(await User.find().select('userId').sort({userId:-1}).limit(1));
}

const ViewPrice = process.env.ViewPrice;

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

const registerUser = async (request,response) =>{
  const userData = request.body;
  userData.lastLogIn = getCurrentDateTime();
  userData.status = "Active";
  const user = await User.findOneAndUpdate(
    { 
      mobileNumber:userData.mobileNumber, 
      status : 'In Progress'
    },
    userData,
    {new:true}
  );
  if(!user){
    return response.status(403).json({msg:"User not found or Already Present"});
  }
  else{
    const userCoinObject = {
      userId :user._id,
      totalCoin:200,
    }
    const userCoin = new UserCoin(userCoinObject);
    const userCoinSave = await userCoin.save();
    if(!userCoinSave)
        return response.status(403).json({msg:"Coin wallet not create"});
  }
  return response.status(200).json({msg:"User created successfully"});
}

const getUserInfo = async (request,response) =>{
  const userId = request.user.userId;
  const userData = await User.findById(userId);
  if(!userData){
    return response.status(403).json({msg:"User not found"});
  }
  
  const userViewCount = await cattleSellViewed.find({userId:userId}).countDocuments();
  const userSellCount = await cattleSell.find({userId:userId}).countDocuments();
  const userCoinData = await UserCoin.findOne({userId:userId});
  if(!userCoinData){
    return response.status(403).json({msg:"wallet not found"});
  }
  // console.log(userData);
  // console.log(userCoinData.totalCoin);
  //convert schema to object so we can manipulate it
  const userResponse = userData.toObject();
  userResponse.totalCoin = userCoinData.totalCoin;
  userResponse.viewCount = userViewCount?userViewCount:0;
  userResponse.sellCount = userSellCount?userSellCount:0;
  console.log(userResponse);
  return response.status(200).json(userResponse);
}

const userUpdate = async (request,response) =>{
  const user = request.body;
  const userData = await User.findOneAndUpdate(
    {_id : request.user.userId},
    user,
    {new:true}
  )
  if(!userData){
    return response.status(403).json({msg:"User not found"});
  }
  return response.status(200).json({msg:"User data updated successfully"});

}

const updateDebitCoin = async (request,response) =>{


  console.log("------------------------");
  const userId = request.user.userId;
  const cattleSellId = request.body.cattleSellId;
  console.log(userId);
  const  ViewContact_Price = process.env.ViewContact_Price;

  const buyerData = await User.find({ _id:userId})
  if(!buyerData){
    return response.status(404).json({ msg: "User not found" });
  }
  else{
    console.log(1)
      const buyerCoinData = await UserCoin.findOne({ userId:userId});
        console.log(2)
        const isViewed = await cattleSellViewed.findOne({
          userId : userId,
          cattleSellId : cattleSellId
        })
        if(!isViewed || !isViewed.viewedContactNumber){
          console.log(isViewed);
          console.log(3)
          if(buyerCoinData.totalCoin-ViewContact_Price <0){
            console.log(4)
            return response.status(404).json({ msg: "insufficient balance","totalCoin":buyerCoinData.totalCoin });
          }
          else{
            console.log(5)
            const newView = await cattleSellViewed.findOneAndUpdate(
              { 
                userId: userId, 
                cattleSellId: cattleSellId 
              }, // Find criteria
              { 
                $set: { 
                  viewedContactNumber: true, 
                  viewedOn: new Date() 
                } 
              }, // Update fields
              { 
                new: true,  // Return the updated document
                upsert: true // Create if not exists
              }
            );
            console.log(newView);
            //   try {
            const cattleData = await cattleSell.findOne({ _id:cattleSellId}).populate('userId');
            console.log(cattleData.userId.mobileNumber);
            if(!cattleData){
              return response.status(404).json({ msg: "Cattle not found" });
            }
            //     const sellerId = cattleData.userId;
            //     const sellerData = await User.find({ userId:sellerId})
            //     if(!sellerData){
            //       return response.status(404).json({ msg: "User not found" });
            //     }
            //     buyerCoinData.totalCoin -= debitedCoin;
            //     await buyerCoinData.save();
            await UserCoin.findOneAndUpdate(
              { userId: userId },
              { $inc: { totalCoin: -ViewContact_Price } } ,
              { new: true }
            );    

            const transaction = {
              userId:userId,
              transactionDescription:`Viewed seller ${cattleData.userId._id}'s contact.`,
              transactionAmount : ViewContact_Price,
              transactionType : 'debited'
            }
            new UserTransactions(transaction).save();
            response.status(200).json({ msg: "User coin updated successfully",'userMobile':cattleData.userId.mobileNumber,"totalCoin":buyerCoinData.totalCoin });
            //   } catch (error) {
            //     response.status(500).json({ error: error.message }); 
          }
        }
        else{
          console.log(6)
          const cattleData = await cattleSell.findOne({ _id:cattleSellId}).populate('userId');
            console.log(cattleData.userId.mobileNumber);
            if(!cattleData){
              return response.status(404).json({ msg: "Cattle not found" });
            }
          response.status(200).json({ msg: "user already viewed",'userMobile':cattleData.userId.mobileNumber,"totalCoin":buyerCoinData.totalCoin });
        }
      }
    }

module.exports = {registerUser,userUpdate,updateDebitCoin,getUserInfo};