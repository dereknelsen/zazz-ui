# Security policy

## Supported versions

Zazz is in alpha. Only the latest release of `@zazz-ui/core` and of the `zazz-ui` CLI gets fixes, so upgrade before reporting.

## Reporting a vulnerability

Please report it privately through GitHub: go to the [Security tab](https://github.com/dereknelsen/zazz-ui/security) and choose **Report a vulnerability**. Don't open a public issue or discussion.

Include what's affected (kit, CLI, or docs site), the version, and steps or a page that reproduces it. I'll reply within a week. Once a fix is published to npm, I'll publish an advisory and credit you unless you'd rather not be named.

## Scope

The kit runs in the browser and loads its dependencies from jsDelivr with integrity hashes. The CLI writes files into your project and reads packages from npm. Problems in those paths are in scope, such as markup the kit turns into script execution, a hash that doesn't match, or the CLI writing outside its target directory.
