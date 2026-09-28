# HCI Online Judge

## Usage

node server.js
port 8080 for http, 8443 for https

### Migrating the legacy database

The SQLite version does not read the earlier NeDB files directly. Before starting it against an
existing installation, back up the `database` directory and run:

```sh
npm run migrate:nedb -- /path/to/legacy/database /path/to/hcioj.db
```

The migration is transactional and refuses to run when any destination application table already
contains data. It does not alter or delete the legacy files.

## Developing

### Tools
