/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1155679016")

  // add field
  collection.fields.addAt(10, new Field({
    "hidden": false,
    "id": "date1613626836",
    "max": "",
    "min": "",
    "name": "generatedAt",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1155679016")

  // remove field
  collection.fields.removeById("date1613626836")

  return app.save(collection)
})
