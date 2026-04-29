import { readFileSync } from 'fs';
import { join } from 'path';

describe('AddPersistentTokenRevocationAndMenuPathUnique migration', () => {
  const source = readFileSync(
    join(__dirname, '1770000000000-AddPersistentTokenRevocationAndMenuPathUnique.ts'),
    'utf8',
  );

  it('persists user token versions for access-token revocation', () => {
    expect(source).toContain('ADD COLUMN tokenVersion int NOT NULL DEFAULT 0');
  });

  it('enforces active menu path uniqueness at the database layer', () => {
    expect(source).toContain('ADD COLUMN active_path varchar(200)');
    expect(source).toContain('deletedAt IS NULL');
    expect(source).toContain('ADD UNIQUE KEY UQ_menus_active_path (active_path)');
  });
});
