export interface LocalTestAccount {
  userId: string;
  email: string;
  password: string;
}
export interface LocalTestFixtures {
  created: string[];
  accounts: Record<string, LocalTestAccount>;
}
export function createLocalE2EFixtures(path: string): Promise<LocalTestFixtures>;
export function deleteLocalE2EFixtures(created: string[]): Promise<void>;
