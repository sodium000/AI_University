#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/9174c8b44971b309d323fe81b193197606301b80cdf6fdac3e30a7a3e0dc5643/contract';
import startContract from '../../snapshots/9174c8b44971b309d323fe81b193197606301b80cdf6fdac3e30a7a3e0dc5643/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a49225c125ffbb0cc51e5f54b0b5b773e0acb6eef103625caf0fef9fa1722b8f/contract';
import endContract from '../../snapshots/a49225c125ffbb0cc51e5f54b0b5b773e0acb6eef103625caf0fef9fa1722b8f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, placeholder } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('credential', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(endContract, 'backfill-user-credential', {
        check: () => placeholder('backfill-user-credential:check'),
        run: () => placeholder('backfill-user-credential:run'),
      }),
      this.setNotNull({ schema: 'public', table: 'user', column: 'credential' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'user',
        constraint: 'user_credential_check_a3d6369e',
        expression: "\"credential\" IN ('EMAIL', 'GOOGLE')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
