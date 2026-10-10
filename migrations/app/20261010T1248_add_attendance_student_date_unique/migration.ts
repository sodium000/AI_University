#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/512f2f40678e28ba257205f0b603f5f309beea9b0d58173af305182f81151468/contract';
import startContract from '../../snapshots/512f2f40678e28ba257205f0b603f5f309beea9b0d58173af305182f81151468/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d75485f2acf93767f60b8a77aa829667903b3c66489ec941d15936049de9ca77/contract';
import endContract from '../../snapshots/d75485f2acf93767f60b8a77aa829667903b3c66489ec941d15936049de9ca77/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addUnique({
        schema: 'public',
        table: 'attendance',
        constraint: 'attendance_studentId_date_key',
        columns: ['studentId', 'date'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
