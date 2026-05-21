import Dexie, { type Table } from 'dexie';
import { MockRule } from '../schema/mockRule';

export class QuantumMockDB extends Dexie {
  mockRules!: Table<MockRule, string>;

  constructor() {
    super('QuantumMockDB');
    this.version(1).stores({
      mockRules: 'id, scenarioId, active, urlPattern, method, priority'
    });
  }
}

export const db = new QuantumMockDB();
