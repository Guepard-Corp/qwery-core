# Pull request handbook

This topic explains how to title and describe your pull requests.

## Pull request title conventions

When creating a pull request, follow the naming conventions depending on the change you're making. In general, the pull request title starts with an emoji, then the name, then the changes. For example: ✨ Datasource MyNew-CRM: add new stream Users.

Qwery uses this pattern to automatically assign team reviews and build the product release notes.

Pull request type | Emoji | Examples
New datasource | 🎉 | 🎉 New Datasource: Database Driver - PostgreSQL
Add a feature to an existing datasource | ✨ | ✨ Datasource PostgreSQL: Support SSL
Fix a bug | 🐛 | 🐛 Datasource PostgreSQL: fix connection string
Documentation (updates or new entries) | 📝 | 📝 Fix Datasource support matrix
It's a breaking change | 🚨 | 🚨 Qwery extensions SDK: fix SDK Datasource interface


Don't add an emoji to any refactors, cleanups, etc. that aren't visible improvements to datasource users.

If your code change is doing more than one change type at once, break it into multiple pull requests. This helps maintainers to review and merge your contribution.

## Descriptions

In pull request descriptions, provide enough information (or a link to enough information) that team members with no context can understand what the PR is trying to accomplish. This means you should include three things:

1- Some background information motivating you to solve this problem
2- A description of the problem itself
3- Good places to start reading and file changes that reviewers can skip