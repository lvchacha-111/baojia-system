/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
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
        "id": "text1579384326",
        "max": 200,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1400097126",
        "max": 100,
        "min": 0,
        "name": "country",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "email1401528724",
        "name": "contactEmail",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "email"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1337919823",
        "max": 200,
        "min": 0,
        "name": "company",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "hidden": false,
        "id": "date1294150441",
        "max": "",
        "min": "",
        "name": "registeredAt",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "exceptDomains": null,
        "hidden": false,
        "id": "email1535054327",
        "name": "assignedTo",
        "onlyDomains": null,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "email"
      },
      {
        "hidden": false,
        "id": "number996536792",
        "max": null,
        "min": 0,
        "name": "creditUsed",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number3836741698",
        "max": null,
        "min": 0,
        "name": "creditLimit",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
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
      },
      {
        "hidden": false,
        "id": "number2158950087",
        "max": 28,
        "min": 1,
        "name": "billingDay",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "hidden": false,
        "id": "number1186136935",
        "max": 100,
        "min": 0,
        "name": "depositPercent",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "hidden": false,
        "id": "text1402668550",
        "max": 100,
        "min": 0,
        "name": "uid",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_3415890023",
    "indexes": [],
    "listRule": "",
    "name": "client_profiles",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3415890023");

  return app.delete(collection);
})
