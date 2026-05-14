/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "verificationTemplate": {
      "body": "<p>您好，</p>\n<p>感谢注册报价系统。</p>\n<p>请点击下方按钮验证您的邮箱地址。</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/auth/confirm-verification.html?token={TOKEN}\" target=\"_blank\" rel=\"noopener\">验证邮箱</a>\n</p>\n<p>或者复制以下链接到浏览器打开：</p>\n<p>{APP_URL}/auth/confirm-verification.html?token={TOKEN}</p>\n<p>\n  谢谢，<br/>\n  报价系统团队\n</p>",
      "subject": "验证您的报价系统邮箱"
    }
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("_pb_users_auth_")

  // update collection data
  unmarshal({
    "verificationTemplate": {
      "body": "<p>Hello,</p>\n<p>Thank you for joining us at {APP_NAME}.</p>\n<p>Click on the button below to verify your email address.</p>\n<p>\n  <a class=\"btn\" href=\"{APP_URL}/_/#/auth/confirm-verification/{TOKEN}\" target=\"_blank\" rel=\"noopener\">Verify</a>\n</p>\n<p>\n  Thanks,<br/>\n  {APP_NAME} team\n</p>",
      "subject": "Verify your {APP_NAME} email"
    }
  }, collection)

  return app.save(collection)
})
