const { v4: uuid } = require("uuid");
const HttpError = require("../models/http-error");
const { validationResult } = require("express-validator");
const Place = require("../models/place");
const User = require("../models/user");
const mongoose = require("mongoose");

const getAllPlaces = async (req, res, next) => {
  // res.json({ DUMMY_PLACES });
  let places;
  try {
    places = await Place.find();
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not get places. Error: ${err}`,
      500
    );
    return next(error);
  }

  res.json({ places: places });
};

const getPlaceById = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not get place. Error: ${err}`,
      500
    );
    return next(error);
  }

  if (!place) {
    const error = new HttpError(
      "Could not find a place for the provided place id.",
      404
    );
    return next(error);
  }

  res.json({ place: place.toObject({ getters: true }) });
};

const getPlacesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  let places;
  try {
    places = await Place.find({ creator: userId });
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not get place. Error: ${err}`,
      500
    );
    return next(error);
  }

  if (!places || places.length === 0) {
    return next(
      new HttpError("Could not find a place for the provided user id.", 404)
    );
  }

  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

const createPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }

  const { title, description, coordinates, address, creator, image } = req.body;

  let img =
    image ||
    "https://www.funfunnyfacts.com/images/large/empire-state-building-1.jpg";
  const createdPlace = new Place({
    title,
    description,
    location: coordinates,
    address,
    creator,
    image: img,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (err) {
    const error = new HttpError(
      "Failed to create place, please try again later.",
      500
    );
    return next(error);
  }
  if (!user) {
    const error = new HttpError(
      "Could not find user for the provided id.",
      404
    );
    return next(error);
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await createdPlace.save({ session });
    user.places.push(createdPlace);
    // The push method above is from mongoDB and not JS, it adds the createdPlace id to the places array and just the id.
    await user.save({ session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      "Failed to create place, please try again later.",
      500
    );
    return next(error);
  }

  res.status(201).json({ place: createdPlace });
};

const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error(errors);
    throw new HttpError("Invalid inputs passed, please check your data.", 422);
  }
  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not update place. Error: ${err}`,
      500
    );
    return next(error);
  }

  if (!place) {
    throw new HttpError(
      "Could not find a place for the provided place id.",
      404
    );
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not update place. Error: ${err}`,
      500
    );
    return next(error);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not update place. Error: ${err}`,
      500
    );
    return next(error);
  }

  if (!place) {
    throw new HttpError(
      "Could not find a place for the provided place id.",
      404
    );
  }

  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    await place.remove({ session });
    place.creator.places.pull(place);
    await place.creator.save({ session });
    await session.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      `Something went wrong. Could not delete place. Error: ${err}`,
      500
    );
    return next(error);
  }

  res.status(200).json({ message: "Successfully Deleted place." });
};

exports.getAllPlaces = getAllPlaces;
exports.getPlaceById = getPlaceById;
exports.getPlacesByUserId = getPlacesByUserId;
exports.createPlace = createPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
