// this file contains all search queries for any database that could be used in the same project or for migrating in the future
export const findOne = async ({
  model = undefined,
  filter = {},
  fields = "",
  options = {},
} = {}) => {
  const doc = model.findOne(filter).select(fields);
  if (options.populate) {
    doc.populate(options.populate);
  }
  if (options.lean) {
    doc.lean();
  }
  return await doc.exec();
};
export const find = async ({
  model = undefined,
  filter = {},
  fields = "",
  options = {},
} = {}) => {
  const doc = model.find(filter).select(fields);
  if (options.populate) {
    doc.populate(options.populate);
  }
  if (options.lean) {
    doc.lean();
  }
  return await doc.exec();
};
export const findOneAndDelete = async ({
  model = undefined,
  filter = {},
  fields = "",
  options = {},
} = {}) => {
  const doc = model.findOneAndDelete(filter).select(fields);
  if (options.populate) {
    doc.populate(options.populate);
  }
  if (options.lean) {
    doc.lean();
  }
  return await doc.exec();
};
export const findById = async ({
  model = undefined,
  id = undefined,
  fields = "",
  options = {},
} = {}) => {
  const doc = model.findById(id).select(fields);
  if (options.populate) {
    doc.populate(options.populate);
  }
  if (options.lean === true) {
    doc.lean();
  }
  return await doc.exec();
};
export const create = async ({
  model = undefined,
  data = [{}],
  fields = "",
  options = { validateBeforeSave: true },
} = {}) => {
  return await model.create(data, options);
};
export const createOne = async ({
  model = undefined,
  data = {},
  fields = "",
  options = { validateBeforeSave: true },
} = {}) => {
  const [doc] = await create({ model, data: [data], options });
  return await doc;
};
