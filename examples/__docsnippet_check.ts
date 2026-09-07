import { OMOPHub } from '../src/index.js';

const client = new OMOPHub('oh_test');

export async function fromOldDocs(): Promise<void> {
  const { data } = await client.search.autocomplete('diab', { pageSize: 10 });
  console.log(data?.query);

  for (const entry of data?.suggestions ?? []) {
    console.log(entry.suggestion.concept_name);
    console.log(entry.match_score);
  }
}
