import { readFileSync } from 'fs';
import { join } from 'path';

describe('AddBabyProfileAndBirthdays migration', () => {
  const source = readFileSync(
    join(__dirname, '1870000000000-AddBabyProfileAndBirthdays.ts'),
    'utf8',
  );

  it('enforces birthday year uniqueness only for active albums', () => {
    expect(source).toContain('active_year int');
    expect(source).toContain('CASE WHEN deletedAt IS NULL THEN year ELSE NULL END');
    expect(source).toContain('UNIQUE KEY UQ_baby_birthdays_active_year (active_year)');
    expect(source).not.toContain('UNIQUE KEY UQ_baby_birthdays_year (year)');
  });
});
