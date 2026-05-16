/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id = uid",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_uid_001",
        "max": 100,
        "min": 0,
        "name": "uid",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "email_email_001",
        "name": "email",
        "onlyDomains": null,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "email"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_display_name_001",
        "max": 100,
        "min": 0,
        "name": "displayName",
        "pattern": "",
        "presentable": true,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_phone_001",
        "max": 50,
        "min": 0,
        "name": "phone",
        "pattern": "",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "json_contacts_001",
        "maxSize": 0,
        "name": "contacts",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text_bio_001",
        "max": 500,
        "min": 0,
        "name": "bio",
        "pattern": "",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_salesperson_profiles",
    "indexes": ["CREATE UNIQUE INDEX idx_sp_email ON salesperson_profiles(email)"],
    "listRule": "@request.auth.id != ''",
    "name": "salesperson_profiles",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id = uid",
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_salesperson_profiles");
  return app.delete(collection);
})
