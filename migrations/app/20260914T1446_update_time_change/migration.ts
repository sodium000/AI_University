#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/36609ff21ad111e855453acc54368a83888418bb9e9db61a1780ce7ab71de26f/contract';
import endContract from '../../snapshots/36609ff21ad111e855453acc54368a83888418bb9e9db61a1780ce7ab71de26f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a49225c125ffbb0cc51e5f54b0b5b773e0acb6eef103625caf0fef9fa1722b8f/contract';
import startContract from '../../snapshots/a49225c125ffbb0cc51e5f54b0b5b773e0acb6eef103625caf0fef9fa1722b8f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'course',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.setDefault({
        schema: 'public',
        table: 'department',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.setDefault({
        schema: 'public',
        table: 'faculty',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.setDefault({
        schema: 'public',
        table: 'program',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.setDefault({
        schema: 'public',
        table: 'student',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
      this.setDefault({
        schema: 'public',
        table: 'user',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
