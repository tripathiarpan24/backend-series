import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    // Extract token from cookies or Authorization header
    // console.log("Headers:", req.headers);
   // console.log("Cookies:", req.cookies);

    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
  //  console.log(token)
    if (!token) {
        throw new ApiError(401, "Unauthorized request: Token not provided");
    }
  //  console.log(token)
    let decodedToken;
    try {
        // Verify token validity
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        console.error("Token verification error:", err.message);
        throw new ApiError(401, "Unauthorized request: Invalid or expired token");
    }
   // console.log("decoded token:",decodedToken)
    // Validate user existence in the database
    const user = await User.findById(decodedToken?._id).select("-password");
    if (!user) {
        throw new ApiError(401, "Unauthorized request: User not found");
    }

    // Attach user to the request object
    req.user = user;
    next();
});
