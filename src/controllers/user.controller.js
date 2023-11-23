// Importing the asyncHandler function for handling asynchronous operations
import { asyncHandler } from "../utils/asyncHandler.js";

// Importing the ApiError class for creating API-specific error instances
import { ApiError } from "../utils/ApiError.js";

// Importing the User model for interacting with the user data in the database
import { User } from '../models/user.model.js';

// Importing the uploadOnCloudinary function for uploading files to Cloudinary
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Importing the ApiResponse class for creating consistent API response structures
import { ApiResponse } from '../utils/ApiResponse.js';

// Function to validate if an email is in a valid format using a regular expression
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Asynchronous function to handle user registration
const registerUser = asyncHandler(async (req, res) => {
    // Destructuring required fields from the request body
    const { fullName, email, username, password } = req.body;
    console.log("email", email);

    // Check if any required field is empty
    if ([fullName, username, password, email].some((fields) => fields?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Validate email format
    if (!isValidEmail(email)) {
        throw new ApiError(400, "Invalid email address");
    }

    // Check if a user with the same email or username already exists
    const existUser = await User.findOne({
        $or: [{ email }, { username }]
    });

    if (existUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Retrieve paths of avatar and coverImage files from the request
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocal = req.files?.coverImage[0]?.path;

    // Check if avatar file is provided
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar and coverImage files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocal);

    // Check if avatar upload is successful
    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed");
    }

    // Create a new user in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // Retrieve the created user from the database (excluding password and refreshToken)
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Check if user creation is successful
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering a user");
    }

    // Send a success response with the created user information
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered successfully")
    );
});

// Exporting the registerUser function to make it accessible from other modules
export { registerUser };