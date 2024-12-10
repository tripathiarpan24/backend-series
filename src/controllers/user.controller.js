import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async(userId)=>{
    try {
       const user = await User.findById(userId);
       const accessToken = user.generateAccessToken()
       const refreshToken = user.generateRefreshToken()

       user.refreshToken = refreshToken
       await user.save({validateBeforeSave:false})

       return {accessToken,refreshToken}
    } catch (error) {
        console.error("Token Generation Error:", error.message);
        throw new ApiError(500,"Something went wrong while generating access or refresh token")
    }
}
const registerUser = asyncHandler(async (req,res)=>{
   //get user details from frontend
   //validation - not empty fields
   //check if user already exists:fullName,email
   //check for mandatorily required fields:avatar
   //upload them on cloudinary(coverImage and avatar)
   //create user object-create entry in db
   //remove password and refresh token from response
   //check for user creation
   //return response
   

   const {email,username,fullName,password} = req.body
  // console.log(email)
   if(
    [email,username,fullName,password].some((field)=>field?.trim()==="")
   ){
        throw new ApiError(400,"All fields required!")}
    const existedUser= await User.findOne({$or:[{fullName},{email}]})
    if(existedUser){
        throw new ApiError(409,"User already exists with this fullName or email")
    }
    const avatarLocalPath = await req.files?.avatar[0]?.path
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar File is required!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400, "Avatar is required!")
    }
    const user = await User.create({
        fullName,
        username,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        fullName : fullName.toLowerCase()
    }    
    )
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user"); 
    }
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully!!")
    )
})


const loginUser = asyncHandler(async(req,res)=>{
// req body->data
// fullName or email
// find the user
// password check
// access and refresh token
// send cookie

const {email,fullName,password} = req.body
    
     if(!(fullName || email)){
        throw new ApiError(400,"fullName or email is required")
     }

     const user = await User.findOne({
        $or: [{fullName},{email}]
     })

     if(!user){
        throw new ApiError(400,"User does not exists");
    }

     const isPasswordValid = await user.isPasswordCorrect(password)

     if(!isPasswordValid){
        throw new ApiError(401,"Invalid user credentials!")
     }
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
   
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
     
    const options  = {
        httpOnly :true,
        secure:true
    }    
 
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
              user: loggedInUser, accessToken, refreshToken  
            },
            "User logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
   
  await User.findByIdAndUpdate(
    req.user._id,
    {
        $unset:{
            refreshToken : 1
        }
    },
    {
        new:true
    }
)
  const options = {
    httpOnly:true,
    secure:true
  }
  return res
  .status(200)
  .clearCookie("accessToken",options)
  .clearCookie("refreshToken",options)
  .json(new ApiResponse(200,{},"User logged out!"))
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken =req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid refresh Token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure : true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user?._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json( new ApiResponse(
            200,
            {
               accessToken,
               refreshToken:newRefreshToken
            },
            "Access Token Refreshed"
        )
    )
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body 
    //console.log(req._id)
    const user = await User.findById(req.user._id)
  //  console.log(user)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid old password")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res
    .status(200)
    .json(200,{},"Password changed successfully")
})
const getCurrentUser =  asyncHandler(async(req,res)=>{
  
    return res.status(200).json(new ApiResponse(200,req.user,"Fetched user successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body

    if(!email||!fullName){
        throw new ApiError(400,"All fields are required")
    }
   // console.log(req._id)
    const user = await User.findByIdAndUpdate(req?.user._id,
        {$set:{
            email:email,
            fullName:fullName
        }},
        {new:true}
    ).select("-password")
  //  console.log(user)

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully!"))

})

const updateAvatar  = asyncHandler(async(req,res)=>{
    const avatarLocalFilePath = await req.file?.path
     console.log(avatarLocalFilePath)
    if(!avatarLocalFilePath){
        throw new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalFilePath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading file on cloudinary")
    }

    const user =  await User.findByIdAndUpdate(req?.user._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,
        {user},
        "Avatar image updated successfully"
    ))
})

const updateCoverImage  = asyncHandler(async(req,res)=>{
    const coverImageLocalFilePath = req.file?.path

    if(!coverImageLocalFilePath){
        throw new ApiError(400,"Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalFilePath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading file on cloudinary")
    }

    const user =  await User.findByIdAndUpdate(req?.user._id,
        {
            $set:{
                coverImage :coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,
        {user},
        "Cover Image updated successfully"
    ))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
       const {username} =  req.params
       if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
       }

       const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from :  "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from :  "subscriptions",
                localField : "_id",
                foreignField : "subscribers",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribedToCount : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : { $in : [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else : false
                    }
                }
            }
        },
        {
            $project : {
                username : 1,
                fullName : 1,
                coverImage : 1,
                avatar : 1,
                subscribersCount : 1,
                channelSubscribedToCount : 1,
                isSubscribed : 1
            }
        }
       ])

       if(!channel?.length)
       {
        throw new ApiError(404,"Channel doesn't exists")
       }
        return res
        .status(200)
        .json(new ApiResponse(200,channel[0], "Channel fetched successfully"))
})

 const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
        $match: {
        _id : new mongoose.Types.ObjectId(req?.user._id)
        }
    },
    {
        $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField :"_id",
            as : "watchHistory",
            pipeline :[
                {
                    $lookup: {
                        from :"users",
                        localField: "owner",
                        foreignField: "_id",
                        as : "owner",
                        pipeline: [
                            {
                                $project: {
                                    fullName:1,
                                    avatar :1,
                                    username :1
                                }
                            }
            ]
                    }
                },
                {
                    $addFields:{
                        owner :{
                            $first :"$owner"
                        }
                    }
                }
  ]
        }
    }
  ])

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        user[0].watchHistory,
        "User watch history fetched successfully"
    )
  )
 })
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
}