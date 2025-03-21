require('dotenv').config();
const fs = require('fs');
const path = require('path');
const generateUniqueName = require('../util/generateUniqueName');


const imageFileStore = async (imageBuffer,originalFileName,folderName) => {
  try {
      const basePath = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
      const uploadsDir = path.join(basePath, folderName,'/');
      
      //Get unique file name
      const uniqueFileName = generateUniqueName(originalFileName);
      
      // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, uniqueFileName);

        // Write the file asynchronously
        await fs.promises.writeFile(filePath, imageBuffer);

        console.log(`Image saved at: ${filePath}`);
        return filePath; // Return the path where the image is stored
    } catch (err) {
        console.error(`Failed to save image: ${err.message}`);
        throw new Error('Unable to save image');
    }
};

module.exports = imageFileStore;