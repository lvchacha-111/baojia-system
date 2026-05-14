/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2527524235")

  // add field
  collection.fields.addAt(45, new Field({
    "hidden": false,
    "id": "date2261412156",
    "max": "",
    "min": "",
    "name": "createdAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  // add field
  collection.fields.addAt(46, new Field({
    "hidden": false,
    "id": "date3085063276",
    "max": "",
    "min": "",
    "name": "publishedAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2527524235")

  // remove field
  collection.fields.removeById("date2261412156")

  // remove field
  collection.fields.removeById("date3085063276")

  return app.save(collection)
})
