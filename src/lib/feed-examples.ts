import broken from '../../public/lab/feed-gate/bad-clock.jsonl?raw';
import corrected from '../../public/lab/feed-gate/correct.jsonl?raw';

// These change input bytes only; the published Python validator stays untouched.
export const FEED_EXAMPLES = [
  {name:'received before available — correct', input:corrected,
    title:'A correct starting archive you can change.',
    hint:'The snapshot has a bid size of 3; the update replaces it with 1. Edit a price, size or clock, then inspect the actual returned rows.'},
  {name:'available before receipt — has a bug', input:broken,
    title:'A record cannot arrive after it was already available.',
    hint:'Record 1 is received at 21 ms but marked available at 19 ms. Run the validator, then change available_ms to 22 and run it again.'},
  {name:'Off-grid price', input:corrected.replace('"price":"0.49"','"price":"0.49001"'),
    title:'Decimal values must fit the validator’s exact grid.',
    hint:'The first bid price is 0.49001, between this validator’s price ticks. Replace it with 0.49 and rerun. The validator checks the original decimal strings against its price grid, before formatting the result for display.'},
  {name:'Recording gap', input:corrected+JSON.stringify({record_id:2,kind:'gap',received_ms:30,available_ms:30,reason:'disconnect'})+'\n',
    title:'A valid archive can still contain unusable intervals.',
    hint:'The last record declares a disconnect. The archive is well formed, but that row must remain GAP, with no usable book. Inspect the returned states rather than treating acceptance as a blanket quality guarantee.'},
] as const;
export const BROKEN_CLOCK = FEED_EXAMPLES[1];
export const CORRECT_TEMPLATE = corrected;
