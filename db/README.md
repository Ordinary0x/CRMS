Local database setup for CRMBS

- Data directory: `db/postgres-data`
- Socket directory: `db/`
- Port: `5433`
- Database: `crmbs`

Useful commands:

```bash
pg_ctl -D "db/postgres-data" -l "db/postgres.log" -o "-p 5433 -k $(pwd)/db" start
pg_ctl -D "db/postgres-data" stop
psql -h 127.0.0.1 -p 5433 -d crmbs
```
