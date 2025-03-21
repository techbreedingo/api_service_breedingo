const testProductAPI = async (request,response) =>{
  response.status(200).json({msg:"API test successfully"});
}

module.exports = testProductAPI;