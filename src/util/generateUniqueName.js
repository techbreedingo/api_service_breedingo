const { v4: uuidv4 } = require('uuid');

// Function to generate a unique name for the image
const generateUniqueName =(originalFileName)=> {
  const fileExtension = originalFileName.split('.').pop(); // Extract the file extension
  const uniqueName = `${uuidv4()}.${fileExtension}`;       // Combine UUID with file extension
  return uniqueName;
}

const generateUniqueValue = ()=>{
  return uuidv4;
}

module.exports = {generateUniqueName,generateUniqueValue};