const { v4: uuid } = require("uuid");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const User = require("../models/user");

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      `Fetching users failed, please try again later. Error: ${err}`,
      500
    );
    return next(error);
  }

  res
    .status(200)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const getUserById = (req, res, next) => {};

const deleteUser = async (req, res, next) => {
  const userId = req.params.uid;

  let existingUser;
  try {
    existingUser = await User.findById(userId);
  } catch (err) {
    const error = new HttpError(
      `Deleting user failed, please try again later. Error: ${err}`,
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Could not identify user, email seems to be wrong.",
      401
    );
    return next(error);
  }

  try {
    await existingUser.remove();
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not delete user. Error: ${err}`,
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Successfully Deleted user." });
};

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { username, email, password, image } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email, username: username });
  } catch (err) {
    const error = new HttpError(`Something went wrong. Error: ${err}`, 500);
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  const img =
    image ||
    "https://acecollegecanada.com/wp-content/uploads/2019/12/user-icon-placeholder.png";
  const createdUser = new User({
    username,
    email,
    password,
    image: img,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }

  res.status(201).json({ user: createdUser.toObject({ getters: true }) });
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      `Logging in failed, please try again later. Error: ${err}`,
      500
    );
    return next(error);
  }

  if (!existingUser || existingUser.password !== password) {
    const error = new HttpError(
      "Could not identify user, credentials seem to be wrong.",
      401
    );
    return next(error);
  }

  res
    .status(200)
    .json({ message: "Logged In Successfully", user: existingUser });
};

exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.deleteUser = deleteUser;
exports.signup = signup;
exports.login = login;
