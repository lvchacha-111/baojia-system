/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  collection.fields.add(
    new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text_display_name",
      "max": 100,
      "min": 0,
      "name": "displayName",
      "pattern": "",
      "presentable": true,
      "required": false,
      "system": false,
      "type": "text"
    })
  )

  collection.fields.add(
    new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text_phone",
      "max": 50,
      "min": 0,
      "name": "phone",
      "pattern": "",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "text"
    })
  )

  collection.fields.add(
    new Field({
      "hidden": false,
      "id": "json_contacts",
      "maxSize": 0,
      "name": "contacts",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "json"
    })
  )

  collection.fields.add(
    new Field({
      "autogeneratePattern": "",
      "hidden": false,
      "id": "text_bio",
      "max": 500,
      "min": 0,
      "name": "bio",
      "pattern": "",
      "presentable": false,
      "required": false,
      "system": false,
      "type": "text"
    })
  )

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  const fields = ["displayName", "phone", "contacts", "bio"]
  fields.forEach(name => {
    const f = collection.fields.find(f => f.name === name)
    if (f) collection.fields.remove(f)
  })

  return app.save(collection)
})
