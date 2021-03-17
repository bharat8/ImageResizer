const functions = require("firebase-functions");
const { tmpdir } = require("os");
const { storage } = require("@google-cloud/firestore");
const { dirname, join } = require("path");
const sharp = require("sharp");
const fs = require("fs-extra");
const cloudStorage = new Storage();

exports.imageResize = functions.
    runWith({ memory: "1GB", timeoutSeconds: 120 }).
    storage.object().onFinalize(handler); // trigger when an image uploaded

async function handler(object){
    const bucket = cloudStorage.bucket(object.bucket);
    const filePath = object.name;
    const fileName = filePath.split("/").pop();
    const bucketDir = dirname(filePath);
    const workingDir = join(tmpdir(),"resizeDir");
    const tmpFilePath = join(workingDir,"temp.png")
    
    //avoid infinite loop conditions
    if(fileName.includes("@r") || !object.contentType.includes("image")){
        return false;
    }

    await bucket.file(filePath).download({ destination: tmpFilePath});
    const size = 720;

    //resize and store in to storage    
    const ext = fileName.split('.').pop();
    const imgName = fileName.replace('.${ext}',"");
    const newImgName = '${imgName}@r_${720}.${ext}';
    const imgPath = join(workingDir,newImgName);
    
    await sharp(tmpFilePath).resize({ width: size}).toFile(imgPath);
    fs.remove(workingDir);
    return bucket.upload(imgPath, {
        destination: join(bucketDir,newImgName)
    })
}