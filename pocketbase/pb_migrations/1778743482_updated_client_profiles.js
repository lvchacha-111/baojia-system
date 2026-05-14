/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3415890023")

  // update field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select2223302008",
    "maxSelect": 0,
    "name": "paymentMethod",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "full",
      "prepaid",
      "credit",
      "monthly",
      "pay_before_ship"
    ]
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3415890023")

  // update field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "select2223302008",
    "maxSelect": 0,
    "name": "paymentMethod",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "select",
    "values": [
      "full",
      "prepaid",
      "credit",
      "monthly"
    ]
  }))

  return app.save(collection)
})
